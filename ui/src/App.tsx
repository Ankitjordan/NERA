import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { RouteSearchBox } from './components/RouteSearchBox';
import type { LocationPoint } from './components/RouteSearchBox';
import { TripDetailsCard } from './components/TripDetailsCard';
import { NavigationMap } from './components/NavigationMap';
import { TokenModal } from './components/TokenModal';
import { fetchRouteDirections } from './services/mapplsRouteService';
import type { RouteResult } from './services/mapplsRouteService';
import './App.css';

export function App() {
  const [token, setToken] = useState<string>(() => {
    return (
      import.meta.env.VITE_MAPPLS_ACCESS_TOKEN ||
      import.meta.env.VITE_MAPPLS_API_KEY ||
      localStorage.getItem('mappls_access_token') ||
      'yaoybulvostfucnysfxuqpjnreysiaefstmw'
    );
  });

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [viewMode, setViewMode] = useState<'3d' | '2d' | 'overview'>('3d');

  // Start with default route: Guwahati to Shillong
  const [origin, setOrigin] = useState<LocationPoint | null>({
    name: 'Guwahati, Assam',
    lat: 26.1445,
    lng: 91.7362,
  });

  const [destination, setDestination] = useState<LocationPoint | null>({
    name: 'Shillong, Meghalaya',
    lat: 25.5788,
    lng: 91.8933,
  });

  const [route, setRoute] = useState<RouteResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Real Journey Navigation & Device GPS State
  const [isJourneyActive, setIsJourneyActive] = useState(false);
  const [userGpsPosition, setUserGpsPosition] = useState<[number, number] | null>(null);
  const [userBearing, setUserBearing] = useState(0);
  const [userSpeed, setUserSpeed] = useState(0); // km/h

  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const watchGpsIdRef = useRef<number | null>(null);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('nera_theme', nextTheme);
  };

  const handleToggleViewMode = () => {
    setViewMode((prev) => {
      if (prev === '3d') return '2d';
      if (prev === '2d') return 'overview';
      return '3d';
    });
  };

  const handleTokenChange = (newToken: string) => {
    setToken(newToken);
    if (newToken) {
      localStorage.setItem('mappls_access_token', newToken);
    } else {
      localStorage.removeItem('mappls_access_token');
    }
  };

  // Calculate Route
  const handleCalculateRoute = async (overrideOrigin?: LocationPoint, overrideDest?: LocationPoint) => {
    const activeOrigin = overrideOrigin || origin;
    const activeDest = overrideDest || destination;

    if (!activeOrigin || !activeDest) return;

    setIsLoadingRoute(true);
    setRouteError(null);
    handleEndJourney();

    try {
      const res = await fetchRouteDirections(
        { lat: activeOrigin.lat, lng: activeOrigin.lng },
        { lat: activeDest.lat, lng: activeDest.lng },
        'driving',
        token
      );
      setRoute(res);
    } catch (err: any) {
      console.error('Failed to calculate route:', err);
      setRouteError(err?.message || 'Could not calculate directions between points.');
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // Auto-calculate on initial load
  useEffect(() => {
    if (token && origin && destination && !route) {
      handleCalculateRoute();
    }
  }, [token]);

  // Start Real Journey
  const handleStartJourney = () => {
    setIsJourneyActive(true);
    setViewMode('3d');

    // Default position to origin coordinates if GPS not acquired yet
    if (origin && !userGpsPosition) {
      setUserGpsPosition([origin.lat, origin.lng]);
    }

    // Connect to real device GPS
    if (navigator.geolocation) {
      watchGpsIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const heading = pos.coords.heading || 0;
          const speedKmH = pos.coords.speed ? pos.coords.speed * 3.6 : 0;

          setUserGpsPosition([lat, lng]);
          if (heading) setUserBearing(heading);
          setUserSpeed(speedKmH);
        },
        (err) => {
          console.warn('GPS location tracking error:', err);
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
      );
    }
  };

  // End Journey
  const handleEndJourney = () => {
    if (watchGpsIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchGpsIdRef.current);
      watchGpsIdRef.current = null;
    }
    setIsJourneyActive(false);
    setViewMode('overview');
    setUserSpeed(0);
  };

  // Clean up GPS watcher on unmount
  useEffect(() => {
    return () => {
      if (watchGpsIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchGpsIdRef.current);
      }
    };
  }, []);

  return (
    <div className={`nav-app-root ${theme}`}>
      {/* Top Header */}
      <Header
        token={token}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenTokenModal={() => setIsTokenModalOpen(true)}
      />

      {/* Main Container */}
      <div className="nav-main-layout">
        {/* Floating Route Planner & Trip Panel */}
        <div className="floating-sidebar-panel">
          <RouteSearchBox
            token={token}
            origin={origin}
            destination={destination}
            isLoadingRoute={isLoadingRoute}
            onSetOrigin={setOrigin}
            onSetDestination={setDestination}
            onCalculateRoute={handleCalculateRoute}
          />

          {routeError && (
            <div className="route-error-banner">
              <span>{routeError}</span>
            </div>
          )}

          {route && origin && destination && (
            <TripDetailsCard
              route={route}
              isJourneyActive={isJourneyActive}
              viewMode={viewMode}
              userSpeed={userSpeed}
              onStartJourney={handleStartJourney}
              onEndJourney={handleEndJourney}
              onToggleViewMode={handleToggleViewMode}
              onClose={() => setRoute(null)}
            />
          )}
        </div>

        {/* Map View */}
        <main className="map-canvas-area">
          <NavigationMap
            token={token}
            theme={theme}
            origin={origin}
            destination={destination}
            route={route}
            isJourneyActive={isJourneyActive}
            viewMode={viewMode}
            userGpsPosition={userGpsPosition}
            userBearing={userBearing}
            onToggleTheme={handleToggleTheme}
            onToggleViewMode={handleToggleViewMode}
            onOpenTokenModal={() => setIsTokenModalOpen(true)}
          />
        </main>
      </div>

      {/* Token Modal */}
      <TokenModal
        isOpen={isTokenModalOpen}
        currentToken={token}
        onClose={() => setIsTokenModalOpen(false)}
        onSaveToken={handleTokenChange}
      />
    </div>
  );
}

export default App;
