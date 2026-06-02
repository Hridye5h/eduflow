'use client';
import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, session } from '@/lib/api';

const ACCENT = '#2563eb';

const STATUS_COLOR: Record<string, string> = {
  PRESENT:  '#15803d',
  ABSENT:   '#b91c1c',
  LATE:     '#b45309',
  HALF_DAY: '#0369a1',
  ON_LEAVE: '#4338ca',
};
const STATUS_BG: Record<string, string> = {
  PRESENT:  '#ecfdf5',
  ABSENT:   '#fef2f2',
  LATE:     '#fff7ed',
  HALF_DAY: '#eff6ff',
  ON_LEAVE: '#eef2ff',
};

type DayRecord = { date: string; status: string; note: string | null };

export default function StudentAttendancePage() {
  const me = session.user();
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current
  const [data, setData] = useState<{ percentage: number; records: DayRecord[]; totals: any } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const month = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return { ym: d.toISOString().slice(0, 7), label: d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), year: d.getFullYear(), m: d.getMonth() };
  }, [monthOffset]);

  useEffect(() => {
    if (!me) return;
    api<any>(`/attendance/student/${me.id}/month?month=${month.ym}`, {
      token: session.token(), subdomain: session.subdomain(),
    }).then(setData).catch((e) => setErr(e.message));
  }, [me?.id, month.ym]);

  // Build a calendar grid: 6 rows × 7 cols
  const grid = useMemo(() => {
    const first = new Date(month.year, month.m, 1);
    const last = new Date(month.year, month.m + 1, 0);
    const startDow = first.getDay(); // 0=Sun
    const days: Array<{ date: number; status: string | null; key: string } | null> = [];

    // Blank leading cells
    for (let i = 0; i < startDow; i++) days.push(null);
    // Days of month
    const byDate = new Map<string, string>();
    (data?.records ?? []).forEach((r) => {
      const d = new Date(r.date);
      byDate.set(d.toISOString().slice(0, 10), r.status);
    });
    for (let d = 1; d <= last.getDate(); d++) {
      const iso = new Date(Date.UTC(month.year, month.m, d)).toISOString().slice(0, 10);
      days.push({ date: d, status: byDate.get(iso) ?? null, key: iso });
    }
    // Pad to multiple of 7
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [data, month]);

  const totals = data?.totals ?? {};

  return (
    <>
      <TopBar title="My attendance" eyebrow="Student portal" />
      <div className="flex-1 p-6 space-y-5 max-w-5xl">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        {/* Big percentage hero */}
        <Card className="overflow-hidden">
          <div className="relative p-6">
            <div
              className="absolute inset-0 opacity-[0.05] pointer-events-none"
              style={{ background: `radial-gradient(circle at 100% 100%, ${ACCENT} 0%, transparent 60%)` }}
            />
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="ef-eyebrow">{month.label}</div>
                <div className="mt-1 flex items-baseline gap-3">
                  <span
                    className="text-5xl font-bold tabular-nums tracking-tight"
                    style={{
                      color:
                        (data?.percentage ?? 0) >= 90 ? 'var(--color-success)' :
                        (data?.percentage ?? 0) >= 75 ? 'var(--color-warn)' :
                        'var(--color-danger)',
                    }}
                  >
                    {data ? `${data.percentage}%` : '—'}
                  </span>
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {(data?.records?.length ?? 0)} day{(data?.records?.length ?? 0) === 1 ? '' : 's'} recorded
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setMonthOffset((o) => o - 1)} className="!p-2"><ChevronLeft className="h-4 w-4" /></Button>
                <Button
                  variant="outline"
                  onClick={() => setMonthOffset((o) => Math.min(o + 1, 0))}
                  disabled={monthOffset >= 0}
                  className="!p-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Totals strip */}
            <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE'] as const).map((s) => (
                <div
                  key={s}
                  className="p-3 rounded-lg border border-[var(--color-border)] bg-white text-center"
                >
                  <div className="ef-eyebrow" style={{ color: STATUS_COLOR[s], letterSpacing: '0.10em' }}>{s.replace('_', ' ')}</div>
                  <div className="text-xl font-bold tabular-nums mt-1">{totals[s] ?? 0}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Calendar */}
        <Card variant="solid">
          <CardHeader eyebrow="Calendar" title="Daily record" />
          <CardBody>
            <div className="grid grid-cols-7 gap-1 text-xs text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="ef-eyebrow py-1">{d}</div>
              ))}
              {grid.map((cell, i) => {
                if (!cell) return <div key={i} className="aspect-square" />;
                const s = cell.status;
                return (
                  <div
                    key={cell.key}
                    className="aspect-square rounded-lg border border-[var(--color-border)] grid place-items-center text-sm font-medium relative"
                    style={s ? {
                      background: STATUS_BG[s],
                      color: STATUS_COLOR[s],
                      borderColor: 'transparent',
                    } : {}}
                  >
                    {cell.date}
                    {s && (
                      <span
                        className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full"
                        style={{ background: STATUS_COLOR[s] }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>

        {/* List view */}
        <Card variant="solid">
          <CardHeader eyebrow="History" title={`${data?.records?.length ?? 0} records this month`} />
          <CardBody className="p-0">
            {!data?.records?.length ? (
              <div className="p-8 text-center text-[var(--color-text-muted)]">No records yet.</div>
            ) : (
              <ul>
                {data.records.slice().reverse().map((r) => (
                  <li key={r.date} className="px-5 py-3 border-b last:border-0 border-[var(--color-border)] flex items-center justify-between">
                    <span className="text-sm">
                      {new Date(r.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <span
                      className="ef-chip"
                      style={{
                        background: STATUS_BG[r.status],
                        color: STATUS_COLOR[r.status],
                        borderColor: 'transparent',
                      }}
                    >
                      {r.status.replace('_', ' ')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
