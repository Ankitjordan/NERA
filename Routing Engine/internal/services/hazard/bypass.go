package hazard

import (
	"math"

	"routing-engine/internal/models"
	"routing-engine/internal/utils"
)

// GenerateBypassWaypoints calculates candidate bypass waypoints for an AVOID hazard.
func GenerateBypassWaypoints(route []models.Coordinate, h models.Hazard) []models.Coordinate {
	var candidates []models.Coordinate

	// Generate radial candidates around the hazard.
	offsetMeters := h.RadiusM + 2000.0

	// Roughly convert offset in meters to degrees
	latRad := h.Latitude * math.Pi / 180.0
	metersPerLat := 111132.92 - 559.82*math.Cos(2*latRad) + 1.175*math.Cos(4*latRad)
	metersPerLng := 111412.84*math.Cos(latRad) - 93.5*math.Cos(3*latRad)

	offsetDegLat := offsetMeters / metersPerLat
	offsetDegLng := offsetMeters / metersPerLng

	// Generate 8 points around the hazard
	for angle := 0.0; angle < 360.0; angle += 45.0 {
		rad := angle * math.Pi / 180.0
		cand := models.Coordinate{
			Lat: h.Latitude + math.Sin(rad)*offsetDegLat,
			Lng: h.Longitude + math.Cos(rad)*offsetDegLng,
		}
		candidates = append(candidates, cand)
	}

	// Sort candidates by distance to the route's midpoint to prioritize reasonable detours
	if len(route) >= 2 {
		routeMidLat := (route[0].Lat + route[len(route)-1].Lat) / 2.0
		routeMidLng := (route[0].Lng + route[len(route)-1].Lng) / 2.0

		for i := 0; i < len(candidates)-1; i++ {
			for j := i + 1; j < len(candidates); j++ {
				d1 := utils.HaversineDistanceM(candidates[i].Lat, candidates[i].Lng, routeMidLat, routeMidLng)
				d2 := utils.HaversineDistanceM(candidates[j].Lat, candidates[j].Lng, routeMidLat, routeMidLng)
				if d1 > d2 {
					// Swap
					tmp := candidates[i]
					candidates[i] = candidates[j]
					candidates[j] = tmp
				}
			}
		}
	}

	return candidates
}
