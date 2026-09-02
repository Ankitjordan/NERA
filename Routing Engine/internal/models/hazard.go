package models

// HazardType represents the type of a road hazard.
type HazardType string

const (
	HazardTypeFlood        HazardType = "FLOOD"
	HazardTypeConstruction HazardType = "CONSTRUCTION"
	HazardTypeAccident     HazardType = "ACCIDENT"
	HazardTypeLandslide    HazardType = "LANDSLIDE"
	HazardTypeRoadClosure  HazardType = "ROAD_CLOSURE"
)

// HazardSeverity represents the severity level of a hazard.
type HazardSeverity string

const (
	SeverityLow    HazardSeverity = "LOW"
	SeverityMedium HazardSeverity = "MEDIUM"
	SeverityHigh   HazardSeverity = "HIGH"
)

// Hazard represents a geographical risk area.
type Hazard struct {
	ID        string         `json:"id"`
	Type      HazardType     `json:"type"`
	Latitude  float64        `json:"latitude"`
	Longitude float64        `json:"longitude"`
	RadiusM   float64        `json:"radius_m"`
	Severity  HazardSeverity `json:"severity"`
	Reason    string         `json:"reason"`
	Active    bool           `json:"active"`
}

// IsValid checks if the required fields of a Hazard are valid.
func (h *Hazard) IsValid() bool {
	if h.ID == "" {
		return false
	}
	if h.Latitude < -90 || h.Latitude > 90 {
		return false
	}
	if h.Longitude < -180 || h.Longitude > 180 {
		return false
	}
	if h.RadiusM <= 0 {
		return false
	}
	if h.Type == "" || h.Severity == "" {
		return false
	}
	return true
}
