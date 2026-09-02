package graph

import (
	"encoding/gob"
	"fmt"
	"os"
)

// SaveToFile serializes the Graph to a gob file.
func (g *Graph) SaveToFile(filepath string) error {
	file, err := os.Create(filepath)
	if err != nil {
		return fmt.Errorf("could not create file %s: %w", filepath, err)
	}
	defer file.Close()

	encoder := gob.NewEncoder(file)
	if err := encoder.Encode(g); err != nil {
		return fmt.Errorf("failed to encode graph: %w", err)
	}
	return nil
}

// LoadFromFile deserializes the Graph from a gob file.
func LoadFromFile(filepath string) (*Graph, error) {
	file, err := os.Open(filepath)
	if err != nil {
		return nil, fmt.Errorf("could not open file %s: %w", filepath, err)
	}
	defer file.Close()

	var g Graph
	decoder := gob.NewDecoder(file)
	if err := decoder.Decode(&g); err != nil {
		return nil, fmt.Errorf("failed to decode graph: %w", err)
	}
	return &g, nil
}
