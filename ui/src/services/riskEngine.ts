/**
 * NERA Risk Engine — Deterministic Rules-Based Risk Assessment
 *
 * Implements the pipeline from step0.md sections 5–11:
 *   1. Corridor Extraction — find hazard areas near the route
 *   2. Risk Assessment — deterministic rules (SAFE / CAUTION / AVOID)
 *   3. Route-Hazard Intersection — does the route pass through AVOID zones?
 *   4. Bypass Waypoint Generation — compute waypoints outside hazard polygons
 *
 * Architecture principle:
 *   AI/Risk Layer = WHAT + WHY
 *   Routing Engine = HOW
 *   Map/GIS = WHERE
 *   Historical + Current Data = EVIDENCE
 *
 * This module is GENERIC — it works for any route coordinates + any hazard dataset.
 * Swap `fetchHazardAreas()` with a real API when available.
 */

import type { HazardArea, HistoricalIncident } from '../data/mockHistoricalData';
import { fetchHazardAreas } from '../data/mockHistoricalData';

// ── Types ──────────────────────────────────────────────────────────

export type RiskClass = 'SAFE' | 'CAUTION' | 'AVOID';

export interface RiskAssessment {
  area_id: string;
  name: string;
  center: { lat: number; lng: number };
  radius_km: number;
  risk_score: number;     // 0.0 – 1.0
  risk_class: RiskClass;
  confidence: number;     // 0.0 – 1.0
  reasons: string[];
  reason_codes: string[];
}

export interface BypassWaypoint {
  lat: number;
  lng: number;
  generated_for: string; // area_id it's bypassing
}

export interface RouteRiskAnalysis {
  assessments: RiskAssessment[];
  avoidZones: RiskAssessment[];
  cautionZones: RiskAssessment[];
  safeZones: RiskAssessment[];
  bypassWaypoints: BypassWaypoint[];
  corridorRadiusKm: number;
}

// ── Geo Utilities ──────────────────────────────────────────────────

const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_KM = 6371;

/**
 * Haversine distance between two lat/lng points in km.
 */
function haversineDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) *
    Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Minimum distance (km) from a point to any point on a polyline.
 */
function minDistanceToPolylineKm(
  pointLat: number, pointLng: number,
  polyline: {lat: number; lng: number}[]
): number {
  let minDist = Infinity;
  for (const {lat, lng} of polyline) {
    const d = haversineDistanceKm(pointLat, pointLng, lat, lng);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/**
 * Check if any point on the route polyline falls within a circle
 * defined by center + radius.
 */
function doesRouteIntersectCircle(
  routeCoords: {lat: number; lng: number}[],
  centerLat: number, centerLng: number,
  radiusKm: number
): boolean {
  for (const {lat, lng} of routeCoords) {
    if (haversineDistanceKm(lat, lng, centerLat, centerLng) <= radiusKm) {
      return true;
    }
  }
  return false;
}

// ── Step 1: Corridor Extraction ────────────────────────────────────

/**
 * Find all hazard areas within `corridorBufferKm` of the route polyline.
 * This implements step0.md section 7 — Journey Corridor.
 */
function extractCorridorHazards(
  routeCoords: {lat: number; lng: number}[],
  hazardAreas: HazardArea[],
  corridorBufferKm: number
): HazardArea[] {
  return hazardAreas.filter(area => {
    const dist = minDistanceToPolylineKm(area.center.lat, area.center.lng, routeCoords);
    // Area is relevant if its center is within corridor buffer + its own radius
    return dist <= (corridorBufferKm + area.radius_km);
  });
}

// ── Step 2: Risk Assessment (Deterministic Rules) ──────────────────

/**
 * Evaluate a single hazard area using deterministic rules.
 * Implements step0.md section 6 — Risk Features.
 *
 * Rules:
 *   AVOID if: verified_closure OR (heavy_rainfall + high_historical_flood_freq)
 *             OR (landslide_reported + high_historical_landslide_freq)
 *   CAUTION if: construction OR (heavy_traffic + historical_accidents)
 *               OR (moderate conditions with historical evidence)
 *   SAFE otherwise
 */
function assessAreaRisk(area: HazardArea): RiskAssessment {
  const { current_conditions: cc, historical_incidents: hist } = area;
  const reasons: string[] = [];
  const reason_codes: string[] = [];
  let riskScore = 0;
  let confidence = 0.5; // base confidence

  // Helper: get historical count for a type
  const getHistCount = (type: string): number =>
    hist.filter((h: HistoricalIncident) => h.type === type).reduce((sum: number, h: HistoricalIncident) => sum + h.count, 0);


  // ── HARD AVOID rules ───────────────────────────────────────────

  // Rule 1: Verified road closure
  if (cc.active_closure) {
    riskScore = Math.max(riskScore, 0.95);
    confidence = Math.max(confidence, 0.95);
    reasons.push('Verified road closure currently active');
    reason_codes.push('ACTIVE_CLOSURE');
  }

  // Rule 2: Current flooding + historical flood pattern
  if (cc.flooding_reported || (cc.heavy_rainfall && getHistCount('FLOODING') >= 5)) {
    const floodCount = getHistCount('FLOODING');
    const score = cc.flooding_reported ? 0.92 : 0.85;
    riskScore = Math.max(riskScore, score);
    confidence = Math.max(confidence, cc.flooding_reported ? 0.90 : 0.80);
    reasons.push(
      cc.flooding_reported
        ? `Active flooding reported (${floodCount} historical incidents)`
        : `Heavy rainfall + high historical flooding (${floodCount} past incidents)`
    );
    reason_codes.push('FLOODING');
    if (cc.heavy_rainfall) reason_codes.push('HEAVY_RAIN');
  }

  // Rule 3: Current landslide + historical pattern
  if (cc.landslide_reported || (cc.heavy_rainfall && getHistCount('LANDSLIDE') >= 4)) {
    const lsCount = getHistCount('LANDSLIDE');
    const score = cc.landslide_reported ? 0.91 : 0.82;
    riskScore = Math.max(riskScore, score);
    confidence = Math.max(confidence, cc.landslide_reported ? 0.88 : 0.75);
    reasons.push(
      cc.landslide_reported
        ? `Landslide reported (${lsCount} historical incidents)`
        : `Heavy rainfall + landslide-prone area (${lsCount} past incidents)`
    );
    reason_codes.push('LANDSLIDE');
  }

  // ── CAUTION rules ──────────────────────────────────────────────

  // Rule 4: Construction zone
  if (cc.construction) {
    riskScore = Math.max(riskScore, 0.55);
    confidence = Math.max(confidence, 0.85);
    reasons.push('Active construction zone');
    reason_codes.push('CONSTRUCTION');
  }

  // Rule 5: Heavy traffic + accident history
  if (
    (cc.traffic_congestion === 'HEAVY' || cc.traffic_congestion === 'GRIDLOCK') &&
    getHistCount('ACCIDENT') >= 5
  ) {
    const accCount = getHistCount('ACCIDENT');
    riskScore = Math.max(riskScore, 0.60);
    confidence = Math.max(confidence, 0.78);
    reasons.push(`Heavy traffic congestion + accident-prone (${accCount} past accidents)`);
    reason_codes.push('TRAFFIC_ACCIDENTS');
  }

  // Rule 6: Moderate traffic + moderate history
  if (
    cc.traffic_congestion === 'MODERATE' &&
    (getHistCount('TRAFFIC_CONGESTION') >= 10 || getHistCount('ACCIDENT') >= 3)
  ) {
    riskScore = Math.max(riskScore, 0.45);
    confidence = Math.max(confidence, 0.70);
    reasons.push('Moderate traffic delays expected');
    reason_codes.push('TRAFFIC_CONGESTION');
  }

  // Rule 7: Poor visibility
  if (cc.visibility === 'POOR') {
    riskScore = Math.max(riskScore, 0.40);
    confidence = Math.max(confidence, 0.65);
    reasons.push('Poor visibility conditions');
    reason_codes.push('POOR_VISIBILITY');
  }

  // ── Classify ───────────────────────────────────────────────────
  let risk_class: RiskClass;
  if (riskScore >= 0.75) {
    risk_class = 'AVOID';
  } else if (riskScore >= 0.40) {
    risk_class = 'CAUTION';
  } else {
    risk_class = 'SAFE';
    if (reasons.length === 0) {
      reasons.push('No significant risks detected');
      reason_codes.push('CLEAR');
    }
    confidence = Math.max(confidence, 0.90);
  }

  return {
    area_id: area.area_id,
    name: area.name,
    center: area.center,
    radius_km: area.radius_km,
    risk_score: Math.round(riskScore * 100) / 100,
    risk_class,
    confidence: Math.round(confidence * 100) / 100,
    reasons,
    reason_codes,
  };
}

// ── Step 3 & 4: Intersection Detection + Bypass Waypoints ──────────

/**
 * For each AVOID zone that the route actually passes through,
 * generate a bypass waypoint outside the hazard polygon.
 *
 * Strategy: move the bypass point perpendicular to the route direction
 * at the point closest to the hazard center, offset by (radius + buffer).
 */
function generateBypassWaypoints(
  routeCoords: {lat: number; lng: number}[],
  avoidZones: RiskAssessment[]
): BypassWaypoint[] {
  const waypoints: BypassWaypoint[] = [];

  for (const zone of avoidZones) {
    // Check if route actually passes through this AVOID zone
    if (!doesRouteIntersectCircle(routeCoords, zone.center.lat, zone.center.lng, zone.radius_km)) {
      continue; // Route doesn't go through this zone, no bypass needed
    }

    // Find the route point closest to the hazard center
    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < routeCoords.length; i++) {
      const d = haversineDistanceKm(routeCoords[i].lat, routeCoords[i].lng, zone.center.lat, zone.center.lng);
      if (d < closestDist) {
        closestDist = d;
        closestIdx = i;
      }
    }

    // Get route direction at that point
    const prevIdx = Math.max(0, closestIdx - 5);
    const nextIdx = Math.min(routeCoords.length - 1, closestIdx + 5);
    const routeDirLat = routeCoords[nextIdx].lat - routeCoords[prevIdx].lat;
    const routeDirLng = routeCoords[nextIdx].lng - routeCoords[prevIdx].lng;

    // Perpendicular direction (rotate 90°)
    // Try both sides, pick the one further from the route's general bearing
    const perpLat = -routeDirLng;
    const perpLng = routeDirLat;

    // Normalize and scale by (radius + 3km buffer) in degrees (~0.009 per km)
    const perpLen = Math.sqrt(perpLat ** 2 + perpLng ** 2);
    if (perpLen < 1e-10) continue;

    const offsetKm = zone.radius_km + 3; // bypass radius + buffer
    const offsetDeg = offsetKm * 0.009; // approximate degrees per km

    const normLat = (perpLat / perpLen) * offsetDeg;
    const normLng = (perpLng / perpLen) * offsetDeg;

    // Generate two candidate bypass points (both sides of the route)
    const candidate1 = {
      lat: zone.center.lat + normLat,
      lng: zone.center.lng + normLng,
    };
    const candidate2 = {
      lat: zone.center.lat - normLat,
      lng: zone.center.lng - normLng,
    };

    // Pick the candidate that is further from the route center line
    // (i.e., creates a more natural detour)
    const routeMidLat = (routeCoords[0].lat + routeCoords[routeCoords.length - 1].lat) / 2;
    const routeMidLng = (routeCoords[0].lng + routeCoords[routeCoords.length - 1].lng) / 2;

    const d1 = haversineDistanceKm(candidate1.lat, candidate1.lng, routeMidLat, routeMidLng);
    const d2 = haversineDistanceKm(candidate2.lat, candidate2.lng, routeMidLat, routeMidLng);

    // Prefer the candidate that creates a wider detour
    const chosen = d1 >= d2 ? candidate1 : candidate2;

    waypoints.push({
      lat: Math.round(chosen.lat * 10000) / 10000,
      lng: Math.round(chosen.lng * 10000) / 10000,
      generated_for: zone.area_id,
    });
  }

  return waypoints;
}

// ── Main Analysis Function ─────────────────────────────────────────

/**
 * Full risk analysis pipeline for a given route.
 *
 * 1. Fetch hazard areas from the database
 * 2. Extract corridor-relevant hazards
 * 3. Assess risk for each
 * 4. Classify into SAFE / CAUTION / AVOID
 * 5. Generate bypass waypoints for AVOID zones that intersect the route
 *
 * This is GENERIC — works for any routeCoords from any origin/destination.
 */
export function analyzeRouteRisks(
  routeCoords: {lat: number; lng: number}[],
  corridorBufferKm: number = 15
): RouteRiskAnalysis {
  // Step 1: Get all known hazard areas
  const allHazards = fetchHazardAreas();

  // Step 2: Filter to corridor-relevant areas
  const corridorHazards = extractCorridorHazards(routeCoords, allHazards, corridorBufferKm);

  // Step 3: Assess risk for each
  const assessments = corridorHazards.map(assessAreaRisk);

  // Step 4: Classify
  const avoidZones = assessments.filter(a => a.risk_class === 'AVOID');
  const cautionZones = assessments.filter(a => a.risk_class === 'CAUTION');
  const safeZones = assessments.filter(a => a.risk_class === 'SAFE');

  // Step 5: Generate bypass waypoints for AVOID zones intersecting route
  const bypassWaypoints = generateBypassWaypoints(routeCoords, avoidZones);

  console.log(`[NERA Risk Engine] Corridor analysis complete:`, {
    totalHazards: allHazards.length,
    corridorRelevant: corridorHazards.length,
    avoid: avoidZones.length,
    caution: cautionZones.length,
    safe: safeZones.length,
    bypassWaypoints: bypassWaypoints.length,
  });

  return {
    assessments,
    avoidZones,
    cautionZones,
    safeZones,
    bypassWaypoints,
    corridorRadiusKm: corridorBufferKm,
  };
}

// ── Route Validation ───────────────────────────────────────────────

/**
 * Validate that a generated safe route doesn't still intersect
 * any HARD AVOID zones. (step0.md section 11)
 */
export function validateRouteAgainstAvoidZones(
  routeCoords: {lat: number; lng: number}[],
  avoidZones: RiskAssessment[]
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const zone of avoidZones) {
    if (doesRouteIntersectCircle(routeCoords, zone.center.lat, zone.center.lng, zone.radius_km)) {
      violations.push(zone.area_id);
    }
  }
  return { valid: violations.length === 0, violations };
}
