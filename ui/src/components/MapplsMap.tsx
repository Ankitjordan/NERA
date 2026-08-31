import React, { useEffect, useRef, useState, useCallback } from 'react';
import { NORTH_EAST_CENTER, NORTH_EAST_STATES } from '../data/northEastStates';
import type { NorthEastState } from '../data/northEastStates';
import { MapPin, Navigation, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, Key, RefreshCw, Zap } from 'lucide-react';
import { requestMapplsOAuthToken } from '../services/mapplsAuth';

interface MapplsMapProps {
  token: string;
  selectedState: NorthEastState | null;
  onSelectState: (state: NorthEastState | null) => void;
  onTokenChange: (newToken: string) => void;
}

export const MapplsMap: React.FC<MapplsMapProps> = ({
  token,
  selectedState,
  onSelectState,
  onTokenChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState(token || '');
  const [authMode, setAuthMode] = useState<'static' | 'oauth'>('static');
  const [clientId, setClientId] = useState(import.meta.env.VITE_MAPPLS_CLIENT_ID || '');
  const [clientSecret, setClientSecret] = useState(import.meta.env.VITE_MAPPLS_CLIENT_SECRET || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(NORTH_EAST_CENTER.zoom);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: NORTH_EAST_CENTER.lat,
    lng: NORTH_EAST_CENTER.lng,
  });

  // Auto-generate OAuth token if env vars exist and no token is present
  useEffect(() => {
    const envClientId = import.meta.env.VITE_MAPPLS_CLIENT_ID;
    const envClientSecret = import.meta.env.VITE_MAPPLS_CLIENT_SECRET;
    if (!token && envClientId && envClientSecret && !isGenerating) {
      setIsGenerating(true);
      requestMapplsOAuthToken(envClientId, envClientSecret)
        .then((res) => {
          if (res.access_token) {
            setManualToken(res.access_token);
            onTokenChange(res.access_token);
          }
        })
        .catch((err) => {
          console.warn('Auto OAuth generation error:', err);
        })
        .finally(() => {
          setIsGenerating(false);
        });
    }
  }, [token, onTokenChange]);

  // Clear existing markers
  const clearMarkers = useCallback(() => {
    if (markersRef.current.length > 0 && window.mappls && window.mappls.remove && mapInstanceRef.current) {
      markersRef.current.forEach((marker) => {
        try {
          if (marker && marker.remove) {
            marker.remove();
          } else {
            window.mappls?.remove?.({ map: mapInstanceRef.current, layer: marker });
          }
        } catch {
          // ignore cleanup errors
        }
      });
      markersRef.current = [];
    }
  }, []);

  // Initialize Map
  const initMap = useCallback(() => {
    if (!mapContainerRef.current || !window.mappls || !window.mappls.Map) {
      return;
    }

    try {
      mapContainerRef.current.innerHTML = '';
      clearMarkers();

      const map = new window.mappls.Map(mapContainerRef.current, {
        center: { lat: NORTH_EAST_CENTER.lat, lng: NORTH_EAST_CENTER.lng },
        zoom: NORTH_EAST_CENTER.zoom,
        zoomControl: true,
        hybrid: true,
        location: true,
        fullscreen: true,
      });

      mapInstanceRef.current = map;

      // Add markers for all 8 North Eastern States
      const newMarkers: any[] = [];
      NORTH_EAST_STATES.forEach((state) => {
        try {
          const marker = new window.mappls!.Marker({
            map: map,
            position: { lat: state.lat, lng: state.lng },
            fitbounds: false,
          });

          if (marker && marker.addListener) {
            marker.addListener('click', () => {
              onSelectState(state);
            });
          }

          newMarkers.push(marker);
        } catch (err) {
          console.warn('Could not add marker for', state.name, err);
        }
      });

      markersRef.current = newMarkers;
      setLoadError(null);
    } catch (err: any) {
      console.error('Error initializing Mappls Map:', err);
      setLoadError(err?.message || 'Failed to initialize Mappls Map instance.');
    }
  }, [clearMarkers, onSelectState]);

  // Load SDK Script dynamically whenever token changes
  useEffect(() => {
    const activeToken = token || manualToken;
    if (!activeToken || activeToken.trim() === '') {
      setLoadError('Please provide a valid Mappls Static Key or generate an OAuth Token.');
      return;
    }

    setLoadError(null);

    // Remove any previously loaded Mappls script
    const existingScript = document.getElementById('mappls-sdk-script');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.id = 'mappls-sdk-script';
    script.src = `https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${encodeURIComponent(activeToken.trim())}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setTimeout(() => {
        if (window.mappls && window.mappls.Map) {
          initMap();
        } else {
          setLoadError(
            'Mappls SDK loaded, but window.mappls was not found. Please ensure your key has Web Map JS permissions or try OAuth generation.'
          );
        }
      }, 150);
    };

    script.onerror = () => {
      setLoadError(
        'Failed to load Mappls Web Maps JS SDK (401 Unauthorized or Network Error). If using a REST key, please generate an OAuth Token below or use a Web SDK Static Key.'
      );
    };

    document.head.appendChild(script);

    return () => {
      clearMarkers();
    };
  }, [token, manualToken, initMap, clearMarkers]);

  // React to selectedState change from outside
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (selectedState) {
      try {
        if (typeof mapInstanceRef.current.setCenter === 'function') {
          mapInstanceRef.current.setCenter({ lat: selectedState.lat, lng: selectedState.lng });
        }
        if (typeof mapInstanceRef.current.setZoom === 'function') {
          mapInstanceRef.current.setZoom(selectedState.zoom || 9);
        }
        setCoords({ lat: selectedState.lat, lng: selectedState.lng });
        setCurrentZoom(selectedState.zoom || 9);
      } catch (e) {
        console.warn('Map pan error:', e);
      }
    }
  }, [selectedState]);

  const handleResetView = () => {
    onSelectState(null);
    if (mapInstanceRef.current) {
      try {
        if (typeof mapInstanceRef.current.setCenter === 'function') {
          mapInstanceRef.current.setCenter({ lat: NORTH_EAST_CENTER.lat, lng: NORTH_EAST_CENTER.lng });
        }
        if (typeof mapInstanceRef.current.setZoom === 'function') {
          mapInstanceRef.current.setZoom(NORTH_EAST_CENTER.zoom);
        }
        setCoords({ lat: NORTH_EAST_CENTER.lat, lng: NORTH_EAST_CENTER.lng });
        setCurrentZoom(NORTH_EAST_CENTER.zoom);
      } catch (e) {
        console.warn('Reset view error:', e);
      }
    }
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current && typeof mapInstanceRef.current.getZoom === 'function') {
      try {
        const nextZoom = mapInstanceRef.current.getZoom() + 1;
        mapInstanceRef.current.setZoom(nextZoom);
        setCurrentZoom(nextZoom);
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current && typeof mapInstanceRef.current.getZoom === 'function') {
      try {
        const nextZoom = mapInstanceRef.current.getZoom() - 1;
        mapInstanceRef.current.setZoom(nextZoom);
        setCurrentZoom(nextZoom);
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const handleOAuthGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) {
      setLoadError('Please enter both Client ID and Client Secret.');
      return;
    }

    setIsGenerating(true);
    setLoadError(null);

    try {
      const response = await requestMapplsOAuthToken(clientId, clientSecret);
      if (response.access_token) {
        setManualToken(response.access_token);
        onTokenChange(response.access_token);
      } else {
        setLoadError('No access token received from Token Generation API.');
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to generate OAuth token. Check your credentials.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px] flex-1 overflow-hidden bg-slate-950">
      {/* The DOM container where Mappls Map is mounted */}
      <div
        id="mappls-map-container"
        ref={mapContainerRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%', minHeight: '100%' }}
      />

      {/* Floating Control Toolbar */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-slate-900/80 backdrop-blur-md p-2 rounded-xl border border-slate-700/60 shadow-xl">
        <button
          title="Reset to North East India"
          onClick={handleResetView}
          className="p-2.5 hover:bg-slate-700/70 text-emerald-400 hover:text-emerald-300 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold"
        >
          <RotateCcw className="w-4 h-4" />
          <span>NER Full View</span>
        </button>
        <div className="h-px bg-slate-700/60 my-0.5" />
        <button
          title="Zoom In"
          onClick={handleZoomIn}
          className="p-2.5 hover:bg-slate-700/70 text-slate-200 hover:text-white rounded-lg transition-all flex items-center justify-center"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          title="Zoom Out"
          onClick={handleZoomOut}
          className="p-2.5 hover:bg-slate-700/70 text-slate-200 hover:text-white rounded-lg transition-all flex items-center justify-center"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Map Status Bar */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3 bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/60 text-xs text-slate-300 shadow-lg">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-white">Mappls v3.0 JS SDK</span>
        </div>
        <div className="h-3 w-px bg-slate-700"></div>
        <div className="flex items-center gap-1 text-slate-400">
          <Navigation className="w-3.5 h-3.5 text-cyan-400" />
          <span>{coords.lat.toFixed(4)}° N, {coords.lng.toFixed(4)}° E</span>
        </div>
        <div className="h-3 w-px bg-slate-700"></div>
        <div className="text-slate-400">
          Zoom: <span className="text-slate-200 font-medium">{currentZoom}</span>
        </div>
      </div>

      {/* Error / Token Input Overlay if Token is Missing or Invalid */}
      {(!token && !manualToken) || loadError ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-slate-200">
            <div className="flex items-center gap-3 mb-4 text-amber-400">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Mappls Authentication Required</h3>
                <p className="text-xs text-slate-400">Web SDK Static Key or OAuth 2.0 Token</p>
              </div>
            </div>

            {loadError && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div>{loadError}</div>
                  <div className="text-[11px] text-slate-400">
                    Note: REST API keys cannot be passed directly to the Web SDK. Use a <strong>Web Map SDK Static Key</strong> or generate an <strong>OAuth Token</strong> with your Client ID & Secret below.
                  </div>
                </div>
              </div>
            )}

            {/* Mode Switcher */}
            <div className="auth-tab-row mb-3">
              <button
                type="button"
                className={`auth-tab-btn ${authMode === 'static' ? 'active' : ''}`}
                onClick={() => setAuthMode('static')}
              >
                <Zap size={13} />
                Static Web Key
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${authMode === 'oauth' ? 'active' : ''}`}
                onClick={() => setAuthMode('oauth')}
              >
                <RefreshCw size={13} />
                OAuth 2.0 (ID + Secret)
              </button>
            </div>

            {authMode === 'static' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manualToken.trim()) {
                    onTokenChange(manualToken.trim());
                  }
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Mappls Web SDK Static Key
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 74xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Load North East Map
                </button>
              </form>
            ) : (
              <form onSubmit={handleOAuthGenerate} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Client ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 960xxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Client Secret
                  </label>
                  <input
                    type="password"
                    placeholder="e.g. lrFxJa5xxxxxxxxxxxxxxxxxxxx"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4" />
                  )}
                  {isGenerating ? 'Requesting Token...' : 'Generate OAuth Token & Load Map'}
                </button>
              </form>
            )}

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between items-center">
              <span>Get keys at <a href="https://auth.mappls.com/console" target="_blank" rel="noreferrer" className="text-cyan-300 underline">auth.mappls.com/console</a></span>
              <span>Whitelist: <code>localhost</code></span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
