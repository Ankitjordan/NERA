package graph

import (
	"encoding/json"
	"os"
	"time"
)

// GraphMetadata contains persistence validation data.
type GraphMetadata struct {
	Version        string    `json:"version"`
	BuildTimestamp time.Time `json:"build_timestamp"`
	NodesTotal     int       `json:"nodes_total"`
	EdgesTotal     int       `json:"edges_total"`
	CoveredStates  []string  `json:"covered_states"`
}

// SaveMetadata writes the metadata to a JSON file.
func SaveMetadata(filepath string, meta *GraphMetadata) error {
	file, err := os.Create(filepath)
	if err != nil {
		return err
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	return encoder.Encode(meta)
}

// LoadMetadata reads metadata from a JSON file.
func LoadMetadata(filepath string) (*GraphMetadata, error) {
	file, err := os.Open(filepath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var meta GraphMetadata
	if err := json.NewDecoder(file).Decode(&meta); err != nil {
		return nil, err
	}
	return &meta, nil
}

// IsCompleteNER checks if the metadata covers all 8 states of the Northeast Region.
func (m *GraphMetadata) IsCompleteNER() bool {
	requiredStates := map[string]bool{
		"assam":             true,
		"meghalaya":         true,
		"arunachal_pradesh": true,
		"nagaland":          true,
		"manipur":           true,
		"mizoram":           true,
		"tripura":           true,
		"sikkim":            true,
	}

	for _, state := range m.CoveredStates {
		delete(requiredStates, state)
	}

	return len(requiredStates) == 0
}
