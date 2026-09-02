package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"routing-engine/internal/models"
	"routing-engine/internal/poc/graph"
	"routing-engine/internal/poc/osm"
	"routing-engine/internal/services/hazard"
	"routing-engine/internal/services/startup"
	"routing-engine/internal/utils"
)

// SafeRouteHandler handles dynamic routing requests using the in-memory OSM graph.
func SafeRouteHandler(hazardSvc *hazard.Service, manager *startup.Manager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")

		g := manager.GetGraph()
		if g == nil {
			http.Error(w, "Service Unavailable: Graph not ready", http.StatusServiceUnavailable)
			return
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		waypointsStr := r.URL.Query().Get("waypoints")
		if waypointsStr == "" {
			http.Error(w, "Missing waypoints", http.StatusBadRequest)
			return
		}

		// Example parsing: lng,lat;lng,lat
		parts := strings.Split(waypointsStr, ";")
		if len(parts) < 2 {
			http.Error(w, "Invalid waypoints format", http.StatusBadRequest)
			return
		}

		originParts := strings.Split(parts[0], ",")
		destParts := strings.Split(parts[len(parts)-1], ",")
		if len(originParts) != 2 || len(destParts) != 2 {
			http.Error(w, "Invalid coordinate format", http.StatusBadRequest)
			return
		}

		oLat, _ := strconv.ParseFloat(originParts[1], 64)
		oLng, _ := strconv.ParseFloat(originParts[0], 64)
		dLat, _ := strconv.ParseFloat(destParts[1], 64)
		dLng, _ := strconv.ParseFloat(destParts[0], 64)

		originCoord := models.Coordinate{Lat: oLat, Lng: oLng}
		destCoord := models.Coordinate{Lat: dLat, Lng: dLng}

		snapDistanceM := 15000.0 // 15km snap to accommodate arbitrary coords
		startNode, _, err := osm.FindNearestNode(g, originCoord, snapDistanceM)
		if err != nil {
			http.Error(w, "Origin too far from known OSM road network", http.StatusBadRequest)
			return
		}

		endNode, _, err := osm.FindNearestNode(g, destCoord, snapDistanceM)
		if err != nil {
			http.Error(w, "Destination too far from known OSM road network", http.StatusBadRequest)
			return
		}

		activeHazards := hazardSvc.GetActiveHazards()

		// 1. Calculate primary route (no hazard avoidance)
		primaryPath, err := g.FindShortestPath(startNode, endNode, nil)
		if err != nil {
			http.Error(w, "Failed to calculate route", http.StatusInternalServerError)
			return
		}

		response := models.SafeRouteResponse{
			AvoidedHazards: []models.HazardIntersection{},
		}

		// 2. Check if primary route intersects ANY of the active hazards
		intersects := false
		var affectedEdgeIDs []string
		if len(activeHazards) > 0 {
			affectedEdgeIDs = osm.FindAffectedSegments(g, activeHazards)
			// Check if primary path uses any of these edges
			for _, edge := range primaryPath.Edges {
				for _, bID := range affectedEdgeIDs {
					if edge.ID == bID {
						intersects = true
						break
					}
				}
				if intersects {
					break
				}
			}
		}

		// 3. Reroute if dangerous
		if intersects {
			// Calculate alternate route passing the FULL array of hazards
			altPath, blockedIDs, err := osm.RouteAroundHazard(g, startNode, endNode, activeHazards)
			if err == nil {
				response.PrimaryRoute = buildRouteResult(g, primaryPath)
				response.AlternateSafeRoute = buildRouteResult(g, altPath)
				response.SelectionReason = "Avoided multiple dynamic hazards using AI predictions."

				// Send all avoided hazards to the UI for map rendering
				for _, h := range activeHazards {
					response.AvoidedHazards = append(response.AvoidedHazards, models.HazardIntersection{
						ID:              h.ID,
						Type:            h.Type,
						Severity:        h.Severity,
						RadiusM:         h.RadiusM,
						MinDistanceM:    0,
						IntersectsRoute: true,
						Action:          models.RiskActionAvoid,
						Reason:          h.Reason,
					})
				}
				_ = blockedIDs
			}
		} else {
			response.PrimaryRoute = buildRouteResult(g, primaryPath)
			response.SelectionReason = "Primary route is safe based on live telemetry."
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}

// buildRouteResult converts an internal graph PathResult into a frontend-friendly RouteResult
func buildRouteResult(g *graph.Graph, path *graph.PathResult) *models.RouteResult {
	if path == nil || len(path.Edges) == 0 {
		return nil
	}

	var coords []models.Coordinate
	// path.Edges gives the order. Add from node of first edge, then to nodes of all edges.
	firstFrom := path.Edges[0].From
	if int(firstFrom) < len(g.NodeCoords) {
		c := g.NodeCoords[firstFrom]
		if c.Lat != 0 && c.Lon != 0 {
			coords = append(coords, models.Coordinate{Lat: c.Lat, Lng: c.Lon})
		}
	}
	for _, edge := range path.Edges {
		if int(edge.To) < len(g.NodeCoords) {
			c := g.NodeCoords[edge.To]
			if c.Lat != 0 && c.Lon != 0 {
				coords = append(coords, models.Coordinate{Lat: c.Lat, Lng: c.Lon})
			}
		}
	}

	return &models.RouteResult{
		Distance:    path.TotalWeight,
		Duration:    path.TotalWeight / 15.0, // rough speed approximation (m/s)
		Polyline:    utils.EncodePolyline(coords, 5),
		Coordinates: coords,
	}
}
