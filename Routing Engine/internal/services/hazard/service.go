package hazard

import (
	"routing-engine/internal/models"
)

// Service provides access to hazards.
type Service struct {
	hazards []models.Hazard
}

// NewService creates a new hazard service initialized with route-relevant mock data.
func NewService() *Service {
	return &Service{
		hazards: defaultMockHazards(),
	}
}

// GetActiveHazards returns all currently active hazards.
func (s *Service) GetActiveHazards() []models.Hazard {
	var active []models.Hazard
	for _, h := range s.hazards {
		if h.Active {
			active = append(active, h)
		}
	}
	return active
}

// defaultMockHazards returns route-relevant hazards for the Guwahati–Shillong corridor.
func defaultMockHazards() []models.Hazard {
	return []models.Hazard{
		{
			ID:        "HZ-TEST-KHA-001",
			Type:      models.HazardTypeLandslide,
			Latitude:  26.1141,
			Longitude: 91.8352,
			RadiusM:   500,
			Severity:  models.SeverityHigh,
			Reason:    "Active test landslide on primary corridor (Khanapara bypass)",
			Active:    true,
		},
		{
			ID:        "HZ-JRB-001",
			Type:      models.HazardTypeAccident,
			Latitude:  26.0150,
			Longitude: 91.8833,
			RadiusM:   1000,
			Severity:  models.SeverityMedium,
			Reason:    "Multi-vehicle collision near Jorabat junction",
			Active:    true,
		},
		{
			ID:        "HZ-BYR-002",
			Type:      models.HazardTypeConstruction,
			Latitude:  25.9833,
			Longitude: 91.9000,
			RadiusM:   1500,
			Severity:  models.SeverityLow,
			Reason:    "Highway expansion & road resurfacing work",
			Active:    true,
		},
		{
			ID:        "HZ-NONG-003",
			Type:      models.HazardTypeFlood,
			Latitude:  25.9165,
			Longitude: 91.8752,
			RadiusM:   2000,
			Severity:  models.SeverityHigh,
			Reason:    "Flash flooding & waterlogging near Nongpoh market",
			Active:    true,
		},
		{
			ID:        "HZ-UMI-004",
			Type:      models.HazardTypeLandslide,
			Latitude:  25.6667,
			Longitude: 91.8833,
			RadiusM:   2500,
			Severity:  models.SeverityHigh,
			Reason:    "Mudslide & rockfall warning near Umiam lake viewpoints",
			Active:    true,
		},
		{
			ID:        "HZ-RANI-005",
			Type:      models.HazardTypeFlood,
			Latitude:  26.0800,
			Longitude: 91.6300,
			RadiusM:   2000,
			Severity:  models.SeverityLow,
			Reason:    "Waterlogging near Rani reserve forest (off primary NH6 highway)",
			Active:    true,
		},
		{
			ID:        "HZ-BAJ-006",
			Type:      models.HazardTypeAccident,
			Latitude:  26.1440,
			Longitude: 91.7365,
			RadiusM:   1000,
			Severity:  models.SeverityHigh,
			Reason:    "Industrial accident / roadblock near Bajrang Ispat",
			Active:    true,
		},
	}
}
