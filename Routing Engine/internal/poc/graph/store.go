package graph

import (
	"bufio"
	"encoding/gob"
	"fmt"
	"os"
)

// SaveToFile serializes the Graph to a gob file using buffered I/O for speed.
func (g *Graph) SaveToFile(filepath string) error {
	file, err := os.Create(filepath)
	if err != nil {
		return fmt.Errorf("could not create file %s: %w", filepath, err)
	}
	defer file.Close()

	// Use an 8MB buffer to minimize disk writes
	writer := bufio.NewWriterSize(file, 8*1024*1024)
	encoder := gob.NewEncoder(writer)

	if err := encoder.Encode(g); err != nil {
		return fmt.Errorf("failed to encode graph: %w", err)
	}

	// Flush remaining buffer to disk
	return writer.Flush()
}

// LoadFromFile deserializes the Graph from a gob file using buffered I/O.
func LoadFromFile(filepath string) (*Graph, error) {
	file, err := os.Open(filepath)
	if err != nil {
		return nil, fmt.Errorf("could not open file %s: %w", filepath, err)
	}
	defer file.Close()

	// Use an 8MB buffer to minimize disk reads (Massive speedup for NER graph)
	reader := bufio.NewReaderSize(file, 8*1024*1024)

	var g Graph
	decoder := gob.NewDecoder(reader)
	if err := decoder.Decode(&g); err != nil {
		return nil, fmt.Errorf("failed to decode graph: %w", err)
	}
	return &g, nil
}
