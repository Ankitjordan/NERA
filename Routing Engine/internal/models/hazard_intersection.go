package models

// RiskAction represents the routing risk decision for a hazard.
type RiskAction string

const (
	RiskActionSafe    RiskAction = "SAFE"
	RiskActionCaution RiskAction = "CAUTION"
	RiskActionAvoid   RiskAction = "AVOID"
)

// HazardIntersection represents the evaluated risk decision for a hazard against a route.
type HazardIntersection struct {
	ID              string         `json:"id"`
	Type            HazardType     `json:"type"`
	Severity        HazardSeverity `json:"severity"`
	RadiusM         float64        `json:"radius_m"`
	MinDistanceM    float64        `json:"min_distance_m"`
	IntersectsRoute bool           `json:"intersects_route"`
	Action          RiskAction     `json:"action"`
	Reason          string         `json:"reason"`
}

// RouteHazardReport represents the full risk decision report for a route.
type RouteHazardReport struct {
	TotalHazardsEvaluated int                  `json:"total_hazards_evaluated"`
	IntersectingCount     int                  `json:"intersecting_count"`
	AvoidCount            int                  `json:"avoid_count"`
	CautionCount          int                  `json:"caution_count"`
	SafeCount             int                  `json:"safe_count"`
	Hazards               []HazardIntersection `json:"hazards"`
}
