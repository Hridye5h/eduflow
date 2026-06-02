'use client';
import { useEffect, useState } from 'react';

const PHASES = [
  'INITIALIZING SECURE CONNECTION',
  'LOADING SCHOOL CONFIGURATION',
  'SYNCING CLASSES & ROSTERS',
  'PREPARING EDUFLOW HUB',
];

/**
 * Premium loader with an animated circular percentage ring.
 * Percent eases from 0 → 95 (held), then jumps to 100 if `done` is set.
 * Status text below cycles through phases.
 */
export function PremiumLoader({
  label,
  done = false,
}: {
  label?: string;
  /** When true, the ring fills to 100% before unmount. */
  done?: boolean;
}) {
  const [pct, setPct] = useState(0);
  const [phase, setPhase] = useState(0);

  // Smooth tick-up to ~95%, then hold; finish if `done`
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      setPct((p) => {
        if (done) return p < 100 ? Math.min(100, p + 6) : 100;
        if (p >= 95) return 95;
        const delta = p < 25 ? 3.5 : p < 55 ? 2.2 : p < 80 ? 1.3 : 0.6;
        return Math.min(95, p + delta);
      });
    };
    const interval = setInterval(tick, 70);
    return () => { cancelled = true; clearInterval(interval); };
  }, [done]);

  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p + 1) % PHASES.length), 1100);
    return () => clearInterval(t);
  }, []);

  // SVG progress arc geometry
  const size = 160;
  const stroke = 8;
  const center = size / 2;
  const radius = (size - stroke) / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const displayPct = Math.floor(pct);

  // Orbiting dot position
  const angle = (pct / 100) * 2 * Math.PI - Math.PI / 2;
  const dotX = center + Math.cos(angle) * radius;
  const dotY = center + Math.sin(angle) * radius;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Soft glow halo */}
        <div
          className="absolute inset-0 rounded-full pulse-soft"
          style={{
            background:
              'radial-gradient(closest-side, rgba(79,70,229,0.20), rgba(20,184,166,0.10), transparent 70%)',
            filter: 'blur(10px)',
          }}
        />

        {/* The ring itself */}
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id="ef-loader-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
          </defs>

          {/* Group rotated by -90deg so 0% sits at top */}
          <g transform={`rotate(-90 ${center} ${center})`}>
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="rgba(15,23,42,0.06)"
              strokeWidth={stroke}
            />
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="url(#ef-loader-grad)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.18s ease' }}
            />
          </g>

          {/* Orbiting accent dot at the leading edge */}
          {pct > 4 && (
            <circle
              cx={dotX}
              cy={dotY}
              r={6}
              fill="#fff"
              stroke="url(#ef-loader-grad)"
              strokeWidth={2.5}
              style={{ filter: 'drop-shadow(0 4px 12px rgba(79,70,229,0.45))' }}
            />
          )}
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center">
            <div className="text-4xl font-bold tabular-nums tracking-tight leading-none">
              {displayPct}
              <span className="text-lg text-[var(--color-text-muted)] ml-0.5">%</span>
            </div>
            <div className="ef-eyebrow mt-1.5">EduFlow</div>
          </div>
        </div>
      </div>

      <h1 className="mt-8 text-xl font-bold tracking-[0.22em] uppercase">
        Edu<span style={{
          background: 'linear-gradient(90deg, #4f46e5, #14b8a6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>Flow</span>
      </h1>

      <div className="mt-3 flex items-center gap-2 text-xs font-mono text-[var(--color-text-muted)] tracking-widest">
        <span className="w-1.5 h-4 bg-[var(--color-accent)] animate-pulse" />
        <p>{label ?? PHASES[phase]}</p>
      </div>

      {/* Cute mini hint */}
      <p className="mt-6 text-xs text-[var(--color-text-subtle)] max-w-xs text-center leading-relaxed">
        Hang tight — Render's free tier can take ~30 s to wake up after idle.
      </p>
    </div>
  );
}

export default PremiumLoader;
