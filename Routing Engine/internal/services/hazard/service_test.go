package hazard

import (
	"testing"
)

func TestGetActiveHazards(t *testing.T) {
	svc := NewService()
	hazards := svc.GetActiveHazards()

	if len(hazards) == 0 {
		t.Fatalf("Expected non-empty active hazards list")
	}

	for _, h := range hazards {
		if !h.Active {
			t.Errorf("Expected only active hazards, found inactive hazard: %s", h.ID)
		}
		if !h.IsValid() {
			t.Errorf("Hazard %s failed validation", h.ID)
		}
	}
}
