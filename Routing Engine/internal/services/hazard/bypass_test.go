package hazard

import (
	"testing"

	"routing-engine/internal/models"
)

func TestGenerateBypassWaypoints(t *testing.T) {
	// A simple straight route along Longitude 91.0
	route := []models.Coordinate{
		{Lat: 25.0, Lng: 91.0},
		{Lat: 25.1, Lng: 91.0},
		{Lat: 25.2, Lng: 91.0},
		{Lat: 25.3, Lng: 91.0},
		{Lat: 25.4, Lng: 91.0},
		{Lat: 25.5, Lng: 91.0},
		{Lat: 25.6, Lng: 91.0},
		{Lat: 25.7, Lng: 91.0},
		{Lat: 25.8, Lng: 91.0},
		{Lat: 25.9, Lng: 91.0},
		{Lat: 26.0, Lng: 91.0},
	}

	hazard := models.Hazard{
		ID:        "HZ-TEST",
		Latitude:  25.5,
		Longitude: 91.0,
		RadiusM:   2000,
	}

	candidates := GenerateBypassWaypoints(route, hazard)

	if len(candidates) != 8 {
		t.Fatalf("Expected 8 bypass candidates, got %d", len(candidates))
	}

	// Ensure all candidates are offset from the hazard center (25.5, 91.0)
	for _, cand := range candidates {
		if cand.Lat == 25.5 && cand.Lng == 91.0 {
			t.Errorf("Candidate point did not shift from hazard center: lat=%f, lng=%f", cand.Lat, cand.Lng)
		}
	}
}
