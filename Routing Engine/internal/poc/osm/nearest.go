package osm

import (
	"errors"
	"routing-engine/internal/models"
	"routing-engine/internal/poc/graph"
	"routing-engine/internal/utils"
)

// FindNearestNode searches the graph for the closest physical drivable node using a spatial bounding box.
func FindNearestNode(g *graph.Graph, target models.Coordinate, maxSnapDistanceM float64) (int32, float64, error) {
	if g == nil || len(g.NodeCoords) == 0 {
		return -1, 0, errors.New("empty graph")
	}

	var bestNodeID int32 = -1
	minDistance := -1.0

	// 1 degree is roughly 111,000 meters. Create a rapid filtering box.
	degreeOffset := maxSnapDistanceM / 111000.0
	minLat, maxLat := target.Lat-degreeOffset, target.Lat+degreeOffset
	minLon, maxLon := target.Lng-degreeOffset, target.Lng+degreeOffset

	for i, coords := range g.NodeCoords {
		// SPATIAL INDEXING: Skip millions of nodes instantly if they aren't in the local square
		if coords.Lat < minLat || coords.Lat > maxLat || coords.Lon < minLon || coords.Lon > maxLon {
			continue
		}

		if len(g.Nodes[i]) == 0 {
			continue // Skip dead-end nodes
		}

		dist := utils.HaversineDistanceM(coords.Lat, coords.Lon, target.Lat, target.Lng)

		if minDistance == -1.0 || dist < minDistance {
			minDistance = dist
			bestNodeID = int32(i)
		}
	}

	if bestNodeID == -1 || minDistance > maxSnapDistanceM {
		return -1, minDistance, errors.New("no drivable road found within snap distance")
	}

	return bestNodeID, minDistance, nil
}
