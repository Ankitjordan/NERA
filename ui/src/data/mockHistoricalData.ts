/**
 * Mock Historical Hazard Database for NERA
 * 
 * This module provides simulated historical incident data and current conditions
 * for hazard areas across North-East India route corridors.
 * 
 * Architecture note (from step0.md):
 *   - Historical data = EVIDENCE (not the final decision)
 *   - Current data + Historical data → Risk Model → SAFE / CAUTION / AVOID
 *   - This mock replaces a real database/API — swap this out when real data is available
 * 
 * The system is generic: it works for any route by checking which hazard areas
 * fall within the journey corridor. Demo data focuses on Guwahati–Shillong.
 */

// ── Types ──────────────────────────────────────────────────────────

export type IncidentType =
  | 'FLOODING'
  | 'LANDSLIDE'
  | 'ACCIDENT'
  | 'ROAD_CLOSURE'
  | 'CONSTRUCTION'
  | 'TRAFFIC_CONGESTION'
  | 'WEATHER_DISRUPTION';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface HistoricalIncident {
  type: IncidentType;
  count: number;           // occurrences in last 12 months
  severity: SeverityLevel;
  last_occurrence: string; // ISO date string
}

export interface CurrentConditions {
  heavy_rainfall: boolean;
  active_closure: boolean;
  construction: boolean;
  flooding_reported: boolean;
  landslide_reported: boolean;
  traffic_congestion: 'NONE' | 'LOW' | 'MODERATE' | 'HEAVY' | 'GRIDLOCK';
  visibility: 'GOOD' | 'MODERATE' | 'POOR';
}

export interface HazardArea {
  area_id: string;
  name: string;
  center: { lat: number; lng: number };
  radius_km: number;
  historical_incidents: HistoricalIncident[];
  current_conditions: CurrentConditions;
}

// ── Default (clear) current conditions ─────────────────────────────

const CLEAR_CONDITIONS: CurrentConditions = {
  heavy_rainfall: false,
  active_closure: false,
  construction: false,
  flooding_reported: false,
  landslide_reported: false,
  traffic_congestion: 'NONE',
  visibility: 'GOOD',
};

// ── Mock Hazard Areas Database ─────────────────────────────────────
// Covers the Guwahati–Shillong corridor and broader NE India routes

export const HAZARD_AREAS_DB: HazardArea[] = [
  // ─── Guwahati – Shillong Corridor ──────────────────────────────
  {
    area_id: 'nongpoh_flood_zone',
    name: 'Nongpoh Flood Zone',
    center: { lat: 25.9167, lng: 91.8750 },
    radius_km: 5,
    historical_incidents: [
      { type: 'FLOODING', count: 12, severity: 'HIGH', last_occurrence: '2026-07-15' },
      { type: 'LANDSLIDE', count: 4, severity: 'MEDIUM', last_occurrence: '2026-06-20' },
    ],
    current_conditions: {
      ...CLEAR_CONDITIONS,
      heavy_rainfall: true,
      flooding_reported: true,
      traffic_congestion: 'MODERATE',
      visibility: 'POOR',
    },
  },
  {
    area_id: 'jorabat_accident_hotspot',
    name: 'Jorabat Junction Accident Hotspot',
    center: { lat: 26.0150, lng: 91.8833 },
    radius_km: 3,
    historical_incidents: [
      { type: 'ACCIDENT', count: 18, severity: 'HIGH', last_occurrence: '2026-08-25' },
      { type: 'TRAFFIC_CONGESTION', count: 30, severity: 'MEDIUM', last_occurrence: '2026-08-30' },
    ],
    current_conditions: {
      ...CLEAR_CONDITIONS,
      traffic_congestion: 'HEAVY',
    },
  },
  {
    area_id: 'umiam_landslide_zone',
    name: 'Umiam Lake Landslide Zone',
    center: { lat: 25.6667, lng: 91.8833 },
    radius_km: 4,
    historical_incidents: [
      { type: 'LANDSLIDE', count: 8, severity: 'HIGH', last_occurrence: '2026-07-28' },
      { type: 'ROAD_CLOSURE', count: 3, severity: 'CRITICAL', last_occurrence: '2026-07-29' },
    ],
    current_conditions: {
      ...CLEAR_CONDITIONS,
      heavy_rainfall: true,
      landslide_reported: true,
      visibility: 'POOR',
    },
  },
  {
    area_id: 'byrnihat_construction',
    name: 'Byrnihat Industrial Area Construction',
    center: { lat: 25.9833, lng: 91.9000 },
    radius_km: 3,
    historical_incidents: [
      { type: 'CONSTRUCTION', count: 5, severity: 'MEDIUM', last_occurrence: '2026-08-01' },
      { type: 'TRAFFIC_CONGESTION', count: 15, severity: 'LOW', last_occurrence: '2026-08-28' },
    ],
    current_conditions: {
      ...CLEAR_CONDITIONS,
      construction: true,
      traffic_congestion: 'MODERATE',
    },
  },

  // ─── Broader NE India Hazard Areas ─────────────────────────────
  {
    area_id: 'silchar_flood_zone',
    name: 'Silchar-Cachar Flood Plain',
    center: { lat: 24.8333, lng: 92.7789 },
    radius_km: 8,
    historical_incidents: [
      { type: 'FLOODING', count: 15, severity: 'CRITICAL', last_occurrence: '2026-06-18' },
      { type: 'ROAD_CLOSURE', count: 6, severity: 'HIGH', last_occurrence: '2026-06-19' },
    ],
    current_conditions: {
      ...CLEAR_CONDITIONS,
      heavy_rainfall: true,
      flooding_reported: true,
      active_closure: true,
      traffic_congestion: 'GRIDLOCK',
      visibility: 'POOR',
    },
  },
  {
    area_id: 'dimapur_kohima_landslide',
    name: 'Dimapur-Kohima NH29 Landslide Belt',
    center: { lat: 25.8500, lng: 93.7400 },
    radius_km: 6,
    historical_incidents: [
      { type: 'LANDSLIDE', count: 10, severity: 'HIGH', last_occurrence: '2026-07-10' },
      { type: 'ROAD_CLOSURE', count: 4, severity: 'HIGH', last_occurrence: '2026-07-11' },
    ],
    current_conditions: {
      ...CLEAR_CONDITIONS,
      heavy_rainfall: true,
      landslide_reported: true,
    },
  },
  {
    area_id: 'imphal_moreh_construction',
    name: 'Imphal-Moreh Highway Construction',
    center: { lat: 24.6000, lng: 94.1000 },
    radius_km: 5,
    historical_incidents: [
      { type: 'CONSTRUCTION', count: 8, severity: 'MEDIUM', last_occurrence: '2026-08-15' },
      { type: 'ACCIDENT', count: 6, severity: 'MEDIUM', last_occurrence: '2026-08-10' },
    ],
    current_conditions: {
      ...CLEAR_CONDITIONS,
      construction: true,
      traffic_congestion: 'MODERATE',
    },
  },
  {
    area_id: 'tezpur_bridge_closure',
    name: 'Tezpur Kalia Bhomora Bridge',
    center: { lat: 26.6338, lng: 92.7838 },
    radius_km: 2,
    historical_incidents: [
      { type: 'ROAD_CLOSURE', count: 3, severity: 'HIGH', last_occurrence: '2026-05-20' },
      { type: 'TRAFFIC_CONGESTION', count: 20, severity: 'MEDIUM', last_occurrence: '2026-08-29' },
    ],
    current_conditions: {
      ...CLEAR_CONDITIONS,
      active_closure: true,
    },
  },
  {
    area_id: 'kaziranga_flood',
    name: 'Kaziranga NH37 Flood Zone',
    center: { lat: 26.5775, lng: 93.1711 },
    radius_km: 7,
    historical_incidents: [
      { type: 'FLOODING', count: 9, severity: 'HIGH', last_occurrence: '2026-07-05' },
      { type: 'WEATHER_DISRUPTION', count: 5, severity: 'MEDIUM', last_occurrence: '2026-07-06' },
    ],
    current_conditions: {
      ...CLEAR_CONDITIONS,
      heavy_rainfall: true,
    },
  },
  {
    area_id: 'siliguri_chicken_neck',
    name: 'Siliguri Corridor (Chicken Neck)',
    center: { lat: 26.7271, lng: 88.3953 },
    radius_km: 4,
    historical_incidents: [
      { type: 'TRAFFIC_CONGESTION', count: 25, severity: 'HIGH', last_occurrence: '2026-08-30' },
      { type: 'ACCIDENT', count: 12, severity: 'MEDIUM', last_occurrence: '2026-08-22' },
    ],
    current_conditions: {
      ...CLEAR_CONDITIONS,
      traffic_congestion: 'HEAVY',
    },
  },
];

/**
 * Fetch all known hazard areas.
 * In a real system, this would be an API call to the backend database.
 * The generic system doesn't filter here — the riskEngine's corridor
 * extraction handles relevance filtering for any given route.
 */
export function fetchHazardAreas(): HazardArea[] {
  return HAZARD_AREAS_DB;
}
