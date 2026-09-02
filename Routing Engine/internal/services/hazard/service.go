package hazard

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"time"

	"routing-engine/internal/models"
)

// Service provides access to hazards.
type Service struct {
	aiEndpoint string
	client     *http.Client
}

// NewService creates a new hazard service connected to the Python AI Engine.
func NewService() *Service {
	// Allows overriding the URL for Docker/production, defaults to local Python server
	endpoint := os.Getenv("AI_SERVICE_URL")
	if endpoint == "" {
		endpoint = "http://localhost:8000/api/v1/predict-hazards"
	}

	return &Service{
		aiEndpoint: endpoint,
		client: &http.Client{
			Timeout: 20 * time.Second, // 5-second timeout so Go doesn't hang if Python is down
		},
	}
}

// GetActiveHazards fetches dynamic AI predictions from the Python microservice via HTTP GET.
func (s *Service) GetActiveHazards() []models.Hazard {
	resp, err := s.client.Get(s.aiEndpoint)
	if err != nil {
		slog.Error("Failed to reach AI hazard service, falling back to empty list", "error", err)
		return []models.Hazard{}
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		slog.Error("AI service returned non-200 status", "status", resp.StatusCode)
		return []models.Hazard{}
	}

	var hazards []models.Hazard
	if err := json.NewDecoder(resp.Body).Decode(&hazards); err != nil {
		slog.Error("Failed to decode AI hazard response", "error", err)
		return []models.Hazard{}
	}

	var active []models.Hazard
	for _, h := range hazards {
		if h.Active && h.IsValid() {
			active = append(active, h)
		}
	}

	slog.Info("Successfully fetched AI hazards", "count", len(active))
	return active
}
