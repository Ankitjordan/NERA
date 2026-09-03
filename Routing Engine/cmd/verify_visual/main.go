package main

import (
	"fmt"
	"log/slog"
	"os"

	"routing-engine/internal/models"
	"routing-engine/internal/poc/graph"
	"routing-engine/internal/poc/osm"
)

func main() {
	g, err := graph.LoadFromFile("ner_graph.gob")
	if err != nil {
		slog.Error("Failed to load graph", "error", err)
		os.Exit(1)
	}

	// Guwahati -> Shillong
	origin := models.Coordinate{Lat: 26.1445, Lng: 91.7362}
	dest := models.Coordinate{Lat: 25.5788, Lng: 91.8933}

	startNode, startDist, err := osm.FindNearestNode(g, origin, 15000.0)
	if err != nil {
		panic(err)
	}
	endNode, endDist, err := osm.FindNearestNode(g, dest, 15000.0)
	if err != nil {
		panic(err)
	}

	fmt.Printf("Snapped Start: %d (dist: %.1fm)\n", startNode, startDist)
	fmt.Printf("Snapped End:   %d (dist: %.1fm)\n", endNode, endDist)

	// 1. Primary Route
	primaryPath, err := g.FindShortestPath(startNode, endNode, nil)
	if err != nil {
		panic(err)
	}
	fmt.Printf("Primary Route: %.2f km (%d edges)\n", primaryPath.TotalWeight/1000.0, len(primaryPath.Edges))

	// 2. Find a middle edge along the primary path (e.g. around 30% or 40% into the route)
	midEdgeIdx := len(primaryPath.Edges) / 3
	midEdge := primaryPath.Edges[midEdgeIdx]
	midCoord := g.NodeCoords[midEdge.From]
	fmt.Printf("Selected mid-route point on edge #%d: Lat %.5f, Lng %.5f\n", midEdgeIdx, midCoord.Lat, midCoord.Lon)

	// Check a few points along the route to find one with a good detour
	for _, fraction := range []float64{0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8} {
		idx := int(float64(len(primaryPath.Edges)) * fraction)
		edge := primaryPath.Edges[idx]
		c := g.NodeCoords[edge.From]

		testHazard := models.Hazard{
			ID:        fmt.Sprintf("HZ-TEST-LOC-%.0f", fraction*100),
			Type:      models.HazardTypeLandslide,
			Latitude:  c.Lat,
			Longitude: c.Lon,
			RadiusM:   500,
			Severity:  models.SeverityHigh,
			Reason:    "Active test landslide on primary corridor",
			Active:    true,
		}

		blocked := osm.FindAffectedSegments(g, []models.Hazard{testHazard})
		altPath, altErr := g.FindShortestPath(startNode, endNode, blocked)
		if altErr != nil {
			fmt.Printf("Fraction %.2f (Lat %.4f, Lng %.4f): Blocked %d edges -> Alternate FAILED: %v\n", fraction, c.Lat, c.Lon, len(blocked), altErr)
		} else {
			diffKm := (altPath.TotalWeight - primaryPath.TotalWeight) / 1000.0
			fmt.Printf("Fraction %.2f (Lat %.4f, Lng %.4f): Blocked %d edges -> Alternate SUCCESS: %.2f km (+%.2f km, %d edges)\n",
				fraction, c.Lat, c.Lon, len(blocked), altPath.TotalWeight/1000.0, diffKm, len(altPath.Edges))
		}
	}
}
