package osm

import (
	"routing-engine/internal/models"
	"routing-engine/internal/poc/graph"
	"routing-engine/internal/utils"
)

// FindAffectedSegments takes an in-memory graph and a hazard, and returns
// a list of all edge IDs that intersect the hazard's radius.
func FindAffectedSegments(g *graph.Graph, hazard models.Hazard) []string {
	var affectedIDs []string

	// Keep track of checked edges to avoid duplicates in bidirectional graphs
	checked := make(map[string]bool)

	for i := range g.Nodes {
		for _, edge := range g.Nodes[i] {
			if checked[edge.ID] {
				continue
			}
			checked[edge.ID] = true

			coord1 := g.NodeCoords[edge.From]
			coord2 := g.NodeCoords[edge.To]
			if coord1.Lat == 0 && coord1.Lon == 0 {
				continue
			}
			if coord2.Lat == 0 && coord2.Lon == 0 {
				continue
			}

			// Check if segment intersects hazard
			if segmentIntersectsHazard(coord1, coord2, hazard) {
				affectedIDs = append(affectedIDs, edge.ID)
			}
		}
	}

	return affectedIDs
}

// segmentIntersectsHazard approximates line-circle intersection by testing points along the segment.
func segmentIntersectsHazard(p1, p2 graph.Coordinate, h models.Hazard) bool {
	// 1. Quick check: Are endpoints inside?
	d1 := utils.HaversineDistanceM(p1.Lat, p1.Lon, h.Latitude, h.Longitude)
	if d1 <= h.RadiusM {
		return true
	}

	d2 := utils.HaversineDistanceM(p2.Lat, p2.Lon, h.Latitude, h.Longitude)
	if d2 <= h.RadiusM {
		return true
	}

	// 2. Interpolate points along the segment to catch crossings.
	// We'll test every ~20 meters.
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

// RouteAroundHazard connects the hazard mapper and graph pathfinder to find a safe alternate route.
// It returns the found path, the list of affected segment IDs that were blocked, and any error.
func RouteAroundHazard(g *graph.Graph, start, end int32, h *models.Hazard) (*graph.PathResult, []string, error) {
	var blockedIDs []string
	if h != nil {
		blockedIDs = FindAffectedSegments(g, *h)
	}

	path, err := g.FindShortestPath(start, end, blockedIDs)
	return path, blockedIDs, err
}
