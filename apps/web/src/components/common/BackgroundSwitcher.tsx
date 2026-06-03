'use client';
import { useEffect, useRef, useState } from 'react';
import { Palette, Check } from 'lucide-react';

/** Light-mode page backgrounds. `id` matches the html[data-ef-bg="…"] rules in
 *  globals.css; `swatch` is a mini preview rendered in the picker. */
const BACKGROUNDS = [
  { id: 'aurora', name: 'Aurora', swatch: 'radial-gradient(circle at 30% 20%, #c7d2fe, transparent 60%), radial-gradient(circle at 80% 80%, #99f6e4, transparent 60%), #f3f5fa' },
  { id: 'mesh', name: 'Mesh', swatch: 'radial-gradient(at 0% 0%, #c7d2fe 0, transparent 50%), radial-gradient(at 100% 0%, #99f6e4 0, transparent 50%), radial-gradient(at 100% 100%, #fde68a 0, transparent 50%), radial-gradient(at 0% 100%, #bfdbfe 0, transparent 50%), #f6f7fb' },
  { id: 'dots', name: 'Dots', swatch: 'radial-gradient(rgba(15,23,42,0.20) 1.2px, transparent 1.2px) 0 0 / 8px 8px, #f7f8fc' },
  { id: 'grid', name: 'Grid', swatch: 'linear-gradient(rgba(15,23,42,0.16) 1px, transparent 1px) 0 0/10px 10px, linear-gradient(90deg, rgba(15,23,42,0.16) 1px, transparent 1px) 0 0/10px 10px, #f7f8fc' },
  { id: 'warm', name: 'Warm', swatch: 'radial-gradient(circle at 80% 20%, #fde68a, transparent 60%), radial-gradient(circle at 10% 90%, #fecdd3, transparent 60%), #fdfaf3' },
  { id: 'plain', name: 'Plain', swatch: '#fbfcfe' },
] as const;

const DEFAULT_BG = 'aurora';

export function BackgroundSwitcher() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>(DEFAULT_BG);
  const ref = useRef<HTMLDivElement>(null);

  // Reflect the value the no-flash init script already applied.
  useEffect(() => {
    let saved = DEFAULT_BG;
    try {
      saved = localStorage.getItem('ef.bg') || DEFAULT_BG;
    } catch {
      /* ignore */
    }
    setActive(saved);
    document.documentElement.dataset.efBg = saved;
  }, []);

  // Close the popover on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (id: string) => {
    setActive(id);
    document.documentElement.dataset.efBg = id;
    try {
      localStorage.setItem('ef.bg', id);
    } catch {
      /* ignore */
    }
  };

  return (
    <div ref={ref} className="fixed bottom-5 left-5 z-50 print:hidden">
      {open && (
        <div className="mb-2 w-56 ef-card-strong p-3" style={{ boxShadow: 'var(--shadow-lift)' }}>
          <div className="ef-eyebrow mb-2">Background</div>
          <div className="grid grid-cols-3 gap-2">
            {BACKGROUNDS.map((b) => (
              <button
                key={b.id}
                onClick={() => pick(b.id)}
                title={b.name}
                aria-label={`Use ${b.name} background`}
                aria-pressed={active === b.id}
                className="relative rounded-lg overflow-hidden border transition-transform hover:scale-[1.04]"
                style={{
                  height: 44,
                  background: b.swatch,
                  borderColor: active === b.id ? 'var(--color-brand)' : 'var(--color-border)',
                  borderWidth: active === b.id ? 2 : 1,
                }}
              >
                {active === b.id && (
                  <span className="absolute inset-0 grid place-items-center" style={{ background: 'rgba(255,255,255,0.35)' }}>
                    <Check className="h-4 w-4 text-[var(--color-brand)]" strokeWidth={3} />
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="mt-2 text-center text-[11px] capitalize text-[var(--color-text-muted)]">{active}</div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Change background"
        aria-expanded={open}
        className="grid h-11 w-11 place-items-center rounded-full ef-card-strong transition-transform hover:scale-105"
        style={{ boxShadow: 'var(--shadow-lift)' }}
      >
        <Palette className="h-5 w-5 text-[var(--color-brand)]" />
      </button>
    </div>
  );
}
