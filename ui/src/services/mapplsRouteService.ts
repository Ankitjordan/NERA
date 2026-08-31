export interface PlaceSuggestion {
  eLoc: string;
  placeName: string;
  placeAddress: string;
  type: string;
  latitude?: number;
  longitude?: number;
}

export interface RouteStep {
  name: string;
  distance: number; // meters
  duration: number; // seconds
  instruction?: string;
  maneuver?: {
    type: string;
    modifier?: string;
    location?: [number, number]; // [lng, lat]
    bearing_after?: number;
  };
}

export interface RouteResult {
  distance: number; // meters
  duration: number; // seconds
  summary: string;
  polyline: string;
  coordinates: [number, number][]; // [lat, lng]
  steps: RouteStep[];
}

// In-memory cache for fast search responses without lag
const suggestCache = new Map<string, PlaceSuggestion[]>();
const geocodeCache = new Map<string, { lat: number; lng: number; formattedAddress: string }>();

// Decode Google / Mappls Encoded Polyline format
export function decodePolyline(str: string, precision: number = 5): [number, number][] {
  if (!str) return [];
  let index = 0,
    lat = 0,
    lng = 0,
    coordinates: [number, number][] = [],
    shift = 0,
    result = 0,
    byte = null,
    latitude_change,
    longitude_change,
    factor = Math.pow(10, precision);

  while (index < str.length) {
    byte = null;
    shift = 0;
    result = 0;

    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    latitude_change = (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = result = 0;

    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    longitude_change = (result & 1) ? ~(result >> 1) : (result >> 1);

    lat += latitude_change;
    lng += longitude_change;

    coordinates.push([lat / factor, lng / factor]);
  }

  return coordinates;
}

// Format duration into readable string
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours} hr ${remainingMins} min` : `${hours} hr`;
}

// Format distance into km or meters
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = (meters / 1000).toFixed(1);
  return `${km} km`;
}

// Calculate bearing between two lat/lng coordinates
export function calculateBearing(startLat: number, startLng: number, destLat: number, destLng: number): number {
  const startLatRad = (startLat * Math.PI) / 180;
  const startLngRad = (startLng * Math.PI) / 180;
  const destLatRad = (destLat * Math.PI) / 180;
  const destLngRad = (destLng * Math.PI) / 180;

  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x =
    Math.cos(startLatRad) * Math.sin(destLatRad) -
    Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);

  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

// Fetch autosuggest suggestions with caching
export async function fetchAutosuggest(
  query: string,
  token: string,
  locationBias?: { lat: number; lng: number }
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const cacheKey = `${trimmed.toLowerCase()}_${locationBias?.lat || ''}_${locationBias?.lng || ''}`;
  if (suggestCache.has(cacheKey)) {
    return suggestCache.get(cacheKey)!;
  }

  const params = new URLSearchParams({
    access_token: token,
    query: trimmed,
    region: 'IND',
  });

  if (locationBias) {
    params.set('location', `${locationBias.lat},${locationBias.lng}`);
  }

  try {
    const url = `/api/mappls-search/search/places/autosuggest/json?${params.toString()}`;
    let res = await fetch(url);
    if (!res.ok) {
      res = await fetch(`https://search.mappls.com/search/places/autosuggest/json?${params.toString()}`);
    }
    const data = await res.json();
    const suggestions: PlaceSuggestion[] = (data.suggestedLocations || []).map((item: any) => ({
      eLoc: item.eLoc || '',
      placeName: item.placeName || item.alternateName || trimmed,
      placeAddress: item.placeAddress || '',
      type: item.type || 'POI',
      latitude: item.latitude ? Number(item.latitude) : undefined,
      longitude: item.longitude ? Number(item.longitude) : undefined,
    }));

    if (suggestions.length > 0) {
      suggestCache.set(cacheKey, suggestions);
      return suggestions;
    }
  } catch (err) {
    console.warn('Mappls autosuggest error, using fallback:', err);
  }

  // Instant fallback search across Indian places if Mappls autosuggest is empty
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&limit=6&q=${encodeURIComponent(trimmed)}`;
    const nomRes = await fetch(nominatimUrl, { headers: { 'User-Agent': 'NERA-Navigator/1.0' } });
    const nomData = await nomRes.json();
    const fallbackList: PlaceSuggestion[] = (nomData || []).map((item: any) => ({
      eLoc: item.place_id ? String(item.place_id) : '',
      placeName: item.name || item.display_name.split(',')[0],
      placeAddress: item.display_name,
      type: item.type || 'CITY',
      latitude: Number(item.lat),
      longitude: Number(item.lon),
    }));

    if (fallbackList.length > 0) {
      suggestCache.set(cacheKey, fallbackList);
      return fallbackList;
    }
  } catch {}

  return [];
}

// Geocode place name or address to high-precision coordinates
export async function geocodePlace(
  addressOrName: string,
  token: string
): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
  const trimmed = addressOrName.trim();
  if (!trimmed) return null;

  const cacheKey = trimmed.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // 1. Try Mappls Geocode
  try {
    const params = new URLSearchParams({
      access_token: token,
      address: trimmed,
      itemCount: '1',
    });
    let res = await fetch(`/api/mappls-search/search/address/geocode?${params.toString()}`);
    if (!res.ok) {
      res = await fetch(`https://search.mappls.com/search/address/geocode?${params.toString()}`);
    }
    const data = await res.json();
    const result = data.copResults?.[0] || data.copResults;
    if (result && result.latitude && result.longitude) {
      const point = {
        lat: Number(result.latitude),
        lng: Number(result.longitude),
        formattedAddress: result.formattedAddress || trimmed,
      };
      geocodeCache.set(cacheKey, point);
      return point;
    }
  } catch {}

  // 2. High-precision Nominatim Geocode Fallback (always resolves any place in India/world)
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&limit=1&q=${encodeURIComponent(trimmed)}`;
    const nomRes = await fetch(nomUrl, { headers: { 'User-Agent': 'NERA-Navigator/1.0' } });
    const nomData = await nomRes.json();
    if (nomData && nomData.length > 0) {
      const point = {
        lat: Number(nomData[0].lat),
        lng: Number(nomData[0].lon),
        formattedAddress: nomData[0].display_name,
      };
      geocodeCache.set(cacheKey, point);
      return point;
    }
  } catch {}

  return null;
}

// Fetch turn-by-turn driving directions
export async function fetchRouteDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  profile: 'driving' | 'biking' | 'walking' = 'driving',
  token: string
): Promise<RouteResult> {
  const originStr = `${origin.lng},${origin.lat}`;
  const destStr = `${destination.lng},${destination.lat}`;

  const queryParams = new URLSearchParams({
    access_token: token,
    overview: 'full',
    steps: 'true',
  });

  const path = `/route/direction/route_adv/${profile}/${originStr};${destStr}?${queryParams.toString()}`;

  let res: Response;
  try {
    res = await fetch(`/api/mappls-route${path}`);
    if (!res.ok) throw new Error(`Route error ${res.status}`);
  } catch {
    res = await fetch(`https://route.mappls.com${path}`);
  }

  const data = await res.json();
  if (!data.routes || data.routes.length === 0) {
    throw new Error(data.message || 'No route found between selected locations.');
  }

  const primaryRoute = data.routes[0];
  const leg = primaryRoute.legs?.[0] || {};
  const polylineStr = primaryRoute.geometry || '';
  const decodedCoords = decodePolyline(polylineStr);

  const steps: RouteStep[] = (leg.steps || []).map((step: any) => ({
    name: step.name || 'Unnamed road',
    distance: step.distance || 0,
    duration: step.duration || 0,
    instruction:
      step.maneuver?.instruction ||
      `${step.maneuver?.type || 'proceed'} ${step.maneuver?.modifier || ''}`.trim(),
    maneuver: step.maneuver,
  }));

  return {
    distance: primaryRoute.distance || leg.distance || 0,
    duration: primaryRoute.duration || leg.duration || 0,
    summary: leg.summary || 'Fastest Route',
    polyline: polylineStr,
    coordinates: decodedCoords,
    steps,
  };
}
