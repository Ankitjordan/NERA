import React, { useEffect, useState } from 'react';
import { Database, Route, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { fetchSystemStatus } from '../services/mapplsRouteService';
import type { SystemStatus } from '../services/mapplsRouteService';
import { useI18n } from '../i18n';

interface RouteProgressBarProps {
  isLoadingRoute: boolean;
}

const STAGE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; pct: number }> = {
  checking_cache:  { icon: <Database size={14} />,      label: 'Validating graph cache…',     color: '#a78bfa', pct: 5   },
  downloading:     { icon: <Loader2 size={14} className="spin" />, label: 'Downloading NER map data…', color: '#38bdf8', pct: 20  },
  building_graph:  { icon: <Loader2 size={14} className="spin" />, label: 'Building road network…',    color: '#f59e0b', pct: 50  },
  saving_cache:    { icon: <Loader2 size={14} className="spin" />, label: 'Saving graph to cache…',    color: '#fb923c', pct: 80  },
  loading_graph:   { icon: <Loader2 size={14} className="spin" />, label: 'Loading graph into memory…', color: '#22d3ee', pct: 70  },
  ready:           { icon: <CheckCircle2 size={14} />,  label: 'NER routing ready',            color: '#10b981', pct: 100 },
  error:           { icon: <AlertTriangle size={14} />, label: 'Graph error',                  color: '#ef4444', pct: 0   },
};

export const RouteProgressBar: React.FC<RouteProgressBarProps> = ({ isLoadingRoute }) => {
  const { language, t } = useI18n();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [routePhase, setRoutePhase] = useState<'idle' | 'snapping' | 'pathfinding' | 'hazards' | 'done'>('idle');
  const [routePct, setRoutePct] = useState(0);
  const [visible, setVisible] = useState(false);

  // Poll system status when graph isn't ready
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let mounted = true;

    const poll = async () => {
      const s = await fetchSystemStatus(language);
      if (!mounted) return;
      setStatus(s);
      if (s && s.state !== 'ready' && s.state !== 'error') {
        setVisible(true);
      }
    };

    poll();
    interval = setInterval(poll, 1500);

    return () => { mounted = false; clearInterval(interval); };
  }, [language]);

  // Simulate route calculation phases when isLoadingRoute is true
  useEffect(() => {
    if (!isLoadingRoute) {
      if (routePhase !== 'idle') {
        setRoutePhase('done');
        setRoutePct(100);
        const t = setTimeout(() => {
          setRoutePhase('idle');
          setRoutePct(0);
          setVisible(false);
        }, 800);
        return () => clearTimeout(t);
      }
      return;
    }

    setVisible(true);
    setRoutePhase('snapping');
    setRoutePct(10);

    const t1 = setTimeout(() => { setRoutePhase('pathfinding'); setRoutePct(35); }, 400);
    const t2 = setTimeout(() => { setRoutePct(55); }, 1200);
    const t3 = setTimeout(() => { setRoutePhase('hazards'); setRoutePct(75); }, 2500);
    const t4 = setTimeout(() => { setRoutePct(88); }, 4000);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [isLoadingRoute]);

  // Determine what to show
  const graphNotReady = status && status.state !== 'ready' && status.state !== 'error';
  const showRouteProgress = isLoadingRoute || routePhase === 'done';
  const shouldShow = visible && (graphNotReady || showRouteProgress);

  if (!shouldShow) return null;

  // Graph loading mode
  if (graphNotReady) {
    const cfg = STAGE_CONFIG[status!.state] || STAGE_CONFIG.loading_graph;
    const pct = status!.percent > 0 ? status!.percent : cfg.pct;

    return (
      <div className="route-progress-overlay">
        <div className="route-progress-card">
          <div className="rp-header">
            <Database size={18} className="rp-header-icon" />
            <span className="rp-title">{t('initializingRoadGraph')}</span>
          </div>
          <div className="rp-stage-row">
            <span className="rp-stage-icon" style={{ color: cfg.color }}>{cfg.icon}</span>
            <span className="rp-stage-label">{status!.message || cfg.label}</span>
          </div>
          <div className="rp-bar-track">
            <div
              className="rp-bar-fill"
              style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}dd)` }}
            />
          </div>
          <div className="rp-meta">
            <span className="rp-pct">{Math.round(pct)}%</span>
            <span className="rp-hint">{t('coverageHint')}</span>
          </div>
        </div>
      </div>
    );
  }

  // Route calculation mode
  const routeLabels: Record<string, string> = {
    snapping: t('snappingToRoad'), pathfinding: t('runningPathfinder'),
    hazards: t('evaluatingHazards'), done: t('routeReady'),
  };

  const routeColors: Record<string, string> = {
    snapping: '#a78bfa',
    pathfinding: '#38bdf8',
    hazards: '#f59e0b',
    done: '#10b981',
  };

  return (
    <div className="route-progress-overlay">
      <div className="route-progress-card route-progress-compact">
        <div className="rp-header">
          <Route size={16} className="rp-header-icon" />
          <span className="rp-title">{t('calculatingSafeRoute')}</span>
        </div>
        <div className="rp-stage-row">
          <span className="rp-stage-icon" style={{ color: routeColors[routePhase] || '#a78bfa' }}>
            {routePhase === 'done' ? <CheckCircle2 size={14} /> : <Loader2 size={14} className="spin" />}
          </span>
          <span className="rp-stage-label">{routeLabels[routePhase] || t('preparing')}</span>
        </div>
        <div className="rp-bar-track">
          <div
            className="rp-bar-fill rp-bar-animated"
            style={{
              width: `${routePct}%`,
              background: `linear-gradient(90deg, ${routeColors[routePhase] || '#a78bfa'}, ${routeColors[routePhase] || '#a78bfa'}dd)`,
            }}
          />
        </div>
        <div className="rp-meta">
          <span className="rp-pct">{routePct}%</span>
          <span className="rp-hint">NER OSM Graph · A* · Haversine Heuristic</span>
        </div>
      </div>
    </div>
  );
};
