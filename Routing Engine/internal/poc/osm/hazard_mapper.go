package osm

import (
	"routing-engine/internal/models"
	"routing-engine/internal/poc/graph"
	"routing-engine/internal/utils"
)

// FindAffectedSegments uses a Spatial Bounding Box to instantly find local edges
func FindAffectedSegments(g *graph.Graph, hazards []models.Hazard) []string {
	var affectedIDs []string
	checked := make(map[string]bool)

	for _, h := range hazards {
		// 1 degree is roughly 111,000 meters. Add a 500m buffer to the bounding box.
		degreeOffset := (h.RadiusM + 500.0) / 111000.0
		minLat, maxLat := h.Latitude-degreeOffset, h.Latitude+degreeOffset
		minLon, maxLon := h.Longitude-degreeOffset, h.Longitude+degreeOffset

		for i, coord1 := range g.NodeCoords {
			// Bounding Box Filter: Skip millions of irrelevant nodes instantly
			if coord1.Lat < minLat || coord1.Lat > maxLat || coord1.Lon < minLon || coord1.Lon > maxLon {
				continue
			}

			// Only evaluate edges connected to nodes physically inside the danger square
			for _, edge := range g.Nodes[i] {
				if checked[edge.ID] {
					continue
				}
				checked[edge.ID] = true

				coord2 := g.NodeCoords[edge.To]
				if segmentIntersectsHazard(coord1, coord2, h) {
					affectedIDs = append(affectedIDs, edge.ID)
				}
			}
		}
	}
	return affectedIDs
}

// segmentIntersectsHazard approximates line-circle intersection.
func segmentIntersectsHazard(p1, p2 graph.Coordinate, h models.Hazard) bool {
	d1 := utils.HaversineDistanceM(p1.Lat, p1.Lon, h.Latitude, h.Longitude)
	if d1 <= h.RadiusM {
		return true
	}
	d2 := utils.HaversineDistanceM(p2.Lat, p2.Lon, h.Latitude, h.Longitude)
	if d2 <= h.RadiusM {
		return true
	}

	totalDist := utils.HaversineDistanceM(p1.Lat, p1.Lon, p2.Lat, p2.Lon)
	if totalDist == 0 {
		return false
	}

	steps := int(totalDist / 20.0)
	if steps < 1 {
		steps = 1
	}

	for i := 1; i < steps; i++ {
		fraction := float64(i) / float64(steps)
		lat := p1.Lat + (p2.Lat-p1.Lat)*fraction
		lon := p1.Lon + (p2.Lon-p1.Lon)*fraction

		dist := utils.HaversineDistanceM(lat, lon, h.Latitude, h.Longitude)
		if dist <= h.RadiusM {
			return true
		}
	}
	return false
}

func RouteAroundHazard(g *graph.Graph, start, end int32, hazards []models.Hazard) (*graph.PathResult, []string, error) {
	var blockedIDs []string
	if len(hazards) > 0 {
		blockedIDs = FindAffectedSegments(g, hazards)
	}
	path, err := g.FindShortestPath(start, end, blockedIDs)
	return path, blockedIDs, err
}
