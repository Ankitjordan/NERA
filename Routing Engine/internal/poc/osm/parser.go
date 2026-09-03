package osm

import (
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"runtime"

	"routing-engine/internal/poc/graph"
	"routing-engine/internal/utils"

	"github.com/qedus/osmpbf"
)

// Drivable highway types
var drivableHighways = map[string]bool{
	"motorway":       true,
	"motorway_link":  true,
	"trunk":          true,
	"trunk_link":     true,
	"primary":        true,
	"primary_link":   true,
	"secondary":      true,
	"secondary_link": true,
	"tertiary":       true,
	"tertiary_link":  true,
	"unclassified":   true,
	"residential":    true,
}

// ParseNERDirectory reads all PBF files in a directory and builds a Graph.
func ParseNERDirectory(dir string) (*graph.Graph, error) {
	g := graph.NewGraph()

	files, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("failed to read dir: %w", err)
	}

	// PASS 1: Nodes
	for _, f := range files {
		if filepath.Ext(f.Name()) != ".pbf" {
			continue
		}
		path := filepath.Join(dir, f.Name())
		slog.Info("Pass 1: Reading Nodes", slog.String("file", f.Name()))
		if err := readNodes(path, g); err != nil {
			return nil, err
		}
	}

	// PASS 2: Ways
	for _, f := range files {
		if filepath.Ext(f.Name()) != ".pbf" {
			continue
		}
		path := filepath.Join(dir, f.Name())
		slog.Info("Pass 2: Reading Ways", slog.String("file", f.Name()))
		if err := readWays(path, g); err != nil {
			return nil, err
		}
	}

	slog.Info("Finished parsing NER graph", slog.Int("nodes_total", len(g.NodeCoords)), slog.Int("nodes_with_edges", len(g.Nodes)))
	return g, nil
}

func readNodes(path string, g *graph.Graph) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	d := osmpbf.NewDecoder(f)
	d.SetBufferSize(osmpbf.MaxBlobSize)
	err = d.Start(runtime.GOMAXPROCS(-1))
	if err != nil {
		return err
	}

	for {
		if v, err := d.Decode(); err == io.EOF {
			break
		} else if err != nil {
			return err
		} else {
			switch v := v.(type) {
			case *osmpbf.Node:
				internalID := g.GetOrAddNode(v.ID)
				g.SetNodeCoord(internalID, v.Lat, v.Lon)
			}
		}
	}
	return nil
}

func readWays(path string, g *graph.Graph) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	d := osmpbf.NewDecoder(f)
	d.SetBufferSize(osmpbf.MaxBlobSize)
	err = d.Start(runtime.GOMAXPROCS(-1))
	if err != nil {
		return err
	}

	for {
		if v, err := d.Decode(); err == io.EOF {
			break
		} else if err != nil {
			return err
		} else {
			switch v := v.(type) {
			case *osmpbf.Way:
				// Check if it's a drivable highway
				hw, ok := v.Tags["highway"]
				if !ok || !drivableHighways[hw] {
					continue
				}

				// Check one-way
				oneway := false
				if ow, ok := v.Tags["oneway"]; ok && (ow == "yes" || ow == "1" || ow == "true") {
					oneway = true
				}

				// Create independently blockable edges between consecutive nodes.
				for i := 0; i < len(v.NodeIDs)-1; i++ {
					// We only add edges for nodes that are actually in the graph
					n1Int, ok1 := g.OSMToInternal[v.NodeIDs[i]]
					n2Int, ok2 := g.OSMToInternal[v.NodeIDs[i+1]]
					if !ok1 || !ok2 {
						continue // Node not loaded (e.g. outside extract)
					}

					c1 := g.NodeCoords[n1Int]
					c2 := g.NodeCoords[n2Int]
					// Safety check to ensure they were actually parsed
					if c1.Lat == 0 && c1.Lon == 0 {
						continue
					}
					if c2.Lat == 0 && c2.Lon == 0 {
						continue
					}

					// Calculate distance in meters using Haversine
					dist := utils.HaversineDistanceM(c1.Lat, c1.Lon, c2.Lat, c2.Lon)

					segmentID := fmt.Sprintf("way-%d-segment-%d", v.ID, i)

					// Add forward edge
					g.AddEdge(segmentID+"-forward", n1Int, n2Int, dist)

					// Add reverse edge if not one-way
					if !oneway {
						g.AddEdge(segmentID+"-reverse", n2Int, n1Int, dist)
					}
				}
			}
		}
	}
	return nil
}
