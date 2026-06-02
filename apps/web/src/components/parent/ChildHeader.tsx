'use client';
import { Users as ParentIcon, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import type { Child } from '@/lib/use-children';

const ACCENT = '#0d9488';

/**
 * Child context strip shown at the top of every parent page.
 * Compact card with the child's avatar, name + section, and a
 * dropdown switcher when the parent has more than one linked child.
 */
export function ChildHeader({
  children: kids,
  active,
  onSwitch,
}: {
  children: Child[];
  active: Child | null;
  onSwitch: (studentId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!active) {
    return (
      <Card variant="solid" className="p-4 text-sm text-[var(--color-text-muted)]">
        No linked children found on your account. Ask the school office to link you to your child's profile.
      </Card>
    );
  }

  const s = active.student;
  const sectionLabel = s.section ? `${s.section.class.label} · Section ${s.section.name}` : '—';

  return (
    <Card variant="solid" className="overflow-visible">
      <div className="p-4 flex items-center gap-4">
        <div
          className="h-12 w-12 rounded-xl grid place-items-center text-white font-bold text-lg shrink-0"
          style={{
            background: `linear-gradient(135deg, ${ACCENT} 0%, #06b6d4 100%)`,
            boxShadow: `0 6px 18px ${ACCENT}55`,
          }}
        >
          {s.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="ef-eyebrow inline-flex items-center gap-1.5">
            <ParentIcon className="h-3 w-3" /> Your child
          </div>
          <div className="font-semibold text-[var(--color-text)] truncate mt-0.5">{s.name}</div>
          <div className="text-xs text-[var(--color-text-muted)]">
            {sectionLabel} · Roll {s.rollNumber || '—'}
          </div>
        </div>

        {kids.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setOpen((o) => !o)}
              className="ef-btn ef-btn-outline text-sm"
            >
              Switch child <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[var(--color-border)] bg-white shadow-[0_20px_50px_rgba(15,23,42,0.18)] p-1.5 z-50">
                {kids.map((c) => {
                  const me = c.student.id === active.student.id;
                  return (
                    <button
                      key={c.student.id}
                      onClick={() => { onSwitch(c.student.id); setOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm hover:bg-[var(--color-surface-muted)] ${me ? 'font-semibold' : ''}`}
                    >
                      <div
                        className="h-7 w-7 rounded-md grid place-items-center text-white font-bold text-xs shrink-0"
                        style={{ background: `linear-gradient(135deg, ${ACCENT}, #06b6d4)` }}
                      >
                        {c.student.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0 truncate">
                        {c.student.name}
                        <div className="text-xs text-[var(--color-text-muted)] truncate">
                          {c.student.section?.class.label} · {c.student.section?.name}
                        </div>
                      </div>
                      {me && <span className="ef-chip ef-role-parent">Active</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
