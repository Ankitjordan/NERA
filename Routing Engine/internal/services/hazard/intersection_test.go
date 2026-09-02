package hazard

import (
	"testing"

	"routing-engine/internal/models"
	"routing-engine/internal/utils"
)

func TestHaversineAndDistanceCalculations(t *testing.T) {
	dist := utils.HaversineDistanceM(26.1445, 91.7362, 26.0150, 91.8833)
	if dist < 20000 || dist > 22000 {
		t.Errorf("Expected distance ~20.6km, got %.1f meters", dist)
	}
}

func TestEvaluateRiskDecision_Rules(t *testing.T) {
	testCases := []struct {
		name           string
		hazard         models.Hazard
		intersects     bool
		expectedAction models.RiskAction
	}{
		{
			name: "Non-intersecting hazard is SAFE",
			hazard: models.Hazard{
				ID:       "HZ-1",
				Type:     models.HazardTypeFlood,
				Severity: models.SeverityHigh,
			},
			intersects:     false,
			expectedAction: models.RiskActionSafe,
		},
		{
			name: "Intersecting ROAD_CLOSURE is AVOID",
			hazard: models.Hazard{
				ID:       "HZ-2",
				Type:     models.HazardTypeRoadClosure,
				Severity: models.SeverityLow,
			},
			intersects:     true,
			expectedAction: models.RiskActionAvoid,
		},
		{
			name: "Intersecting FLOOD + HIGH is AVOID",
			hazard: models.Hazard{
				ID:       "HZ-3",
				Type:     models.HazardTypeFlood,
				Severity: models.SeverityHigh,
			},
			intersects:     true,
			expectedAction: models.RiskActionAvoid,
		},
		{
			name: "Intersecting LANDSLIDE + HIGH is AVOID",
			hazard: models.Hazard{
				ID:       "HZ-4",
				Type:     models.HazardTypeLandslide,
				Severity: models.SeverityHigh,
			},
			intersects:     true,
			expectedAction: models.RiskActionAvoid,
		},
		{
			name: "Intersecting ACCIDENT + HIGH is AVOID",
			hazard: models.Hazard{
				ID:       "HZ-5",
				Type:     models.HazardTypeAccident,
				Severity: models.SeverityHigh,
			},
			intersects:     true,
			expectedAction: models.RiskActionAvoid,
		},
		{
			name: "Intersecting CONSTRUCTION + HIGH is AVOID",
			hazard: models.Hazard{
				ID:       "HZ-6",
				Type:     models.HazardTypeConstruction,
				Severity: models.SeverityHigh,
			},
			intersects:     true,
			expectedAction: models.RiskActionAvoid,
		},
		{
			name: "Intersecting ACCIDENT + MEDIUM is CAUTION",
			hazard: models.Hazard{
				ID:       "HZ-7",
				Type:     models.HazardTypeAccident,
				Severity: models.SeverityMedium,
			},
			intersects:     true,
			expectedAction: models.RiskActionCaution,
		},
		{
			name: "Intersecting CONSTRUCTION + LOW is CAUTION",
			hazard: models.Hazard{
				ID:       "HZ-8",
				Type:     models.HazardTypeConstruction,
				Severity: models.SeverityLow,
			},
			intersects:     true,
			expectedAction: models.RiskActionCaution,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			action, reason := EvaluateRiskDecision(tc.hazard, tc.intersects)
			if action != tc.expectedAction {
				t.Errorf("Expected action %s, got %s (reason: %s)", tc.expectedAction, action, reason)
			}
		})
	}
}

func TestGuwahatiShillongRiskDecisions(t *testing.T) {
	// Key waypoints along the Guwahati to Shillong NH6 drive:
	route := []models.Coordinate{
		{Lat: 26.1445, Lng: 91.7362}, // Guwahati center
		{Lat: 26.1158, Lng: 91.8001}, // Khanapara
		{Lat: 26.0152, Lng: 91.8831}, // Jorabat junction
		{Lat: 25.9830, Lng: 91.8998}, // Byrnihat
		{Lat: 25.9165, Lng: 91.8752}, // Nongpoh
		{Lat: 25.7500, Lng: 91.8900}, // Umsning
		{Lat: 25.6665, Lng: 91.8835}, // Umiam
		{Lat: 25.5788, Lng: 91.8933}, // Shillong
	}

	svc := NewService()
	hazards := svc.GetActiveHazards()

	report := CheckRouteIntersections(route, hazards)

	results := make(map[string]models.HazardIntersection)
	for _, h := range report.Hazards {
		results[h.ID] = h
	}

	// 1. Jorabat Accident (MEDIUM) -> intersects -> CAUTION
	if results["HZ-JRB-001"].Action != models.RiskActionCaution {
		t.Errorf("Expected HZ-JRB-001 to be CAUTION, got %s", results["HZ-JRB-001"].Action)
	}

	// 2. Byrnihat Construction (LOW) -> intersects -> CAUTION
	if results["HZ-BYR-002"].Action != models.RiskActionCaution {
		t.Errorf("Expected HZ-BYR-002 to be CAUTION, got %s", results["HZ-BYR-002"].Action)
	}

	// 3. Nongpoh Flood (HIGH) -> intersects -> AVOID
	if results["HZ-NONG-003"].Action != models.RiskActionAvoid {
		t.Errorf("Expected HZ-NONG-003 to be AVOID, got %s", results["HZ-NONG-003"].Action)
	}

	// 4. Umiam Landslide (HIGH) -> intersects -> AVOID
	if results["HZ-UMI-004"].Action != models.RiskActionAvoid {
		t.Errorf("Expected HZ-UMI-004 to be AVOID, got %s", results["HZ-UMI-004"].Action)
	}

	// 5. Rani Wetland (LOW) -> no intersection -> SAFE
	if results["HZ-RANI-005"].Action != models.RiskActionSafe {
		t.Errorf("Expected HZ-RANI-005 to be SAFE, got %s", results["HZ-RANI-005"].Action)
	}

	// 6. Khanapara Landslide (HIGH) -> off-route for this polyline -> SAFE
	if results["HZ-TEST-KHA-001"].Action != models.RiskActionSafe {
		t.Errorf("Expected HZ-TEST-KHA-001 to be SAFE, got %s", results["HZ-TEST-KHA-001"].Action)
	}

	// 7. Bajrang Ispat Accident (HIGH) -> intersects -> AVOID
	if results["HZ-BAJ-006"].Action != models.RiskActionAvoid {
		t.Errorf("Expected HZ-BAJ-006 to be AVOID, got %s", results["HZ-BAJ-006"].Action)
	}

	// Check summary counts
	if report.AvoidCount != 3 {
		t.Errorf("Expected 3 AVOID hazards, got %d", report.AvoidCount)
	}
	if report.CautionCount != 2 {
		t.Errorf("Expected 2 CAUTION hazards, got %d", report.CautionCount)
	}
	if report.SafeCount != 2 {
		t.Errorf("Expected 2 SAFE hazards, got %d", report.SafeCount)
	}
}
