package hazard

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"sync"
	"time"

	"routing-engine/internal/models"
)

// Service provides access to hazards.
type Service struct {
	aiEndpoint string
	client     *http.Client

	// RWMutex protects the cachedHazards array from concurrent read/write panics
	mu            sync.RWMutex
	cachedHazards []models.Hazard
}

// NewService creates a new hazard service and boots the background polling worker.
func NewService() *Service {
	endpoint := os.Getenv("AI_SERVICE_URL")
	if endpoint == "" {
		endpoint = "http://localhost:8000/api/v1/predict-hazards"
	}

	svc := &Service{
		aiEndpoint: endpoint,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
		cachedHazards: []models.Hazard{},
	}

	// Detach the network polling into an infinite background goroutine
	go svc.pollHazards()

	return svc
}

// pollHazards runs continuously, fetching live AI predictions every 10 seconds.
func (s *Service) pollHazards() {
	// Execute an immediate initial fetch so the cache isn't empty on boot
	s.updateCache()

	ticker := time.NewTicker(10 * time.Second)
	for range ticker.C {
		s.updateCache()
	}
}

// updateCache makes the HTTP request and safely swaps the memory state.
func (s *Service) updateCache() {
	resp, err := s.client.Get(s.aiEndpoint)
	if err != nil {
		slog.Error("Background poller failed to reach AI service", "error", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		slog.Error("Background poller received non-200 status", "status", resp.StatusCode)
		return
	}

	var hazards []models.Hazard
	if err := json.NewDecoder(resp.Body).Decode(&hazards); err != nil {
		slog.Error("Background poller failed to decode JSON", "error", err)
		return
	}

	var active []models.Hazard
	for _, h := range hazards {
		if h.Active && h.IsValid() {
			active = append(active, h)
		}
	}

	// Lock the state exclusively to writers, swap the array, and instantly unlock
	s.mu.Lock()
	s.cachedHazards = active
	s.mu.Unlock()

	slog.Debug("AI hazard cache updated successfully", "count", len(active))
}

// GetActiveHazards now executes in O(1) time by reading directly from the locked cache.
func (s *Service) GetActiveHazards() []models.Hazard {
	// RLock allows multiple incoming HTTP requests to read the cache simultaneously
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Return a copy of the slice so external handlers cannot mutate the internal cache
	copyHazards := make([]models.Hazard, len(s.cachedHazards))
	copy(copyHazards, s.cachedHazards)

	return copyHazards
}
