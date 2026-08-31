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
  const polylineCasingRef = useRef<any>(null);
  const polylineLayerRef = useRef<any>(null);
  const [mapPitch, setMapPitch] = useState(0);
  const [isDraggingCompass, setIsDraggingCompass] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const compassDialRef = useRef<HTMLDivElement>(null);
  const compassDialSvgRef = useRef<SVGSVGElement>(null);
  const bearingNumRef = useRef<HTMLSpanElement>(null);
  const bearingCardRef = useRef<HTMLSpanElement>(null);
  const mapBearingRef = useRef(0);

  // Cardinal direction helper
  const getCardinal = (deg: number) => {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
    return dirs[idx];
  };

  const updateBearingUI = useCallback((bearing: number) => {
    mapBearingRef.current = bearing;
    if (compassDialSvgRef.current) {
      compassDialSvgRef.current.style.transform = `rotate(${-bearing}deg)`;
    }
    if (bearingNumRef.current) {
      bearingNumRef.current.innerText = `${bearing}°`;
    }
    if (bearingCardRef.current) {
      bearingCardRef.current.innerText = getCardinal(bearing);
    }
    // Also update HUD if it exists
    const hudMeta = document.getElementById('hud-meta-bearing');
    if (hudMeta) {
      hudMeta.innerText = `${bearing}° ${getCardinal(bearing)}`;
    }
  }, []);

  const removeLayer = useCallback((ref: React.MutableRefObject<any>) => {
    if (!ref.current) return;
    try {
      if (ref.current.remove) ref.current.remove();
      else window.mappls?.remove?.({ map: mapInstanceRef.current, layer: ref.current });
    } catch { }
    ref.current = null;
  }, []);

  const clearMapOverlays = useCallback(() => {
    removeLayer(originMarkerRef);
    removeLayer(destMarkerRef);
    removeLayer(userGpsMarkerRef);
    removeLayer(polylineCasingRef);
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

      // Sync bearing and pitch state when user pans/rotates
      if (map.on) {
        map.on('rotate', () => {
          if (typeof map.getBearing === 'function') {
            const b = Math.round(map.getBearing());
            updateBearingUI(((b % 360) + 360) % 360);
          }
        });
        map.on('pitch', () => {
          if (typeof map.getPitch === 'function') {
            setMapPitch(Math.round(map.getPitch()));
          }
        });
      }

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

  // Route Polyline (High-contrast bold casing + neon/electric core)
  useEffect(() => {
    if (!mapInstanceRef.current || !window.mappls) return;
    removeLayer(polylineCasingRef);
    removeLayer(polylineLayerRef);
    if (route?.coordinates?.length && window.mappls.Polyline) {
      try {
        const pts = route.coordinates.map(([lat, lng]) => ({ lat, lng }));

        // 1. Bold outer casing (darker navy border for crisp edge definition)
        const casingColor = theme === 'dark' ? '#03172e' : '#103768';
        polylineCasingRef.current = new window.mappls.Polyline({
          map: mapInstanceRef.current,
          path: pts,
          strokeColor: casingColor,
          strokeWeight: 11,
          strokeOpacity: 0.9,
          fitbounds: false,
        });

        // 2. High-vibrancy core line (Ultra-luminous Neon Cyan in dark mode, Electric Blue in light mode)
        const coreColor = theme === 'dark' ? '#00f0ff' : '#2563eb';
        polylineLayerRef.current = new window.mappls.Polyline({
          map: mapInstanceRef.current,
          path: pts,
          strokeColor: coreColor,
          strokeWeight: 7.5,
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

  // GPS marker + 3D perspective (Initial / standard GPS update)
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
      } catch { }
    } else {
      try { userGpsMarkerRef.current.setPosition?.({ lat, lng }); } catch { }
    }
    try {
      if (viewMode === '3d' && typeof map.easeTo === 'function') {
        map.easeTo({ center: [lng, lat], zoom: 19, pitch: 75, bearing: userBearing || 0, duration: 280 });
        updateBearingUI(userBearing || 0);
        setMapPitch(75);
      } else if (viewMode === '2d' && typeof map.easeTo === 'function') {
        map.easeTo({ center: [lng, lat], zoom: 17, pitch: 0, bearing: 0, duration: 280 });
        updateBearingUI(0);
        setMapPitch(0);
      }
    } catch { }
  }, [userGpsPosition, isJourneyActive, userBearing, viewMode, removeLayer]);

  // 60fps Mock Drive Smooth Update listener
  useEffect(() => {
    const handleMockDriveEvent = (e: any) => {
      const state = e.detail;
      const { lat, lng, bearing } = state;
      
      const map = mapInstanceRef.current;
      if (!map) return;

      // Update marker position directly
      if (userGpsMarkerRef.current && userGpsMarkerRef.current.setPosition) {
        userGpsMarkerRef.current.setPosition({ lat, lng });
      }

      // Update map center and bearing instantly (jumpTo / setCenter)
      try {
        if (viewMode === '3d') {
          // Use jumpTo for instant zero-duration update to prevent animation fighting
          if (typeof map.jumpTo === 'function') {
            map.jumpTo({ center: [lng, lat], zoom: 19, pitch: 75, bearing: bearing });
          } else {
            map.setCenter({ lat, lng });
            if (typeof map.setBearing === 'function') map.setBearing(bearing);
          }
          updateBearingUI(bearing);
        } else if (viewMode === '2d') {
          if (typeof map.jumpTo === 'function') {
            map.jumpTo({ center: [lng, lat], zoom: 17, pitch: 0, bearing: 0 });
          } else {
            map.setCenter({ lat, lng });
          }
        }
      } catch {}
    };

    window.addEventListener('mock-drive-update', handleMockDriveEvent);
    return () => window.removeEventListener('mock-drive-update', handleMockDriveEvent);
  }, [viewMode, updateBearingUI]);

  const recenter = () => {
    const map = mapInstanceRef.current; if (!map) return;
    try { map.setPitch?.(0); map.setBearing?.(0); updateBearingUI(0); setMapPitch(0); } catch { }
    if (route?.coordinates?.length) {
      const lats = route.coordinates.map(c => c[0]);
      const lngs = route.coordinates.map(c => c[1]);
      map.fitBounds?.([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], { padding: 80 });
    } else if (origin) { map.setCenter({ lat: origin.lat, lng: origin.lng }); map.setZoom(12); }
  };

  // Compass Controls
  const rotateMapBy = (delta: number) => {
    const map = mapInstanceRef.current; if (!map) return;
    const current = typeof map.getBearing === 'function' ? map.getBearing() : mapBearingRef.current;
    const nextBearing = Math.round(((current + delta) % 360 + 360) % 360);
    try {
      if (typeof map.easeTo === 'function') {
        map.easeTo({ bearing: nextBearing, duration: 250 });
      } else if (typeof map.setBearing === 'function') {
        map.setBearing(nextBearing);
      }
      updateBearingUI(nextBearing);
    } catch { }
  };

  const resetNorth = () => {
    const map = mapInstanceRef.current; if (!map) return;
    try {
      if (typeof map.easeTo === 'function') {
        map.easeTo({ bearing: 0, duration: 300 });
      } else if (typeof map.setBearing === 'function') {
        map.setBearing(0);
      }
      updateBearingUI(0);
    } catch { }
  };

  const alignWithVehicle = () => {
    const map = mapInstanceRef.current; if (!map) return;
    try {
      const targetBearing = userBearing || 0;
      if (typeof map.easeTo === 'function') {
        map.easeTo({ bearing: targetBearing, pitch: 60, duration: 350 });
      } else if (typeof map.setBearing === 'function') {
        map.setBearing(targetBearing);
        map.setPitch?.(60);
      }
      updateBearingUI(targetBearing);
      setMapPitch(60);
    } catch { }
  };

  const togglePitch = () => {
    const map = mapInstanceRef.current; if (!map) return;
    const currentPitch = typeof map.getPitch === 'function' ? map.getPitch() : mapPitch;
    const nextPitch = currentPitch > 30 ? 0 : 60;
    try {
      if (typeof map.easeTo === 'function') {
        map.easeTo({ pitch: nextPitch, duration: 300 });
      } else if (typeof map.setPitch === 'function') {
        map.setPitch(nextPitch);
      }
      setMapPitch(nextPitch);
    } catch { }
  };

  // Drag compass to rotate
  const handleCompassMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingCompass(true);
    const dial = compassDialRef.current;
    if (!dial) return;
    const rect = dial.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - centerX;
      const dy = moveEvent.clientY - centerY;
      // Calculate angle from center (0 deg is top/North)
      let angle = Math.round((Math.atan2(dx, -dy) * 180) / Math.PI);
      angle = ((angle % 360) + 360) % 360;

      const map = mapInstanceRef.current;
      if (map) {
        try {
          if (typeof map.setBearing === 'function') map.setBearing(angle);
        } catch { }
      }
      updateBearingUI(angle);
    };

    const onMouseUp = () => {
      setIsDraggingCompass(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };



  return (
    <div className={`map-wrapper ${theme}`}>
      <div id="mappls-navigation-map" ref={mapContainerRef} className="map-element" />

      {/* Top-Right Standard Controls */}
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

      {/* Bottom-Right Google Maps Interactive Compass Widget */}
      <div className="google-compass-widget">
        {/* Cardinal / Angle Badge */}
        <div className="compass-bearing-badge" onClick={resetNorth} title="Click to reset North">
          <span className="bearing-num" ref={bearingNumRef}>{mapBearingRef.current}°</span>
          <span className="bearing-cardinal" ref={bearingCardRef}>{getCardinal(mapBearingRef.current)}</span>
        </div>

        {/* Circular Compass Dial */}
        <div
          ref={compassDialRef}
          className={`compass-dial-container ${isDraggingCompass ? 'dragging' : ''}`}
          onMouseDown={handleCompassMouseDown}
          onClick={() => {
            // If just clicked without dragging, reset North
            if (!isDraggingCompass) resetNorth();
          }}
          title="Google Maps Compass — Click to align North or drag to rotate perspective"
        >
          <svg viewBox="0 0 64 64" className="compass-dial-svg" ref={compassDialSvgRef} style={{ transform: `rotate(${-mapBearingRef.current}deg)` }}>
            {/* Outer ring */}
            <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />

            {/* Degree tick marks */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
              <line
                key={deg}
                x1="32"
                y1="4"
                x2="32"
                y2={deg % 90 === 0 ? "8" : "6"}
                stroke="currentColor"
                strokeWidth={deg % 90 === 0 ? "1.5" : "1"}
                opacity={deg % 90 === 0 ? "0.7" : "0.3"}
                transform={`rotate(${deg} 32 32)`}
              />
            ))}

            {/* Cardinal Letters */}
            <text x="32" y="14" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#ef4444">N</text>
            <text x="52" y="34.5" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="currentColor" opacity="0.6">E</text>
            <text x="32" y="54" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="currentColor" opacity="0.6">S</text>
            <text x="12" y="34.5" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="currentColor" opacity="0.6">W</text>

            {/* 3D North Needle (Red) */}
            <polygon points="32,16 35.5,32 32,29" fill="#ef4444" />
            <polygon points="32,16 28.5,32 32,29" fill="#dc2626" />

            {/* 3D South Needle (White/Silver) */}
            <polygon points="32,48 35.5,32 32,35" fill="#f1f5f9" />
            <polygon points="32,48 28.5,32 32,35" fill="#94a3b8" />

            {/* Center Pivot Pin */}
            <circle cx="32" cy="32" r="3.5" fill="#0f172a" stroke="#f1f5f9" strokeWidth="1.2" />
            <circle cx="32" cy="32" r="1.2" fill="#ef4444" />
          </svg>
        </div>

        {/* Quick Perspective Rotation Toolbar */}
        <div className="compass-quick-toolbar">
          <button className="compass-action-btn" onClick={() => rotateMapBy(-15)} title="Rotate Left 15°">
            ↺
          </button>
          <button
            className={`compass-action-btn ${mapPitch > 30 ? 'active' : ''}`}
            onClick={togglePitch}
            title={`Toggle 3D Perspective (${mapPitch > 30 ? '3D' : '2D'})`}
          >
            {mapPitch > 30 ? '3D' : '2D'}
          </button>
          {userBearing !== undefined && userBearing !== null && (
            <button
              className="compass-action-btn highlight"
              onClick={alignWithVehicle}
              title={`Face Vehicle Forward Direction (${userBearing}°)`}
            >
              ▲
            </button>
          )}
          <button className="compass-action-btn" onClick={() => rotateMapBy(15)} title="Rotate Right 15°">
            ↻
          </button>
        </div>
      </div>



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
