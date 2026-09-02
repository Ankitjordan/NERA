package osm

import (
	"routing-engine/internal/models"
	"routing-engine/internal/poc/graph"
)

// GraphRouteResult represents the ordered map geometry of a calculated route.
type GraphRouteResult struct {
	Coordinates []models.Coordinate
	DistanceM   float64
}

// ConvertPathToGeometry transforms a graph path (edges) into ordered latitude/longitude coordinates.
func ConvertPathToGeometry(g *graph.Graph, path *graph.PathResult) *GraphRouteResult {
	if path == nil || len(path.Edges) == 0 {
		return &GraphRouteResult{
			Coordinates: []models.Coordinate{},
			DistanceM:   0,
		}
	}

	var coords []models.Coordinate

	// Add the starting node of the first edge
	startEdge := path.Edges[0]
	if int(startEdge.From) < len(g.NodeCoords) {
		startCoord := g.NodeCoords[startEdge.From]
		if startCoord.Lat != 0 && startCoord.Lon != 0 {
			coords = append(coords, models.Coordinate{
				Lat: startCoord.Lat,
				Lng: startCoord.Lon,
			})
		}
	}

	// Add the destination node of every edge to build the continuous sequence
	for _, edge := range path.Edges {
		if int(edge.To) < len(g.NodeCoords) {
			nodeCoord := g.NodeCoords[edge.To]
			if nodeCoord.Lat != 0 && nodeCoord.Lon != 0 {
				coords = append(coords, models.Coordinate{
					Lat: nodeCoord.Lat,
					Lng: nodeCoord.Lon, // Note: graph.Coordinate uses 'Lon', models.Coordinate uses 'Lng'
				})
			}
		}
	}

	return &GraphRouteResult{
		Coordinates: coords,
		DistanceM:   path.TotalWeight, // In our POC, TotalWeight is strictly physical distance in meters
	}
}
