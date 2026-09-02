package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"routing-engine/internal/models"
	"routing-engine/internal/poc/osm"
	"routing-engine/internal/services/hazard"
	"routing-engine/internal/services/startup"
)

// POCOSMRouteHandler exposes the custom OSM/Dijkstra route for frontend visualization.
func POCOSMRouteHandler(manager *startup.Manager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Enable CORS for UI dev server
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")

		g := manager.GetGraph()
		if g == nil {
			http.Error(w, "Service Unavailable: Graph not ready", http.StatusServiceUnavailable)
			return
		}

		// 1. Parse dynamic origin and destination from query (e.g. ?waypoints=lng,lat;lng,lat)
		waypointsStr := r.URL.Query().Get("waypoints")
		if waypointsStr == "" {
			http.Error(w, "Missing waypoints parameter", http.StatusBadRequest)
			return
		}

		parts := strings.Split(waypointsStr, ";")
		if len(parts) < 2 {
			http.Error(w, "Invalid waypoints format", http.StatusBadRequest)
			return
		}

		// Example parsing (simplified for POC): lng,lat
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

		// 2. Map coordinates to the nearest drivable OSM node
		snapDistanceM := 5000.0 // 5km snap for POC
		startNode, _, err := osm.FindNearestNode(g, originCoord, snapDistanceM)
		if err != nil {
			slog.Warn("Origin too far from drivable roads", "error", err)
			http.Error(w, "Origin too far from known OSM road network", http.StatusBadRequest)
			return
		}

		endNode, _, err := osm.FindNearestNode(g, destCoord, snapDistanceM)
		if err != nil {
			slog.Warn("Destination too far from drivable roads", "error", err)
			http.Error(w, "Destination too far from known OSM road network", http.StatusBadRequest)
			return
		}

		// 3. Dynamically fetch real active hazards from the service
		hazardSvc := hazard.NewService()
		activeHazards := hazardSvc.GetActiveHazards()

		// Pass the FULL slice of active hazards to RouteAroundHazard
		altRoute, _, err := osm.RouteAroundHazard(g, startNode, endNode, activeHazards)
		if err != nil {
			slog.Error("Failed to calculate alternate route", "error", err)
			http.Error(w, "Failed to calculate alternate route", http.StatusInternalServerError)
			return
		}

		// Convert to Map Geometry
		geomResult := osm.ConvertPathToGeometry(g, altRoute)

		if err := json.NewEncoder(w).Encode(geomResult); err != nil {
			slog.Error("Failed to encode geometry result", "error", err)
		}
	}
}
