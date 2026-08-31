import React from 'react';
import { Navigation, Compass, X, StopCircle } from 'lucide-react';
import { formatDistance, formatDuration } from '../services/mapplsRouteService';
import type { RouteResult } from '../services/mapplsRouteService';

interface TripDetailsCardProps {
  route: RouteResult;
  isJourneyActive: boolean;
  viewMode: '3d' | '2d' | 'overview';
  userSpeed: number;
  onStartJourney: () => void;
  onEndJourney: () => void;
  onToggleViewMode: () => void;
  onClose: () => void;
}

export const TripDetailsCard: React.FC<TripDetailsCardProps> = ({
  route,
  isJourneyActive,
  viewMode,
  userSpeed,
  onStartJourney,
  onEndJourney,
  onToggleViewMode,
  onClose,
}) => (
  <div className="trip-card">
    {/* Stats row */}
    <div className="trip-stats">
      <div>
        <span className="trip-time">{formatDuration(route.duration)}</span>
        <span className="trip-dist">{formatDistance(route.distance)} · {route.summary}</span>
      </div>
      <button className="trip-close" onClick={onClose}><X size={15} /></button>
    </div>

    {/* Action row */}
    <div className="trip-actions">
      {!isJourneyActive ? (
        <button className="trip-start-btn" onClick={onStartJourney}>
          <Navigation size={16} />
          Start Drive
        </button>
      ) : (
        <button className="trip-stop-btn" onClick={onEndJourney}>
          <StopCircle size={16} />
          End Drive
        </button>
      )}
      <button className="trip-view-btn" onClick={onToggleViewMode}>
        <Compass size={14} />
        {viewMode.toUpperCase()}
      </button>
    </div>

    {/* Live HUD when driving */}
    {isJourneyActive && (
      <div className="trip-hud">
        <div className="hud-stat">
          <span className="hud-val">{userSpeed > 0 ? Math.round(userSpeed) : 0}</span>
          <span className="hud-unit">km/h</span>
        </div>
        <div className="hud-stat">
          <span className="hud-val">{formatDistance(route.distance)}</span>
          <span className="hud-unit">total</span>
        </div>
        <div className="hud-stat">
          <span className="hud-val">{formatDuration(route.duration)}</span>
          <span className="hud-unit">est.</span>
        </div>
      </div>
    )}
  </div>
);
