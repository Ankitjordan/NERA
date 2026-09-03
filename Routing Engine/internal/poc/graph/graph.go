package graph

import (
	"container/heap"
	"errors"
	"math"
)

// Edge represents a road segment connecting two nodes.
type Edge struct {
	ID     string
	From   int32
	To     int32
	Weight float64
}

// Coordinate represents a geographic point.
type Coordinate struct {
	Lat float64
	Lon float64
}

// Graph represents the in-memory road network.
type Graph struct {
	Nodes      [][]Edge
	NodeCoords []Coordinate

	OSMToInternal map[int64]int32
	InternalToOSM []int64
}

// NewGraph initializes a new empty graph.
func NewGraph() *Graph {
	return &Graph{
		Nodes:         make([][]Edge, 0),
		NodeCoords:    make([]Coordinate, 0),
		OSMToInternal: make(map[int64]int32),
		InternalToOSM: make([]int64, 0),
	}
}

// GetOrAddNode maps an OSM node ID to an internal int32 ID.
func (g *Graph) GetOrAddNode(osmID int64) int32 {
	if internalID, exists := g.OSMToInternal[osmID]; exists {
		return internalID
	}
	internalID := int32(len(g.InternalToOSM))
	g.OSMToInternal[osmID] = internalID
	g.InternalToOSM = append(g.InternalToOSM, osmID)

	// Pre-allocate slots
	g.Nodes = append(g.Nodes, nil)
	g.NodeCoords = append(g.NodeCoords, Coordinate{})

	return internalID
}

// AddEdge adds a directed edge to the graph.
func (g *Graph) AddEdge(id string, from, to int32, weight float64) {
	g.Nodes[from] = append(g.Nodes[from], Edge{
		ID:     id,
		From:   from,
		To:     to,
		Weight: weight,
	})
}

// SetNodeCoord saves the physical coordinates of a node.
func (g *Graph) SetNodeCoord(id int32, lat, lon float64) {
	g.NodeCoords[id] = Coordinate{Lat: lat, Lon: lon}
}

// isBlocked checks if an edge ID is in the blocked list.
func isBlocked(id string, blockedIDs []string) bool {
	for _, bID := range blockedIDs {
		if id == bID {
			return true
		}
	}
	return false
}

// PriorityQueue implementation for A* algorithm.
type Item struct {
	nodeID   int32
	priority float64
	gCost    float64
	index    int
}

type PriorityQueue []*Item

func (pq PriorityQueue) Len() int { return len(pq) }

func (pq PriorityQueue) Less(i, j int) bool {
	return pq[i].priority < pq[j].priority
}

func (pq PriorityQueue) Swap(i, j int) {
	pq[i], pq[j] = pq[j], pq[i]
	pq[i].index = i
	pq[j].index = j
}

func (pq *PriorityQueue) Push(x interface{}) {
	n := len(*pq)
	item := x.(*Item)
	item.index = n
	*pq = append(*pq, item)
}

func (pq *PriorityQueue) Pop() interface{} {
	old := *pq
	n := len(old)
	item := old[n-1]
	old[n-1] = nil  // avoid memory leak
	item.index = -1 // for safety
	*pq = old[0 : n-1]
	return item
}

// PathResult represents the output of the shortest path algorithm.
type PathResult struct {
	Edges       []Edge
	TotalWeight float64
}

// FindShortestPath uses A* algorithm to find the shortest path from start to end,
// ignoring any edges whose IDs are present in blockedSegmentIDs.
func (g *Graph) FindShortestPath(start, end int32, blockedSegmentIDs []string) (*PathResult, error) {
	if int(end) >= len(g.NodeCoords) || int(start) >= len(g.NodeCoords) {
		return nil, errors.New("node coordinates not found")
	}
	endCoord := g.NodeCoords[end]

	dist := make(map[int32]float64)
	prev := make(map[int32]*Edge)

	dist[start] = 0.0

	pq := make(PriorityQueue, 0)
	heap.Init(&pq)

	startCoord := g.NodeCoords[start]
	hStart := fastHeuristicM(startCoord.Lat, startCoord.Lon, endCoord.Lat, endCoord.Lon)
	heap.Push(&pq, &Item{nodeID: start, priority: hStart, gCost: 0})

	for pq.Len() > 0 {
		curr := heap.Pop(&pq).(*Item)

		// Optimization: if we reached the end, we can stop
		if curr.nodeID == end {
			break
		}

		// It's possible we found a better path before popping this item
		if curr.gCost > dist[curr.nodeID] {
			continue
		}

		for i := range g.Nodes[curr.nodeID] {
			edge := &g.Nodes[curr.nodeID][i]
			if isBlocked(edge.ID, blockedSegmentIDs) {
				continue
			}

			newDist := curr.gCost + edge.Weight

			// If we haven't visited this node yet, its distance is conceptually infinity
			currentDist, exists := dist[edge.To]
			if !exists || newDist < currentDist {
				dist[edge.To] = newDist
				prev[edge.To] = edge

				toCoord := g.NodeCoords[edge.To]
				h := fastHeuristicM(toCoord.Lat, toCoord.Lon, endCoord.Lat, endCoord.Lon)
				heap.Push(&pq, &Item{nodeID: edge.To, priority: newDist + h, gCost: newDist})
			}
		}
	}

	if dist[end] >= 1e9 {
		return nil, errors.New("no route found")
	}

	// Reconstruct path by walking backwards: Destination -> predecessor -> Start
	var path []Edge
	currNode := end
	for currNode != start {
		e := prev[currNode]
		if e == nil {
			return nil, errors.New("broken path during reconstruction: no predecessor found")
		}
		path = append(path, *e)
		currNode = e.From
	}

	// Reverse the path to get Start -> Destination order
	for i, j := 0, len(path)-1; i < j; i, j = i+1, j-1 {
		path[i], path[j] = path[j], path[i]
	}

	return &PathResult{
		Edges:       path,
		TotalWeight: dist[end],
	}, nil
}

// Fast Euclidean approximation (meters) replacing expensive trigonometric Haversine
// This dramatically accelerates A* PriorityQueue insertions.
func fastHeuristicM(lat1, lon1, lat2, lon2 float64) float64 {
	dLat := (lat2 - lat1) * 111320.0
	// Calculate cosine once for the average latitude to scale the longitude
	avgLat := (lat1 + lat2) / 2.0 * (math.Pi / 180.0)
	dLon := (lon2 - lon1) * 111320.0 * math.Cos(avgLat)
	return math.Sqrt(dLat*dLat + dLon*dLon)
}
