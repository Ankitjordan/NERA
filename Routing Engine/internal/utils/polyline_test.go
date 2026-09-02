package utils

import (
	"math"
	"testing"

	"routing-engine/internal/models"
)

func TestDecodePolyline(t *testing.T) {
	// A simple known encoded polyline from Google/Mappls format
	// Let's use a very short one. E.g. origin: (38.5, -120.2), dest: (40.7, -120.95), (43.252, -126.453)
	encoded := "_p~iF~ps|U_ulLnnqC_mqNvxq`@"

	coords := DecodePolyline(encoded, 5)

	if len(coords) != 3 {
		t.Fatalf("Expected 3 coordinates, got %d", len(coords))
	}

	expected := []models.Coordinate{
		{Lat: 38.5, Lng: -120.2},
		{Lat: 40.7, Lng: -120.95},
		{Lat: 43.252, Lng: -126.453},
	}

	for i, c := range coords {
		// allow small floating point precision errors
		if math.Abs(c.Lat-expected[i].Lat) > 0.0001 || math.Abs(c.Lng-expected[i].Lng) > 0.0001 {
			t.Errorf("At index %d: expected %v, got %v", i, expected[i], c)
		}
	}
}
