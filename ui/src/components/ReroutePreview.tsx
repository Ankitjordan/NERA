import React from 'react';
import { Navigation, ShieldAlert, X } from 'lucide-react';
import { useI18n } from '../i18n';

interface RoutePoint {
  lat: number;
  lng: number;
}

interface ReroutePreviewProps {
  route: RoutePoint[];
  hazard: RoutePoint;
  currentPosition: RoutePoint;
  onClose: () => void;
}

export const ReroutePreview: React.FC<ReroutePreviewProps> = ({ route, hazard, currentPosition, onClose }) => {
  const { t } = useI18n();
  const points = route.length > 1 ? route : [currentPosition, hazard];
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(maxLat - minLat, 0.001);
  const lngSpan = Math.max(maxLng - minLng, 0.001);
  const project = (point: RoutePoint) => `${8 + ((point.lng - minLng) / lngSpan) * 184},${92 - ((point.lat - minLat) / latSpan) * 76}`;

  return (
    <div className="reroute-preview" role="status" aria-label={t('updatedRoutePreview')}>
      <div className="reroute-preview-heading">
        <span><Navigation size={13} /> {t('updatedRoute')}</span>
        <div className="reroute-preview-actions">
          <ShieldAlert size={14} color="#f97316" />
          <button type="button" className="reroute-close-btn" onClick={onClose} aria-label={t('closeRerouteAlert')} title={t('close')}>
            <X size={14} />
          </button>
        </div>
      </div>
      <svg className="reroute-preview-map" viewBox="0 0 200 100" aria-hidden="true">
        <path className="reroute-preview-casing" d={`M ${points.map(project).join(' L ')}`} />
        <path className="reroute-preview-line" d={`M ${points.map(project).join(' L ')}`} />
        <circle className="reroute-preview-current" cx={project(currentPosition).split(',')[0]} cy={project(currentPosition).split(',')[1]} r="4" />
        <circle className="reroute-preview-hazard" cx={project(hazard).split(',')[0]} cy={project(hazard).split(',')[1]} r="4" />
      </svg>
      <span className="reroute-preview-caption">{t('diversionAhead')}</span>
    </div>
  );
};