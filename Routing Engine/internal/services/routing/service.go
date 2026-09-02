package routing

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"routing-engine/internal/models"
	"routing-engine/internal/utils"
)

// FetchRoute calls the Mappls API and returns a parsed RouteResult.
func FetchRoute(waypoints, profile, token string, constraint *models.RouteConstraint) (*models.RouteResult, error) {
	slog.Info("Fetching route from Mappls", slog.String("waypoints", waypoints), slog.String("profile", profile))

	// Construct Mappls URL
	mapplsURL := fmt.Sprintf("https://route.mappls.com/route/direction/route_adv/%s/%s", profile, waypoints)

	params := url.Values{}
	params.Add("access_token", token)
	params.Add("overview", "full")
	params.Add("steps", "true")

	// Apply routing constraints (Step 2H Abstraction)
	if constraint != nil && len(constraint.BlockedSegmentIDs) > 0 {
		// NOTE: Mappls standard API does not natively support passing arbitrary segment IDs or road coordinates to block.
		// It only supports high-level avoidance like 'exclude=toll' or 'avoid_polygons'.
		// This parameter acts as an abstraction for a future custom NERA road-graph router.
		slog.Warn("Mappls does not natively support blocking arbitrary Segment IDs. Constraint ignored for now.")
	}

	reqURL := fmt.Sprintf("%s?%s", mapplsURL, params.Encode())

	// Make HTTP request to Mappls
	resp, err := http.Get(reqURL)
	if err != nil {
		slog.Error("Failed to call Mappls API", slog.String("error", err.Error()))
		return nil, fmt.Errorf("failed to call routing provider: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		slog.Error("Mappls API returned error", slog.Int("status", resp.StatusCode), slog.String("body", string(body)))
		return nil, fmt.Errorf("failed to fetch route (status %d)", resp.StatusCode)
	}

	var mapplsResp models.MapplsRouteResponse
	if err := json.NewDecoder(resp.Body).Decode(&mapplsResp); err != nil {
		slog.Error("Failed to decode Mappls response", slog.String("error", err.Error()))
		return nil, fmt.Errorf("invalid response from routing provider: %w", err)
	}

	if len(mapplsResp.Routes) == 0 {
		return nil, fmt.Errorf("no route found")
	}

	primaryRoute := mapplsResp.Routes[0]
	// Determine distance and duration
	var distance float64
	var duration float64
	var steps []models.RouteStep

	for _, leg := range primaryRoute.Legs {
		distance += leg.Distance
		duration += leg.Duration

		for _, s := range leg.Steps {
			instruction := s.Instruction
			if instruction == "" {
				modifier := s.Maneuver.Modifier
				if modifier != "" {
					instruction = fmt.Sprintf("%s %s", s.Maneuver.Type, modifier)
				} else {
					instruction = s.Maneuver.Type
				}
				instruction = strings.TrimSpace(instruction)
			}

			name := s.Name
			if name == "" {
				name = "Unnamed road"
			}

			steps = append(steps, models.RouteStep{
				Name:        name,
				Distance:    s.Distance,
				Duration:    s.Duration,
				Instruction: instruction,
				Maneuver:    s.Maneuver,
			})
		}
	}

	if primaryRoute.Distance > 0 {
		distance = primaryRoute.Distance
	}
	if primaryRoute.Duration > 0 {
		duration = primaryRoute.Duration
	}

	summary := "Fastest Route"
	if len(primaryRoute.Legs) > 0 && primaryRoute.Legs[0].Summary != "" {
		summary = primaryRoute.Legs[0].Summary
	}

	// Decode polyline
	polylineStr := primaryRoute.Geometry
	coordinates := utils.DecodePolyline(polylineStr, 5)
	if coordinates == nil {
		coordinates = []models.Coordinate{}
	}

	if steps == nil {
		steps = []models.RouteStep{}
	}

	// Construct our clean response
	result := &models.RouteResult{
		Distance:    distance,
		Duration:    duration,
		Summary:     summary,
		Polyline:    polylineStr,
		Coordinates: coordinates,
		Steps:       steps,
	}

	return result, nil
}

// FetchRoutes calls the Mappls API requesting alternatives and returns a slice of parsed RouteResults.
func FetchRoutes(waypoints, profile, token string, constraint *models.RouteConstraint) ([]*models.RouteResult, error) {
	slog.Info("Fetching routes from Mappls with alternatives", slog.String("waypoints", waypoints), slog.String("profile", profile))

	// Construct Mappls URL
	mapplsURL := fmt.Sprintf("https://route.mappls.com/route/direction/route_adv/%s/%s", profile, waypoints)

	params := url.Values{}
	params.Add("access_token", token)
	params.Add("overview", "full")
	params.Add("steps", "true")
	params.Add("alternatives", "true") // Request alternatives

	// Apply routing constraints
	if constraint != nil && len(constraint.BlockedSegmentIDs) > 0 {
		slog.Warn("Mappls does not natively support blocking arbitrary Segment IDs. Constraint ignored for now.")
	}

	reqURL := fmt.Sprintf("%s?%s", mapplsURL, params.Encode())

	resp, err := http.Get(reqURL)
	if err != nil {
		slog.Error("Failed to call Mappls API", slog.String("error", err.Error()))
		return nil, fmt.Errorf("failed to call routing provider: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		slog.Error("Mappls API returned error", slog.Int("status", resp.StatusCode), slog.String("body", string(body)))
		return nil, fmt.Errorf("failed to fetch routes (status %d)", resp.StatusCode)
	}

	var mapplsResp models.MapplsRouteResponse
	if err := json.NewDecoder(resp.Body).Decode(&mapplsResp); err != nil {
		slog.Error("Failed to decode Mappls response", slog.String("error", err.Error()))
		return nil, fmt.Errorf("invalid response from routing provider: %w", err)
	}

	if len(mapplsResp.Routes) == 0 {
		return nil, fmt.Errorf("no routes found")
	}

	var results []*models.RouteResult

	for i, r := range mapplsResp.Routes {
		var distance float64
		var duration float64
		var steps []models.RouteStep

		for _, leg := range r.Legs {
			distance += leg.Distance
			duration += leg.Duration

			for _, s := range leg.Steps {
				instruction := s.Instruction
				if instruction == "" {
					modifier := s.Maneuver.Modifier
					if modifier != "" {
						instruction = fmt.Sprintf("%s %s", s.Maneuver.Type, modifier)
					} else {
						instruction = s.Maneuver.Type
					}
					instruction = strings.TrimSpace(instruction)
				}

				name := s.Name
				if name == "" {
					name = "Unnamed road"
				}

				steps = append(steps, models.RouteStep{
					Name:        name,
					Distance:    s.Distance,
					Duration:    s.Duration,
					Instruction: instruction,
					Maneuver:    s.Maneuver,
				})
			}
		}

		if r.Distance > 0 {
			distance = r.Distance
		}
		if r.Duration > 0 {
			duration = r.Duration
		}

		summary := fmt.Sprintf("Route Option %d", i+1)
		if len(r.Legs) > 0 && r.Legs[0].Summary != "" {
			summary = r.Legs[0].Summary
		}

		coordinates := utils.DecodePolyline(r.Geometry, 5)
		if coordinates == nil {
			coordinates = []models.Coordinate{}
		}
		if steps == nil {
			steps = []models.RouteStep{}
		}

		results = append(results, &models.RouteResult{
			Distance:    distance,
			Duration:    duration,
			Summary:     summary,
			Polyline:    r.Geometry,
			Coordinates: coordinates,
			Steps:       steps,
		})
	}

	return results, nil
}
