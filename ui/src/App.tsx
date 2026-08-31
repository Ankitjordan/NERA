import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from './components/Header';
import { RouteSearchBox } from './components/RouteSearchBox';
import type { LocationPoint } from './components/RouteSearchBox';
import { TripDetailsCard } from './components/TripDetailsCard';
import { MockDriveControls } from './components/MockDriveControls';
import { MockDriveHUD } from './components/MockDriveHUD';
import { NavigationMap } from './components/NavigationMap';
import { TokenModal } from './components/TokenModal';
import { fetchRouteDirections, calculateBearing } from './services/mapplsRouteService';
import { MockDriveEngine } from './services/mockDriveEngine';
import type { MockDriveState } from './services/mockDriveEngine';
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

  // Mock Drive State
  const [isMockDriveActive, setIsMockDriveActive] = useState(false);
  const [isMockDrivePaused, setIsMockDrivePaused] = useState(false);
  const [mockDriveSpeed, setMockDriveSpeed] = useState(60);
  const [mockDriveProgress, setMockDriveProgress] = useState(0);
  const [mockDriveDistCovered, setMockDriveDistCovered] = useState(0);
  const [mockDriveTotalDist, setMockDriveTotalDist] = useState(0);
  const [mockDriveBearing, setMockDriveBearing] = useState(0);
  const mockDriveRef = useRef<MockDriveEngine | null>(null);

  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const watchGpsIdRef = useRef<number | null>(null);

  // Throttle mock drive state updates to avoid React thrashing during 60fps animation
  const lastMockUpdateRef = useRef(0);

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

  // Stop mock drive helper
  const stopMockDrive = useCallback(() => {
    if (mockDriveRef.current) {
      mockDriveRef.current.stop();
      mockDriveRef.current = null;
    }
    setIsMockDriveActive(false);
    setIsMockDrivePaused(false);
    setMockDriveProgress(0);
    setMockDriveDistCovered(0);
    setIsJourneyActive(false);
    setViewMode('overview');
    setUserSpeed(0);
  }, []);

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

  // Calculate Route
  const handleCalculateRoute = async (overrideOrigin?: LocationPoint, overrideDest?: LocationPoint) => {
    const activeOrigin = overrideOrigin || origin;
    const activeDest = overrideDest || destination;

    if (!activeOrigin || !activeDest) return;

    setIsLoadingRoute(true);
    setRouteError(null);
    handleEndJourney();
    stopMockDrive();

    try {
      const res = await fetchRouteDirections(
        { lat: activeOrigin.lat, lng: activeOrigin.lng },
        { lat: activeDest.lat, lng: activeDest.lng },
        'driving',
        token
      );
      setRoute(res);

      // Automatically compute initial forward travel direction from route coordinates
      if (res?.coordinates && res.coordinates.length >= 2) {
        const p1 = res.coordinates[0];
        const p2 = res.coordinates.length > 2 ? res.coordinates[2] : res.coordinates[1];
        const initHeading = Math.round(calculateBearing(p1[0], p1[1], p2[0], p2[1]));
        setUserBearing(initHeading);
      }
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
    stopMockDrive();
    setIsJourneyActive(true);
    setViewMode('3d');

    // Default position to origin coordinates if GPS not acquired yet
    if (origin && !userGpsPosition) {
      setUserGpsPosition([origin.lat, origin.lng]);
    }

    // Set initial vehicle heading facing along the route
    if (route?.coordinates && route.coordinates.length >= 2) {
      const p1 = route.coordinates[0];
      const p2 = route.coordinates.length > 2 ? route.coordinates[2] : route.coordinates[1];
      const initHeading = Math.round(calculateBearing(p1[0], p1[1], p2[0], p2[1]));
      setUserBearing(initHeading);
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

  // ── Mock Drive ────────────────────────────────────────────────
  const handleMockDriveUpdate = useCallback((state: MockDriveState) => {
    // Dispatch direct event to NavigationMap for buttery smooth 60fps movement
    window.dispatchEvent(new CustomEvent('mock-drive-update', { detail: state }));

    // Throttle React state updates to ~4fps for UI numbers to avoid DOM thrashing
    const now = performance.now();
    if (now - lastMockUpdateRef.current < 250 && !state.finished) return;
    lastMockUpdateRef.current = now;

    setUserSpeed(state.speedKmh);
    setMockDriveProgress(state.progress);
    setMockDriveDistCovered(state.distanceCoveredM);
    setMockDriveBearing(state.bearing);

    if (state.finished) {
      setIsMockDrivePaused(false);
      // Don't auto-stop — keep the final position visible
    }
  }, []);

  const handleStartMockDrive = useCallback(() => {
    if (!route?.coordinates?.length || route.coordinates.length < 2) return;

    // Stop any existing journey
    handleEndJourney();
    stopMockDrive();

    const engine = new MockDriveEngine(route.coordinates, mockDriveSpeed, handleMockDriveUpdate);
    mockDriveRef.current = engine;

    setIsMockDriveActive(true);
    setIsMockDrivePaused(false);
    setMockDriveTotalDist(route.distance || 0);
    setIsJourneyActive(true);
    setViewMode('3d');

    // Place vehicle at start
    const start = route.coordinates[0];
    setUserGpsPosition([start[0], start[1]]);

    // Set initial bearing
    if (route.coordinates.length >= 2) {
      const p1 = route.coordinates[0];
      const p2 = route.coordinates.length > 2 ? route.coordinates[2] : route.coordinates[1];
      setUserBearing(Math.round(calculateBearing(p1[0], p1[1], p2[0], p2[1])));
    }

    engine.start();
  }, [route, mockDriveSpeed, handleMockDriveUpdate, stopMockDrive]);

  const handlePauseMockDrive = useCallback(() => {
    mockDriveRef.current?.pause();
    setIsMockDrivePaused(true);
  }, []);

  const handleResumeMockDrive = useCallback(() => {
    mockDriveRef.current?.resume();
    setIsMockDrivePaused(false);
  }, []);

  const handleMockDriveSpeedChange = useCallback((speed: number) => {
    setMockDriveSpeed(speed);
    mockDriveRef.current?.setSpeed(speed);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchGpsIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchGpsIdRef.current);
      }
      mockDriveRef.current?.stop();
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
        <AnimatePresence>
          {!isMockDriveActive && (
            <motion.div 
              className="floating-sidebar-panel"
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
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
            <>
              <TripDetailsCard
                route={route}
                isJourneyActive={isJourneyActive && !isMockDriveActive}
                viewMode={viewMode}
                userSpeed={userSpeed}
                onStartJourney={handleStartJourney}
                onEndJourney={handleEndJourney}
                onToggleViewMode={handleToggleViewMode}
                onClose={() => { setRoute(null); stopMockDrive(); }}
              />

              <MockDriveControls
                onStart={handleStartMockDrive}
              />
            </>
          )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mock Drive HUD Overlay */}
        <AnimatePresence>
          {isMockDriveActive && (
            <MockDriveHUD
              isPaused={isMockDrivePaused}
              speedKmh={mockDriveSpeed}
              progress={mockDriveProgress}
              distanceCoveredM={mockDriveDistCovered}
              totalDistanceM={mockDriveTotalDist}
              currentBearing={mockDriveBearing}
              onPause={handlePauseMockDrive}
              onResume={handleResumeMockDrive}
              onStop={stopMockDrive}
              onSpeedChange={handleMockDriveSpeedChange}
            />
          )}
        </AnimatePresence>

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
