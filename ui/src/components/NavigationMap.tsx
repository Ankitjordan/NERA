import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sun,
  Moon,
  Compass,
  AlertTriangle,
} from 'lucide-react';
import type { RouteResult } from '../services/mapplsRouteService';
import type { LocationPoint } from './RouteSearchBox';

/* ── Custom HTML Marker Templates ────────────────────────────────── */
const ORIGIN_MARKER_HTML = `
<div style="position:relative;width:32px;height:42px;cursor:pointer;">
  <svg width="32" height="42" viewBox="0 0 32 42">
    <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26C32 7.2 24.8 0 16 0z" fill="#10b981"/>
    <circle cx="16" cy="15" r="9" fill="#fff"/>
    <text x="16" y="19" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" font-weight="800" fill="#10b981">A</text>
  </svg>
</div>`;

const DEST_MARKER_HTML = `
<div style="position:relative;width:32px;height:42px;cursor:pointer;">
  <svg width="32" height="42" viewBox="0 0 32 42">
    <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26C32 7.2 24.8 0 16 0z" fill="#ef4444"/>
    <circle cx="16" cy="15" r="9" fill="#fff"/>
    <text x="16" y="19" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" font-weight="800" fill="#ef4444">B</text>
  </svg>
</div>`;

const USER_GPS_MARKER_HTML = `
<div style="position:relative;width:22px;height:22px;">
  <div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.25);animation:gps-ring 1.8s ease-out infinite;"></div>
  <div style="position:absolute;top:5px;left:5px;width:12px;height:12px;border-radius:50%;background:#3b82f6;border:2.5px solid #fff;box-shadow:0 0 6px rgba(59,130,246,0.7);"></div>
</div>`;

interface NavigationMapProps {
  token: string;
  theme: 'dark' | 'light';
  origin: LocationPoint | null;
  destination: LocationPoint | null;
  route: RouteResult | null;
  isJourneyActive: boolean;
  viewMode: '3d' | '2d' | 'overview';
  userGpsPosition: [number, number] | null;
  userBearing: number;
  onToggleTheme: () => void;
  onToggleViewMode: () => void;
  onOpenTokenModal: () => void;
}

export const NavigationMap: React.FC<NavigationMapProps> = ({
  token,
  theme,
  origin,
  destination,
  route,
  isJourneyActive,
  viewMode,
  userGpsPosition,
  userBearing,
  onToggleTheme,
  onToggleViewMode,
  onOpenTokenModal,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const originMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const userGpsMarkerRef = useRef<any>(null);
  const polylineLayerRef = useRef<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const removeLayer = useCallback((ref: React.MutableRefObject<any>) => {
    if (!ref.current) return;
    try {
      if (ref.current.remove) ref.current.remove();
      else window.mappls?.remove?.({ map: mapInstanceRef.current, layer: ref.current });
    } catch {}
    ref.current = null;
  }, []);

  const clearMapOverlays = useCallback(() => {
    removeLayer(originMarkerRef);
    removeLayer(destMarkerRef);
    removeLayer(userGpsMarkerRef);
    removeLayer(polylineLayerRef);
  }, [removeLayer]);

  // Init Map
  const initMap = useCallback(() => {
    if (!mapContainerRef.current || !window.mappls?.Map) return;
    try {
      mapContainerRef.current.innerHTML = '';
      clearMapOverlays();
      const map = new window.mappls.Map(mapContainerRef.current, {
        center: { lat: 26.1445, lng: 91.7362 },
        zoom: 7.5,
        zoomControl: false,
        hybrid: false,
        location: false,
        fullscreen: false,
      });
      mapInstanceRef.current = map;
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to initialize map');
    }
  }, [clearMapOverlays]);

  // Load SDK
  useEffect(() => {
    if (!token) { setLoadError('Configure your Mappls key.'); return; }
    setLoadError(null);
    const old = document.getElementById('mappls-sdk-script');
    if (old) old.remove();
    const s = document.createElement('script');
    s.id = 'mappls-sdk-script';
    s.src = `https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${encodeURIComponent(token.trim())}`;
    s.async = true; s.defer = true;
    s.onload = () => setTimeout(() => { if (window.mappls?.Map) initMap(); else setLoadError('SDK unavailable.'); }, 150);
    s.onerror = () => setLoadError('Failed to load Mappls SDK.');
    document.head.appendChild(s);
    return () => { clearMapOverlays(); };
  }, [token, initMap, clearMapOverlays]);

  // Origin Marker (Green "A" pin)
  useEffect(() => {
    if (!mapInstanceRef.current || !window.mappls) return;
    removeLayer(originMarkerRef);
    if (origin) {
      try {
        originMarkerRef.current = new window.mappls.Marker({
          map: mapInstanceRef.current,
          position: { lat: origin.lat, lng: origin.lng },
          fitbounds: false,
          html: ORIGIN_MARKER_HTML,
          offset: [0, -21],
        });
        if (!route && !destination) {
          mapInstanceRef.current.setCenter({ lat: origin.lat, lng: origin.lng });
          mapInstanceRef.current.setZoom(12);
        }
      } catch (e) { console.warn('Origin marker error:', e); }
    }
  }, [origin, route, destination, removeLayer]);

  // Destination Marker (Red "B" pin)
  useEffect(() => {
    if (!mapInstanceRef.current || !window.mappls) return;
    removeLayer(destMarkerRef);
    if (destination) {
      try {
        destMarkerRef.current = new window.mappls.Marker({
          map: mapInstanceRef.current,
          position: { lat: destination.lat, lng: destination.lng },
          fitbounds: false,
          html: DEST_MARKER_HTML,
          offset: [0, -21],
        });
        if (!route && !origin) {
          mapInstanceRef.current.setCenter({ lat: destination.lat, lng: destination.lng });
          mapInstanceRef.current.setZoom(12);
        }
      } catch (e) { console.warn('Dest marker error:', e); }
    }
  }, [destination, route, origin, removeLayer]);

  // Route Polyline (Google Maps style — thick blue)
  useEffect(() => {
    if (!mapInstanceRef.current || !window.mappls) return;
    removeLayer(polylineLayerRef);
    if (route?.coordinates?.length && window.mappls.Polyline) {
      try {
        const pts = route.coordinates.map(([lat, lng]) => ({ lat, lng }));
        const color = theme === 'dark' ? '#4285F4' : '#1a73e8';
        polylineLayerRef.current = new window.mappls.Polyline({
          map: mapInstanceRef.current,
          path: pts,
          strokeColor: color,
          strokeWeight: 5,
          strokeOpacity: 1.0,
          fitbounds: !isJourneyActive,
          fitboundOptions: { padding: 80 },
        });
        if (!isJourneyActive) {
          const lats = route.coordinates.map(c => c[0]);
          const lngs = route.coordinates.map(c => c[1]);
          mapInstanceRef.current.fitBounds?.(
            [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
            { padding: { top: 70, bottom: 70, left: 420, right: 70 } }
          );
        }
      } catch (e) { console.warn('Polyline error:', e); }
    }
  }, [route, theme, isJourneyActive, removeLayer]);

  // GPS marker + 3D perspective
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.mappls) return;
    if (!isJourneyActive || !userGpsPosition) {
      removeLayer(userGpsMarkerRef);
      return;
    }
    const [lat, lng] = userGpsPosition;
    if (!userGpsMarkerRef.current) {
      try {
        userGpsMarkerRef.current = new window.mappls.Marker({
          map, position: { lat, lng }, fitbounds: false,
          html: USER_GPS_MARKER_HTML, offset: [0, 0],
        });
      } catch {}
    } else {
      try { userGpsMarkerRef.current.setPosition?.({ lat, lng }); } catch {}
    }
    try {
      if (viewMode === '3d' && typeof map.easeTo === 'function') {
        map.easeTo({ center: [lng, lat], zoom: 16.5, pitch: 60, bearing: userBearing || 0, duration: 280 });
      } else if (viewMode === '2d' && typeof map.easeTo === 'function') {
        map.easeTo({ center: [lng, lat], zoom: 15.5, pitch: 0, bearing: 0, duration: 280 });
      }
    } catch {}
  }, [userGpsPosition, isJourneyActive, userBearing, viewMode, removeLayer]);

  const recenter = () => {
    const map = mapInstanceRef.current; if (!map) return;
    try { map.setPitch?.(0); map.setBearing?.(0); } catch {}
    if (route?.coordinates?.length) {
      const lats = route.coordinates.map(c => c[0]);
      const lngs = route.coordinates.map(c => c[1]);
      map.fitBounds?.([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], { padding: 80 });
    } else if (origin) { map.setCenter({ lat: origin.lat, lng: origin.lng }); map.setZoom(12); }
  };

  return (
    <div className={`map-wrapper ${theme}`}>
      <div id="mappls-navigation-map" ref={mapContainerRef} className="map-element" />

      <div className="map-floating-controls">
        <button title={`${theme === 'dark' ? 'Light' : 'Dark'} mode`} onClick={onToggleTheme} className="map-ctrl-btn">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button title={`${viewMode.toUpperCase()} view`} onClick={onToggleViewMode} className={`map-ctrl-btn ${viewMode === '3d' ? 'active' : ''}`}>
          <Compass size={16} />
        </button>
        <button title="Recenter" onClick={recenter} className="map-ctrl-btn"><RotateCcw size={15} /></button>
        <div className="ctrl-divider" />
        <button title="Zoom in" onClick={() => mapInstanceRef.current?.setZoom(mapInstanceRef.current.getZoom() + 1)} className="map-ctrl-btn"><ZoomIn size={15} /></button>
        <button title="Zoom out" onClick={() => mapInstanceRef.current?.setZoom(mapInstanceRef.current.getZoom() - 1)} className="map-ctrl-btn"><ZoomOut size={15} /></button>
      </div>

      {isJourneyActive && (
        <div className="journey-hud">
          <span className="hud-dot" />
          <span className="hud-label">Navigation Active</span>
          <span className="hud-meta">{viewMode.toUpperCase()} View</span>
        </div>
      )}

      {loadError && (
        <div className="map-error-overlay">
          <div className="error-card">
            <AlertTriangle size={22} />
            <h3>Map Unavailable</h3>
            <p>{loadError}</p>
            <button onClick={onOpenTokenModal}>Configure Key</button>
          </div>
        </div>
      )}
    </div>
  );
};
