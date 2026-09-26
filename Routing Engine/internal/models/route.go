package models

// Mappls API Response Structs

type MapplsRouteResponse struct {
	Code    string        `json:"code"`
	Message string        `json:"message,omitempty"`
	Routes  []MapplsRoute `json:"routes"`
}

type MapplsRoute struct {
	Distance float64     `json:"distance"`
	Duration float64     `json:"duration"`
	Geometry string      `json:"geometry"` // Encoded polyline
	Legs     []MapplsLeg `json:"legs"`
}

type MapplsLeg struct {
	Distance float64      `json:"distance"`
	Duration float64      `json:"duration"`
	Summary  string       `json:"summary"`
	Steps    []MapplsStep `json:"steps"`
}

type MapplsStep struct {
	Distance    float64        `json:"distance"`
	Duration    float64        `json:"duration"`
	Name        string         `json:"name"`
	Maneuver    MapplsManeuver `json:"maneuver"`
	Instruction string         `json:"instruction,omitempty"`
}

type MapplsManeuver struct {
	Type         string    `json:"type"`
	Modifier     string    `json:"modifier,omitempty"`
	Location     []float64 `json:"location"` // [lng, lat]
	BearingAfter int       `json:"bearing_after,omitempty"`
}

// Clean Frontend Response Structs (NERA RouteResult)

type Coordinate struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

type RouteResult struct {
	Distance    float64      `json:"distance"`
	Duration    float64      `json:"duration"`
	Summary     string       `json:"summary"`
	Polyline    string       `json:"polyline"`
	Coordinates []Coordinate `json:"coordinates"`
	Steps       []RouteStep  `json:"steps"`
	Language    string       `json:"language,omitempty"`
}

type RouteStep struct {
	Name        string         `json:"name"`
	Distance    float64        `json:"distance"`
	Duration    float64        `json:"duration"`
	Instruction string         `json:"instruction"`
	Maneuver    MapplsManeuver `json:"maneuver"`
}

// RouteConstraint defines requirements or restrictions for a routing engine.
// This abstraction allows future custom road-graph routers to avoid specific segments.
type RouteConstraint struct {
	BlockedSegmentIDs []string `json:"blocked_segment_ids,omitempty"`
}

type SafeRouteResponse struct {
	PrimaryRoute       *RouteResult         `json:"primary_route"`
	AlternateSafeRoute *RouteResult         `json:"alternate_safe_route,omitempty"`
	AvoidedHazards     []HazardIntersection `json:"avoided_hazards"`
	SelectionReason    string               `json:"selection_reason,omitempty"`
	Language           string               `json:"language,omitempty"`
}
