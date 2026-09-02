package graph

import (
	"testing"
)

func TestRoadGraphPOC(t *testing.T) {
	// Setup the minimal road graph
	// Node 0
	// ├── Road 1 ──→ Node 1  (Weight: 10) [Fastest]
	// └── Road 2 ──→ Node 1  (Weight: 20) [Slower]

	g := NewGraph()

	// Add padding arrays since SetNodeCoord doesn't allocate for our flat structure
	// We need 2 nodes
	g.Nodes = make([][]Edge, 2)
	g.NodeCoords = make([]Coordinate, 2)
	g.SetNodeCoord(0, 26.0, 91.0)
	g.SetNodeCoord(1, 26.1, 91.1)

	g.AddEdge("road_1", 0, 1, 10.0) // Fastest route
	g.AddEdge("road_2", 0, 1, 20.0) // Alternate route

	// Case 1: Normal graph -> fastest road selected.
	t.Run("Normal graph uses fastest road", func(t *testing.T) {
		res, err := g.FindShortestPath(0, 1, nil)
		if err != nil {
			t.Fatalf("Expected route to be found, got error: %v", err)
		}

		if len(res.Edges) != 1 || res.Edges[0].ID != "road_1" {
			t.Errorf("Expected route to use road_1, got: %v", res.Edges)
		}
		if res.TotalWeight != 10.0 {
			t.Errorf("Expected total weight 10.0, got: %v", res.TotalWeight)
		}
	})

	// Case 2: Fastest road blocked -> alternate connected road selected.
	t.Run("Fastest road blocked uses alternate road", func(t *testing.T) {
		res, err := g.FindShortestPath(0, 1, []string{"road_1"})
		if err != nil {
			t.Fatalf("Expected route to be found, got error: %v", err)
		}

		if len(res.Edges) != 1 || res.Edges[0].ID != "road_2" {
			t.Errorf("Expected route to use road_2, got: %v", res.Edges)
		}
		if res.TotalWeight != 20.0 {
			t.Errorf("Expected total weight 20.0, got: %v", res.TotalWeight)
		}
	})

	// Case 3: If all roads are blocked -> no route returned.
	t.Run("All roads blocked returns no route", func(t *testing.T) {
		res, err := g.FindShortestPath(0, 1, []string{"road_1", "road_2"})
		if err == nil {
			t.Fatalf("Expected no route to be found, but got a route: %v", res)
		}

		expectedErr := "no route found"
		if err.Error() != expectedErr {
			t.Errorf("Expected error '%s', got '%v'", expectedErr, err)
		}
	})
}
