package hazard

import (
	"fmt"
	"math"

	"routing-engine/internal/models"
	"routing-engine/internal/utils"
)

// EvaluateRiskDecision applies deterministic risk classification rules to a hazard.
func EvaluateRiskDecision(h models.Hazard, intersects bool) (models.RiskAction, string) {
	if !intersects {
		return models.RiskActionSafe, "Hazard does not intersect route"
	}

	// Active road closures are always hard AVOID
	if h.Type == models.HazardTypeRoadClosure {
		return models.RiskActionAvoid, fmt.Sprintf("Active %s blocking route corridor", h.Type)
	}

	// High severity hazards intersecting route are AVOID
	if h.Severity == models.SeverityHigh {
		return models.RiskActionAvoid, fmt.Sprintf("HIGH severity %s affecting route: %s", h.Type, h.Reason)
	}

	// Moderate and low severity hazards intersecting route are CAUTION
	if h.Severity == models.SeverityMedium {
		return models.RiskActionCaution, fmt.Sprintf("MEDIUM severity %s on route (proceed with caution): %s", h.Type, h.Reason)
	}

	return models.RiskActionCaution, fmt.Sprintf("LOW severity %s near/on route: %s", h.Type, h.Reason)
}

// CheckRouteIntersections checks a set of active hazards against a route polyline,
// calculates minimum distances, and determines routing risk actions (SAFE/CAUTION/AVOID).
func CheckRouteIntersections(route []models.Coordinate, hazards []models.Hazard) models.RouteHazardReport {
	report := models.RouteHazardReport{
		TotalHazardsEvaluated: len(hazards),
		Hazards:               make([]models.HazardIntersection, 0, len(hazards)),
	}

	for _, h := range hazards {
		if !h.Active {
			continue
		}

		minDist := utils.MinDistanceToRouteM(h.Latitude, h.Longitude, route)
		intersects := minDist <= h.RadiusM

		if intersects {
			report.IntersectingCount++
		}

		action, decisionReason := EvaluateRiskDecision(h, intersects)

		switch action {
		case models.RiskActionAvoid:
			report.AvoidCount++
		case models.RiskActionCaution:
			report.CautionCount++
		case models.RiskActionSafe:
			report.SafeCount++
		}

		roundedMinDist := math.Round(minDist*100) / 100

		report.Hazards = append(report.Hazards, models.HazardIntersection{
			ID:              h.ID,
			Type:            h.Type,
			Severity:        h.Severity,
			RadiusM:         h.RadiusM,
			MinDistanceM:    roundedMinDist,
			IntersectsRoute: intersects,
			Action:          action,
			Reason:          decisionReason,
		})
	}

	return report
}
