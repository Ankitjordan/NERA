import { calculateBearing } from './mapplsRouteService';

/**
 * MockDriveEngine — Animates a virtual vehicle along a polyline at a given speed.
 *
 * Uses requestAnimationFrame for smooth 60fps animation. Calculates the vehicle's
 * lat/lng by interpolating between successive route coordinate segments based on
 * elapsed real-time and the configured driving speed.
 */

export interface MockDriveState {
  lat: number;
  lng: number;
  bearing: number;       // degrees, 0 = north
  speedKmh: number;
  distanceCoveredM: number;
  totalDistanceM: number;
  progress: number;      // 0..1
  segmentIndex: number;
  finished: boolean;
}

export type MockDriveCallback = (state: MockDriveState) => void;

export class MockDriveEngine {
  private coords: [number, number][];  // [lat, lng][]
  private segDistances: number[];      // metres per segment
  private totalDistanceM: number;
  private speedKmh: number;
  private distanceCoveredM: number;
  private lastTimestamp: number | null;
  private animFrameId: number | null;
  private paused: boolean;
  private finished: boolean;
  private onUpdate: MockDriveCallback;

  constructor(coordinates: [number, number][], speedKmh: number, onUpdate: MockDriveCallback) {
    this.coords = coordinates;
    this.speedKmh = speedKmh;
    this.onUpdate = onUpdate;
    this.distanceCoveredM = 0;
    this.lastTimestamp = null;
    this.animFrameId = null;
    this.paused = false;
    this.finished = false;

    // Pre-compute segment distances using Haversine
    this.segDistances = [];
    this.totalDistanceM = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const d = haversineMeters(
        coordinates[i][0], coordinates[i][1],
        coordinates[i + 1][0], coordinates[i + 1][1]
      );
      this.segDistances.push(d);
      this.totalDistanceM += d;
    }
  }

  start(): void {
    this.finished = false;
    this.paused = false;
    this.distanceCoveredM = 0;
    this.lastTimestamp = null;
    this.tick = this.tick.bind(this);
    this.animFrameId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.finished = true;
  }

  pause(): void {
    this.paused = true;
    this.lastTimestamp = null; // reset so delta doesn't accumulate while paused
  }

  resume(): void {
    if (!this.finished) {
      this.paused = false;
      this.lastTimestamp = null;
      if (this.animFrameId === null) {
        this.animFrameId = requestAnimationFrame(this.tick);
      }
    }
  }

  setSpeed(kmh: number): void {
    this.speedKmh = Math.max(0, Math.min(kmh, 300));
  }

  getSpeed(): number {
    return this.speedKmh;
  }

  isPaused(): boolean {
    return this.paused;
  }

  isFinished(): boolean {
    return this.finished;
  }

  private tick(timestamp: number): void {
    if (this.finished) return;

    if (!this.paused && this.lastTimestamp !== null) {
      const dtSec = (timestamp - this.lastTimestamp) / 1000;
      // speed in m/s = kmh / 3.6
      const metersThisFrame = (this.speedKmh / 3.6) * dtSec;
      this.distanceCoveredM += metersThisFrame;
    }
    this.lastTimestamp = this.paused ? null : timestamp;

    if (this.distanceCoveredM >= this.totalDistanceM) {
      // Arrived at destination
      const last = this.coords[this.coords.length - 1];
      const prev = this.coords[this.coords.length - 2] || last;
      this.onUpdate({
        lat: last[0],
        lng: last[1],
        bearing: calculateBearing(prev[0], prev[1], last[0], last[1]),
        speedKmh: this.speedKmh,
        distanceCoveredM: this.totalDistanceM,
        totalDistanceM: this.totalDistanceM,
        progress: 1,
        segmentIndex: this.coords.length - 1,
        finished: true,
      });
      this.finished = true;
      this.animFrameId = null;
      return;
    }

    // Find current position by walking segments
    let remaining = this.distanceCoveredM;
    let segIdx = 0;
    while (segIdx < this.segDistances.length && remaining > this.segDistances[segIdx]) {
      remaining -= this.segDistances[segIdx];
      segIdx++;
    }

    if (segIdx >= this.segDistances.length) segIdx = this.segDistances.length - 1;

    const segLen = this.segDistances[segIdx] || 1;
    const t = Math.min(remaining / segLen, 1); // fraction along current segment

    const p1 = this.coords[segIdx];
    const p2 = this.coords[Math.min(segIdx + 1, this.coords.length - 1)];

    const lat = p1[0] + (p2[0] - p1[0]) * t;
    const lng = p1[1] + (p2[1] - p1[1]) * t;

    // Forward bearing: look ahead a few segments for smoother heading
    const lookAheadIdx = Math.min(segIdx + 3, this.coords.length - 1);
    const bearing = calculateBearing(lat, lng, this.coords[lookAheadIdx][0], this.coords[lookAheadIdx][1]);

    this.onUpdate({
      lat,
      lng,
      bearing: Math.round(bearing),
      speedKmh: this.speedKmh,
      distanceCoveredM: this.distanceCoveredM,
      totalDistanceM: this.totalDistanceM,
      progress: this.distanceCoveredM / this.totalDistanceM,
      segmentIndex: segIdx,
      finished: false,
    });

    this.animFrameId = requestAnimationFrame(this.tick);
  }
}

/** Haversine distance in metres between two lat/lng points */
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
