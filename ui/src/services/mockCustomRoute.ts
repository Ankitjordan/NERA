/**
 * Generates a dummy "custom" route that deviates from the shortest path.
 * This is a visual dummy route that uses a sine wave to push the coordinates 
 * outwards to create a different path that starts and ends at the same points.
 */
export function generateScenicRoute(originalCoords: {lat: number; lng: number}[]): {lat: number; lng: number}[] {
  if (!originalCoords || originalCoords.length < 5) return originalCoords;

  const customCoords: {lat: number; lng: number}[] = [];
  const totalPts = originalCoords.length;

  for (let i = 0; i < totalPts; i++) {
    const pt = originalCoords[i];
    const progress = i / (totalPts - 1);

    // Envelope so start and end have 0 offset, max offset in the middle
    const envelope = Math.sin(progress * Math.PI);

    // Apply some offset (roughly 0.05 degrees ~ 5km at max)
    // We add some high frequency noise for realism
    const noise = Math.sin(progress * Math.PI * 4) * 0.01;
    const offsetMag = (0.05 * envelope) + noise;

    // We just offset it in a fixed direction (e.g. mostly longitude or latitude)
    // To make it look like a detour
    const latOffset = Math.sin(progress * Math.PI) * offsetMag;
    const lngOffset = Math.cos(progress * Math.PI * 0.5) * offsetMag;

    customCoords.push({ lat: pt.lat + latOffset, lng: pt.lng + lngOffset });
  }

  return customCoords;
}
