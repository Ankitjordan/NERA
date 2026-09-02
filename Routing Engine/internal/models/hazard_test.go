package models

import (
	"encoding/json"
	"testing"
)

func TestHazardSerialization(t *testing.T) {
	h := Hazard{
		ID:        "HZ-001",
		Type:      HazardTypeFlood,
		Latitude:  25.51,
		Longitude: 91.89,
		RadiusM:   5000,
		Severity:  SeverityHigh,
		Reason:    "Flooding reported",
		Active:    true,
	}

	data, err := json.Marshal(h)
	if err != nil {
		t.Fatalf("Failed to serialize hazard: %v", err)
	}

	expectedJSON := `{"id":"HZ-001","type":"FLOOD","latitude":25.51,"longitude":91.89,"radius_m":5000,"severity":"HIGH","reason":"Flooding reported","active":true}`
	if string(data) != expectedJSON {
		t.Errorf("Expected %s, got %s", expectedJSON, string(data))
	}

	var parsed Hazard
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("Failed to deserialize hazard: %v", err)
	}

	if parsed.ID != h.ID || parsed.Type != h.Type || parsed.Severity != h.Severity {
		t.Errorf("Deserialized data does not match original struct")
	}
}

func TestHazardValidation(t *testing.T) {
	valid := Hazard{
		ID:        "HZ-001",
		Type:      HazardTypeAccident,
		Latitude:  26.0,
		Longitude: 92.0,
		RadiusM:   500,
		Severity:  SeverityMedium,
		Active:    true,
	}

	if !valid.IsValid() {
		t.Errorf("Expected valid hazard to be true")
	}

	invalidLat := valid
	invalidLat.Latitude = 100 // invalid
	if invalidLat.IsValid() {
		t.Errorf("Expected hazard with invalid latitude to be false")
	}

	invalidRadius := valid
	invalidRadius.RadiusM = 0
	if invalidRadius.IsValid() {
		t.Errorf("Expected hazard with zero radius to be false")
	}
}
