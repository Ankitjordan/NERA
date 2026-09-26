import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Square } from 'lucide-react';
import { formatDistance } from '../services/mapplsRouteService';
import { useI18n } from '../i18n';

interface MockDriveHUDProps {
  isPaused: boolean;
  speedKmh: number;
  progress: number;
  distanceCoveredM: number;
  totalDistanceM: number;
  currentBearing: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
}

const MIN_SPEED = 20;
const MAX_SPEED = 120;
const SPEED_STEP = 5;

export const MockDriveHUD: React.FC<MockDriveHUDProps> = ({
  isPaused,
  speedKmh,
  distanceCoveredM,
  totalDistanceM,
  currentBearing,
  onPause,
  onResume,
  onStop,
  onSpeedChange,
}) => {
  const { t } = useI18n();
  const dialRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calculateSpeedFromEvent = (e: React.PointerEvent) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + (150 / 175) * rect.height; // Center aligned with SVG coordinate (160, 150)

    const dx = e.clientX - cx;
    const dy = cy - e.clientY; // standard cartesian Y (up is positive)

    let angleRad = Math.atan2(dy, dx);
    if (angleRad < 0) angleRad = 0;
    if (angleRad > Math.PI) angleRad = Math.PI;

    // angleRad is between 0 (right) and PI (left)
    // We want 20 at left (PI) and 120 at right (0)
    let newSpeed = MAX_SPEED - (angleRad / Math.PI) * (MAX_SPEED - MIN_SPEED);

    // Snap to steps
    newSpeed = Math.round(newSpeed / SPEED_STEP) * SPEED_STEP;
    newSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, newSpeed));

    if (newSpeed !== speedKmh) {
      onSpeedChange(newSpeed);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as Element).setPointerCapture(e.pointerId);
    calculateSpeedFromEvent(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    calculateSpeedFromEvent(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  // Calculate needle angle (-90deg is left/20kmh, +90deg is right/120kmh)
  const needleAngle = ((speedKmh - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)) * 180 - 90;

  // Generate ticks
  const ticks = [];
  for (let s = MIN_SPEED; s <= MAX_SPEED; s += 10) {
    const angle = ((s - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)) * 180 - 90;
    ticks.push({ speed: s, angle });
  }

  return (
    <>
      {/* Top Slim HUD */}
      <motion.div
        className="mock-drive-hud-container"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="hud-top-bar">
          <div className="hud-stats">
            <div className="hud-stat-item">
              <span className="hud-stat-val">{Math.round(speedKmh)}</span>
              <span className="hud-stat-unit">km/h</span>
            </div>
            <div className="hud-stat-item">
              <span className="hud-stat-val">{formatDistance(distanceCoveredM)}</span>
              <span className="hud-stat-unit">{t('covered')}</span>
            </div>
            <div className="hud-stat-item">
              <span className="hud-stat-val">{formatDistance(totalDistanceM - distanceCoveredM)}</span>
              <span className="hud-stat-unit">{t('left')}</span>
            </div>
            <div className="hud-stat-item">
              <span className="hud-stat-val">{currentBearing}°</span>
              <span className="hud-stat-unit">{t('heading')}</span>
            </div>
          </div>

          <div className="hud-actions">
            {isPaused ? (
              <button className="hud-action-btn" onClick={onResume} title={t('resume')}>
                <Play size={16} fill="currentColor" />
              </button>
            ) : (
              <button className="hud-action-btn" onClick={onPause} title={t('pause')}>
                <Pause size={16} fill="currentColor" />
              </button>
            )}
            <button className="hud-action-btn stop" onClick={onStop} title={t('exitMockTest')}>
              <Square size={16} fill="currentColor" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Bottom Semi-Circular Speed Dial */}
      <motion.div
        className="speed-dial-wrapper"
        initial={{ y: 150, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 150, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200, delay: 0.1 }}
      >
        <div className="speed-dial-semi-container">
          <svg
            ref={dialRef}
            width="320"
            height="175"
            viewBox="0 0 320 175"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ touchAction: 'none', cursor: isDragging ? 'grabbing' : 'grab', overflow: 'visible' }}
          >
            <defs>
              <filter id="dial-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="inner-shadow">
                <feOffset dx="0" dy="3" />
                <feGaussianBlur stdDeviation="3" result="offset-blur" />
                <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                <feFlood floodColor="black" floodOpacity="0.7" result="color" />
                <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                <feComposite operator="over" in="shadow" in2="SourceGraphic" />
              </filter>
              <linearGradient id="track-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00C250" />
                <stop offset="60%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>

            {/* Dial Casing / Background Arc */}
            <path
              d="M 65 150 A 95 95 0 0 1 255 150"
              fill="none"
              stroke="rgba(10, 10, 10, 0.85)"
              strokeWidth="32"
              filter="url(#inner-shadow)"
            />

            {/* Active Glow Track */}
            <path
              d="M 65 150 A 95 95 0 0 1 255 150"
              fill="none"
              stroke="url(#track-gradient)"
              strokeWidth="32"
              strokeDasharray="298.45"
              strokeDashoffset={298.45 - (298.45 * ((speedKmh - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)))}
              style={{ transition: isDragging ? 'none' : 'stroke-dashoffset 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />

            {/* Inner Ring */}
            <path
              d="M 80 150 A 80 80 0 0 1 240 150"
              fill="none"
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="2"
            />

            {/* Ticks and Labels */}
            {ticks.map((t, i) => {
              const isMajor = i % 2 === 0;
              return (
                <g key={t.speed} transform={`translate(160, 150) rotate(${t.angle})`}>
                  <line
                    x1="0" y1={-108}
                    x2="0" y2={isMajor ? -116 : -112}
                    stroke="rgba(255,255,255,0.75)"
                    strokeWidth={isMajor ? "2" : "1"}
                  />
                  {isMajor && (
                    <text
                      x="0" y="-128"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="var(--text-main)"
                      fontSize="11"
                      fontWeight="700"
                      style={{ textShadow: '0 2px 4px rgba(0,0,0,0.85)' }}
                      transform={`rotate(${-t.angle}, 0, -128)`}
                    >
                      {t.speed}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Needle */}
            <g transform={`translate(160, 150) rotate(${needleAngle})`} style={{ transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}>
              {/* Sharp Needle pointer */}
              <polygon points="-4,-16 0,-102 4,-16" fill="#ffffff" filter="url(#dial-glow)" />
              {/* Center Cap Base (Dark Metallic) */}
              <circle cx="0" cy="0" r="20" fill="#111" stroke="#333" strokeWidth="2" filter="url(#inner-shadow)" />
              <circle cx="0" cy="0" r="14" fill="#1a1a1a" stroke="#444" strokeWidth="1" />
              {/* Center Cap Core */}
              <circle cx="0" cy="0" r="7" fill="#ffffff" filter="url(#dial-glow)" />
            </g>
          </svg>
          <div className="speed-dial-title">{t('cruisingSpeed')}</div>
        </div>
      </motion.div>
    </>
  );
};
