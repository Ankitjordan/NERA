package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"routing-engine/internal/models"
	"routing-engine/internal/services/hazard"
)

func TestHazardHandler(t *testing.T) {
	svc := hazard.NewService()
	handler := HazardHandler(svc)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/hazards", nil)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", rr.Code)
	}

	contentType := rr.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("Expected Content-Type application/json, got %s", contentType)
	}

	var hazards []models.Hazard
	if err := json.NewDecoder(rr.Body).Decode(&hazards); err != nil {
		t.Fatalf("Failed to decode response JSON: %v", err)
	}

	if len(hazards) == 0 {
		t.Errorf("Expected at least 1 hazard returned")
	}
}
