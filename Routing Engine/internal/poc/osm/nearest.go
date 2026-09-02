package osm

import (
	"errors"
	"routing-engine/internal/models"
	"routing-engine/internal/poc/graph"
	"routing-engine/internal/utils"
)

// FindNearestNode searches the graph for the closest physical drivable node to a target coordinate.
func FindNearestNode(g *graph.Graph, target models.Coordinate, maxSnapDistanceM float64) (int32, float64, error) {
	if g == nil || len(g.NodeCoords) == 0 {
		return -1, 0, errors.New("empty graph")
	}

	var bestNodeID int32 = -1
	minDistance := -1.0

	// Iterate over the flat array of coordinates (extremely fast)
	for i, coords := range g.NodeCoords {
		// Only snap to nodes that have outgoing edges (so we can actually start a route from there)
		if len(g.Nodes[i]) == 0 {
			continue
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
