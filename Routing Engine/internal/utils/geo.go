package utils

import (
	"math"

	"routing-engine/internal/models"
)

const EarthRadiusMeters = 6371000.0

// HaversineDistanceM calculates the great-circle distance between two points in meters.
func HaversineDistanceM(lat1, lon1, lat2, lon2 float64) float64 {
	dLat := (lat2 - lat1) * math.Pi / 180.0
	dLon := (lon2 - lon1) * math.Pi / 180.0

	rLat1 := lat1 * math.Pi / 180.0
	rLat2 := lat2 * math.Pi / 180.0

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(rLat1)*math.Cos(rLat2)*math.Sin(dLon/2)*math.Sin(dLon/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return EarthRadiusMeters * c
}

// MinDistanceToRouteM calculates the minimum distance in meters between a hazard center and a route polyline.
// It checks distance to all vertices and line segments.
func MinDistanceToRouteM(hazardLat, hazardLng float64, route []models.Coordinate) float64 {
	if len(route) == 0 {
		return math.Inf(1)
	}
	if len(route) == 1 {
		return HaversineDistanceM(hazardLat, hazardLng, route[0].Lat, route[0].Lng)
	}

	minDist := math.Inf(1)

	for i := 0; i < len(route); i++ {
		d := HaversineDistanceM(hazardLat, hazardLng, route[i].Lat, route[i].Lng)
		if d < minDist {
			minDist = d
		}

		// Also check segment interpolation if points are spaced apart
		if i > 0 {
			segDist := pointToSegmentDistanceM(hazardLat, hazardLng, route[i-1], route[i])
			if segDist < minDist {
				minDist = segDist
			}
		}
	}

	return minDist
}

// pointToSegmentDistanceM projects the point onto the segment [p1, p2] using local equirectangular approximation.
func pointToSegmentDistanceM(pLat, pLng float64, p1, p2 models.Coordinate) float64 {
	// Local flat-earth projection centered at p1
	latMid := (p1.Lat + p2.Lat) / 2.0 * math.Pi / 180.0
	kx := EarthRadiusMeters * math.Cos(latMid) * (math.Pi / 180.0)
	ky := EarthRadiusMeters * (math.Pi / 180.0)

	dx := (p2.Lng - p1.Lng) * kx
	dy := (p2.Lat - p1.Lat) * ky

	segLenSq := dx*dx + dy*dy
	if segLenSq == 0 {
		return HaversineDistanceM(pLat, pLng, p1.Lat, p1.Lng)
	}

	px := (pLng - p1.Lng) * kx
	py := (pLat - p1.Lat) * ky

	// Projection factor t
	t := (px*dx + py*dy) / segLenSq
	if t < 0 {
		t = 0
	} else if t > 1 {
		t = 1
	}

	projX := t * dx
	projY := t * dy

	distSq := (px-projX)*(px-projX) + (py-projY)*(py-projY)
	return math.Sqrt(distSq)
}
