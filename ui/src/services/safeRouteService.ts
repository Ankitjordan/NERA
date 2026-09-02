/**
 * NERA Safe Route Service — Orchestrates the Full Safe-Routing Pipeline
 *
 * Flow (step0.md section 9, 10, 11):
 *   1. Take baseline route + origin + destination
 *   2. Run risk analysis → get avoid zones + bypass waypoints
 *   3. If bypass needed → call Mappls with multi-point routing (A → Waypoint → B)
 *   4. Validate final route against AVOID zones
 *   5. Return safe route + risk analysis
 *
 * This is GENERIC — works for any origin/destination/route.
 */

import { analyzeRouteRisks, validateRouteAgainstAvoidZones } from './riskEngine';
import type { RouteRiskAnalysis } from './riskEngine';
import type { RouteResult } from './mapplsRouteService';

export interface SafeRouteResult {
  safeRoute: RouteResult;
  riskAnalysis: RouteRiskAnalysis;
  bypassUsed: { lat: number; lng: number } | null;
  isValidated: boolean;
  validationViolations: string[];
}

/**
 * Generate a safe route that avoids identified hazard zones.
 *
 * @param baselineRoute - The primary Mappls route result
 * @param origin - Route origin coordinates
 * @param destination - Route destination coordinates
 * @param token - Mappls access token
 * @param corridorBufferKm - How far from the route to look for hazards (default 15km)
 * @returns SafeRouteResult or null if no hazards found
 */
export async function generateSafeRoute(
  baselineRoute: RouteResult,
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  corridorBufferKm: number = 15
): Promise<SafeRouteResult | null> {
  // Step 1: Run risk analysis on baseline route
  const riskAnalysis = analyzeRouteRisks(baselineRoute.coordinates, corridorBufferKm);

  // If no bypass waypoints needed, return null (baseline is safe enough)
  if (riskAnalysis.bypassWaypoints.length === 0) {
    console.log('[NERA Safe Route] No bypass needed — baseline route is clear of AVOID zones.');

    // Still return the analysis so the UI can show CAUTION zones
    if (riskAnalysis.cautionZones.length > 0 || riskAnalysis.avoidZones.length > 0) {
      return {
        safeRoute: baselineRoute, // no change to route
        riskAnalysis,
        bypassUsed: null,
        isValidated: true,
        validationViolations: [],
      };
    }
    return null;
  }

  // Step 2: Use the first bypass waypoint (could extend to try multiple)
  const waypoint = riskAnalysis.bypassWaypoints[0];
  console.log(`[NERA Safe Route] Generating bypass route via waypoint:`, waypoint);

  // Step 3: Call Mappls multi-point routing: A → Waypoint → B
  try {
    const safeRoute = await fetchMultiPointRoute(origin, waypoint, destination);

    // Step 4: Validate route against AVOID zones
    const validation = validateRouteAgainstAvoidZones(safeRoute.coordinates, riskAnalysis.avoidZones);

    if (!validation.valid) {
      console.warn(`[NERA Safe Route] WARNING: Safe route still intersects AVOID zones:`, validation.violations);
      // In a production system, try next bypass candidate. For MVP, return with warning.
    }

    return {
      safeRoute,
      riskAnalysis,
      bypassUsed: { lat: waypoint.lat, lng: waypoint.lng },
      isValidated: validation.valid,
      validationViolations: validation.violations,
    };
  } catch (err) {
    console.error('[NERA Safe Route] Failed to generate bypass route:', err);

    // Fallback: return the risk analysis without a modified route
    return {
      safeRoute: baselineRoute,
      riskAnalysis,
      bypassUsed: null,
      isValidated: false,
      validationViolations: ['BYPASS_ROUTE_FAILED'],
    };
  }
}

/**
 * Fetch a route from Mappls using multi-point routing: A → Via → B
 * Now proxied through the Go Backend.
 */
async function fetchMultiPointRoute(
  origin: { lat: number; lng: number },
  via: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<RouteResult> {
  const waypoints = `${origin.lng},${origin.lat};${via.lng},${via.lat};${destination.lng},${destination.lat}`;

  const queryParams = new URLSearchParams({
    waypoints: waypoints,
    profile: 'driving'
  });

  const path = `/api/v1/route?${queryParams.toString()}`;

  const res = await fetch(path);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Route error ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  if (!data || !data.coordinates || data.coordinates.length === 0) {
    throw new Error('No bypass route found.');
  }

  return data as RouteResult;
}
