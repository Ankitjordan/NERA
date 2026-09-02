import React from 'react';
import { Shield, AlertTriangle, AlertOctagon, ChevronDown, ChevronUp } from 'lucide-react';
import type { RiskAssessment } from '../services/riskEngine';
import { formatDistance, formatDuration } from '../services/mapplsRouteService';
import type { RouteResult } from '../services/mapplsRouteService';

interface AvoidedAreasCardProps {
  assessments: RiskAssessment[];
  safeRoute: RouteResult | null;
  baselineRoute: RouteResult;
  bypassUsed: { lat: number; lng: number } | null;
  isValidated: boolean;
}

export const AvoidedAreasCard: React.FC<AvoidedAreasCardProps> = ({
  assessments,
  safeRoute,
  baselineRoute,
  bypassUsed,
  isValidated,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  const avoidAreas = assessments.filter(a => a.risk_class === 'AVOID');
  const cautionAreas = assessments.filter(a => a.risk_class === 'CAUTION');

  if (avoidAreas.length === 0 && cautionAreas.length === 0) return null;

  // Compute delta vs baseline
  const distDelta = safeRoute ? safeRoute.distance - baselineRoute.distance : 0;
  const durDelta = safeRoute ? safeRoute.duration - baselineRoute.duration : 0;

  return (
    <div className="avoided-areas-card">
      {/* Header */}
      <div className="avoided-header" onClick={() => setIsExpanded(prev => !prev)}>
        <div className="avoided-title-row">
          <Shield size={16} className="avoided-shield-icon" />
          <span className="avoided-title">AI Safety Analysis</span>
          <span className="avoided-badge-count">
            {avoidAreas.length > 0 && (
              <span className="badge-avoid">{avoidAreas.length} Avoid</span>
            )}
            {cautionAreas.length > 0 && (
              <span className="badge-caution">{cautionAreas.length} Caution</span>
            )}
          </span>
        </div>
        <button className="avoided-toggle">
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {isExpanded && (
        <div className="avoided-body">
          {/* Safe route stats */}
          {safeRoute && bypassUsed && (
            <div className="safe-route-stats">
              <div className="safe-route-label">
                <span className="orange-dot" />
                Recommended Safe Route
                {isValidated && <span className="validated-badge">✓ Validated</span>}
              </div>
              <div className="safe-route-numbers">
                <span>{formatDistance(safeRoute.distance)}</span>
                <span className="stat-sep">·</span>
                <span>{formatDuration(safeRoute.duration)}</span>
                {distDelta > 0 && (
                  <span className="delta-text">
                    (+{formatDistance(distDelta)}, +{formatDuration(durDelta)})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* AVOID areas list */}
          {avoidAreas.map(area => (
            <div key={area.area_id} className="risk-area-item avoid">
              <div className="risk-area-header">
                <AlertOctagon size={13} className="risk-icon-avoid" />
                <span className="risk-area-name">{area.name}</span>
                <span className="risk-score-badge avoid">
                  {Math.round(area.risk_score * 100)}%
                </span>
              </div>
              <div className="risk-reasons">
                {area.reasons.map((reason, i) => (
                  <span key={i} className="risk-reason-tag avoid">{reason}</span>
                ))}
              </div>
            </div>
          ))}

          {/* CAUTION areas list */}
          {cautionAreas.map(area => (
            <div key={area.area_id} className="risk-area-item caution">
              <div className="risk-area-header">
                <AlertTriangle size={13} className="risk-icon-caution" />
                <span className="risk-area-name">{area.name}</span>
                <span className="risk-score-badge caution">
                  {Math.round(area.risk_score * 100)}%
                </span>
              </div>
              <div className="risk-reasons">
                {area.reasons.map((reason, i) => (
                  <span key={i} className="risk-reason-tag caution">{reason}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
