'use client';
import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api, session } from '@/lib/api';
import { useChildren } from '@/lib/use-children';
import { ChildHeader } from '@/components/parent/ChildHeader';

const ACCENT = '#0d9488';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type Period = {
  id: string;
  dayOfWeek: number;
  periodIndex: number;
  startTime: string;
  endTime: string;
  subject?: { id: string; name: string } | null;
};

export default function ParentTimetablePage() {
  const { children, activeChild, activeChildId, setActiveChildId } = useChildren();
  const [tt, setTt] = useState<any>(null);

  useEffect(() => {
    if (!activeChildId) return;
    api(`/timetable/student/${activeChildId}`, { token: session.token(), subdomain: session.subdomain() })
      .then(setTt)
      .catch(() => setTt(null));
  }, [activeChildId]);

  const periods: Period[] = tt?.timetable?.periods ?? [];
  const byDay: Record<number, Period[]> = {};
  for (const p of periods) (byDay[p.dayOfWeek] = byDay[p.dayOfWeek] || []).push(p);
  Object.values(byDay).forEach((arr) => arr.sort((a, b) => a.periodIndex - b.periodIndex));

  const allPeriodIndices = [...new Set(periods.map((p) => p.periodIndex))].sort((a, b) => a - b);

  return (
    <>
      <TopBar title="Timetable" eyebrow="Parent portal" />
      <div className="flex-1 p-6 space-y-5 max-w-6xl">
        <ChildHeader children={children} active={activeChild} onSwitch={setActiveChildId} />

        {!activeChild ? null : periods.length === 0 ? (
          <Card variant="solid">
            <CardBody className="p-10 text-center text-[var(--color-text-muted)]">
              No timetable set for {activeChild.student.name.split(' ')[0]}'s section yet.
            </CardBody>
          </Card>
        ) : (
          <Card variant="solid">
            <CardHeader
              eyebrow="Weekly grid"
              title="Schedule"
              subtitle={`${periods.length} periods per week`}
            />
            <CardBody className="p-0 overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-text-subtle)]">
                    <th className="px-3 py-3 text-left w-24">Period</th>
                    {DAYS.map((d) => <th key={d} className="px-3 py-3 text-left">{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {allPeriodIndices.map((idx) => {
                    const sample = periods.find((p) => p.periodIndex === idx);
                    return (
                      <tr key={idx} className="border-b last:border-0 border-[var(--color-border)]">
                        <td className="px-3 py-3 align-top">
                          <div className="font-bold tabular-nums">P{idx}</div>
                          {sample && (
                            <div className="text-xs text-[var(--color-text-muted)] tabular-nums">
                              {sample.startTime}–{sample.endTime}
                            </div>
                          )}
                        </td>
                        {DAYS.map((_, day) => {
                          const p = (byDay[day] ?? []).find((x) => x.periodIndex === idx);
                          return (
                            <td key={day} className="px-2 py-2 align-top min-w-[120px]">
                              {p ? (
                                <div
                                  className="p-2 rounded-lg text-xs"
                                  style={{ background: `${ACCENT}10`, border: `1px solid ${ACCENT}30` }}
                                >
                                  <div className="font-semibold" style={{ color: ACCENT }}>{p.subject?.name ?? '—'}</div>
                                </div>
                              ) : (
                                <div className="h-12" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
