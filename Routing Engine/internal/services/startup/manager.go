package startup

import (
	"fmt"
	"log/slog"
	"os"
	"sync"
	"time"

	"routing-engine/internal/poc/graph"
	"routing-engine/internal/poc/osm"
)

type State string

const (
	StateCheckingCache State = "checking_cache"
	StateDownloading   State = "downloading"
	StateBuildingGraph State = "building_graph"
	StateSavingCache   State = "saving_cache"
	StateLoadingGraph  State = "loading_graph"
	StateReady         State = "ready"
	StateError         State = "error"
)

type Manager struct {
	mu          sync.RWMutex
	state       State
	message     string
	percent     float64
	activeGraph *graph.Graph
	metadata    *graph.GraphMetadata

	gobPath      string
	metadataPath string
	pbfDir       string
}

func NewManager(gobPath, metadataPath, pbfDir string) *Manager {
	return &Manager{
		state:        StateCheckingCache,
		message:      "Initializing...",
		gobPath:      gobPath,
		metadataPath: metadataPath,
		pbfDir:       pbfDir,
	}
}

func (m *Manager) GetStatus() (State, string, float64, *graph.GraphMetadata) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.state, m.message, m.percent, m.metadata
}

func (m *Manager) GetGraph() *graph.Graph {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if m.state != StateReady {
		return nil
	}
	return m.activeGraph
}

func (m *Manager) setStatus(state State, message string, percent float64) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state = state
	m.message = message
	m.percent = percent
	slog.Info("Startup Status", slog.String("state", string(state)), slog.String("msg", message))
}

func (m *Manager) StartAsync() {
	go func() {
		err := m.runLifecycle()
		if err != nil {
			m.setStatus(StateError, err.Error(), 0)
			slog.Error("Startup lifecycle failed", slog.String("error", err.Error()))
		}
	}()
}

func (m *Manager) runLifecycle() error {
	m.setStatus(StateCheckingCache, "Validating cached graph metadata...", 0)

	validCache := false
	meta, err := graph.LoadMetadata(m.metadataPath)
	if err == nil && meta != nil {
		if meta.IsCompleteNER() {
			// Check if gob actually exists
			if _, statErr := os.Stat(m.gobPath); statErr == nil {
				validCache = true
				m.mu.Lock()
				m.metadata = meta
				m.mu.Unlock()
			}
		} else {
			slog.Warn("Graph metadata is missing states, cache invalidated.")
		}
	} else {
		slog.Warn("No valid metadata found, assuming empty cache.", slog.Any("err", err))
	}

	if validCache {
		m.setStatus(StateLoadingGraph, "Loading cached graph into memory...", 0)
		g, err := graph.LoadFromFile(m.gobPath)
		if err != nil {
			slog.Error("Failed to load gob cache, falling back to rebuild", slog.String("err", err.Error()))
			validCache = false
		} else {
			m.mu.Lock()
			m.activeGraph = g
			m.mu.Unlock()
			m.setStatus(StateReady, "NER routing ready", 100)
			return nil
		}
	}

	// Rebuild sequence
	m.setStatus(StateDownloading, "Checking for missing OSM PBFs...", 0)
	_, dlErr := DownloadMissingPBFs(m.pbfDir, func(stateName string, percent float64) {
		msg := fmt.Sprintf("Downloading %s data...", stateName)
		m.setStatus(StateDownloading, msg, percent)
	})
	if dlErr != nil {
		return fmt.Errorf("download failed: %w", dlErr)
	}

	m.setStatus(StateBuildingGraph, "Building NER road graph (this may take up to 2 minutes)...", 0)
	g, err := osm.ParseNERDirectory(m.pbfDir)
	if err != nil {
		return fmt.Errorf("graph build failed: %w", err)
	}

	m.setStatus(StateSavingCache, "Persisting graph to cache...", 0)
	if err := g.SaveToFile(m.gobPath); err != nil {
		return fmt.Errorf("failed to save gob: %w", err)
	}

	newMeta := &graph.GraphMetadata{
		Version:        "1.0",
		BuildTimestamp: time.Now(),
		NodesTotal:     len(g.NodeCoords),
		EdgesTotal:     len(g.Nodes),
		CoveredStates:  RequiredNERStates,
	}

	if err := graph.SaveMetadata(m.metadataPath, newMeta); err != nil {
		slog.Error("Failed to save metadata", slog.String("error", err.Error()))
	}

	m.mu.Lock()
	m.activeGraph = g
	m.metadata = newMeta
	m.mu.Unlock()

	m.setStatus(StateReady, "NER routing ready", 100)
	return nil
}
