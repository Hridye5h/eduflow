'use client';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, MessageCircle, X, Send } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, session } from '@/lib/api';
import { useChildren } from '@/lib/use-children';
import { ChildHeader } from '@/components/parent/ChildHeader';

const ACCENT = '#0d9488';

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

export default function ParentAttendancePage() {
  const { children, activeChild, activeChildId, setActiveChildId } = useChildren();

  const [monthOffset, setMonthOffset] = useState(0);
  const [data, setData] = useState<{ percentage: number; records: DayRecord[]; totals: any } | null>(null);

  // Explain-absence modal state
  const [absenceDate, setAbsenceDate] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submittingExplain, setSubmittingExplain] = useState(false);
  const [explainOk, setExplainOk] = useState(false);

  async function submitExplain() {
    if (!absenceDate || !activeChildId || !reason.trim()) return;
    setSubmittingExplain(true);
    try {
      await api('/attendance/leaves', {
        method: 'POST',
        token: session.token(), subdomain: session.subdomain(),
        body: JSON.stringify({
          studentId: activeChildId,
          fromDate: absenceDate,
          toDate: absenceDate,
          reason: reason.trim(),
        }),
      });
      setExplainOk(true);
      setTimeout(() => {
        setAbsenceDate(null);
        setReason('');
        setExplainOk(false);
      }, 1600);
    } catch {
      // soft fail — keep modal open
    } finally {
      setSubmittingExplain(false);
    }
  }

  const month = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return { ym: d.toISOString().slice(0, 7), label: d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), year: d.getFullYear(), m: d.getMonth() };
  }, [monthOffset]);

  useEffect(() => {
    if (!activeChildId) return;
    api<any>(`/attendance/student/${activeChildId}/month?month=${month.ym}`, {
      token: session.token(), subdomain: session.subdomain(),
    }).then(setData).catch(() => setData(null));
  }, [activeChildId, month.ym]);

  const grid = useMemo(() => {
    const first = new Date(month.year, month.m, 1);
    const last = new Date(month.year, month.m + 1, 0);
    const startDow = first.getDay();
    const days: Array<{ date: number; status: string | null; key: string } | null> = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    const byDate = new Map<string, string>();
    (data?.records ?? []).forEach((r) => {
      const d = new Date(r.date);
      byDate.set(d.toISOString().slice(0, 10), r.status);
    });
    for (let d = 1; d <= last.getDate(); d++) {
      const iso = new Date(Date.UTC(month.year, month.m, d)).toISOString().slice(0, 10);
      days.push({ date: d, status: byDate.get(iso) ?? null, key: iso });
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [data, month]);

  const totals = data?.totals ?? {};

  return (
    <>
      <TopBar title="Attendance" eyebrow="Parent portal" />
      <div className="flex-1 p-6 space-y-5 max-w-5xl">
        <ChildHeader children={children} active={activeChild} onSwitch={setActiveChildId} />

        <Card className="overflow-hidden">
          <div className="relative p-6">
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
              style={{ background: `radial-gradient(circle at 100% 100%, ${ACCENT} 0%, transparent 60%)` }} />
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
                <Button variant="outline" onClick={() => setMonthOffset((o) => Math.min(o + 1, 0))} disabled={monthOffset >= 0} className="!p-2"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE'] as const).map((s) => (
                <div key={s} className="p-3 rounded-lg border border-[var(--color-border)] bg-white text-center">
                  <div className="ef-eyebrow" style={{ color: STATUS_COLOR[s], letterSpacing: '0.10em' }}>{s.replace('_', ' ')}</div>
                  <div className="text-xl font-bold tabular-nums mt-1">{totals[s] ?? 0}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

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
                const isAbsent = s === 'ABSENT';
                const tile = (
                  <div
                    className={`aspect-square rounded-lg border border-[var(--color-border)] grid place-items-center text-sm font-medium relative transition-transform ${isAbsent ? 'hover:scale-[1.04] cursor-pointer' : ''}`}
                    style={s ? { background: STATUS_BG[s], color: STATUS_COLOR[s], borderColor: 'transparent' } : {}}
                    title={isAbsent ? 'Tap to explain this absence' : undefined}
                  >
                    {cell.date}
                    {s && <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLOR[s] }} />}
                    {isAbsent && (
                      <MessageCircle
                        className="absolute top-1 right-1 h-2.5 w-2.5 opacity-70"
                        style={{ color: STATUS_COLOR[s] }}
                      />
                    )}
                  </div>
                );
                return isAbsent ? (
                  <button
                    key={cell.key}
                    onClick={() => { setAbsenceDate(cell.key); setReason(''); setExplainOk(false); }}
                    className="appearance-none p-0 m-0 bg-transparent border-0"
                  >
                    {tile}
                  </button>
                ) : (
                  <div key={cell.key}>{tile}</div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Explain-absence modal */}
      {absenceDate && (
        <div
          className="fixed inset-0 z-[200] grid place-items-center p-4"
          style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => !submittingExplain && setAbsenceDate(null)}
        >
          <div
            className="w-full max-w-md ef-card-strong"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-[var(--color-border)] flex items-start gap-3">
              <span
                className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
                style={{ background: 'rgba(220,38,38,0.10)', color: 'var(--color-danger)' }}
              >
                <MessageCircle className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="ef-eyebrow">Explain absence</div>
                <h3 className="font-semibold text-[var(--color-text)] mt-0.5">
                  {new Date(absenceDate).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Sends a leave application to the class teacher for this day.
                </p>
              </div>
              <button
                onClick={() => setAbsenceDate(null)}
                disabled={submittingExplain}
                className="h-8 w-8 grid place-items-center rounded-md hover:bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {explainOk ? (
                <div
                  className="rounded-xl border p-4 text-sm flex items-start gap-3"
                  style={{
                    background: 'rgba(22,163,74,0.08)',
                    borderColor: 'rgba(22,163,74,0.30)',
                  }}
                >
                  <span className="text-[var(--color-success)]">✓</span>
                  <div>
                    <div className="font-semibold">Sent</div>
                    <p className="text-[var(--color-text-muted)] mt-0.5">
                      Your reason has been forwarded to the class teacher.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <label className="block">
                    <span className="ef-eyebrow block mb-1.5">Reason</span>
                    <textarea
                      className="ef-input min-h-[6rem]"
                      placeholder="e.g. Fever — visiting the doctor today"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      autoFocus
                    />
                  </label>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      variant="ghost"
                      onClick={() => setAbsenceDate(null)}
                      disabled={submittingExplain}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={submitExplain}
                      disabled={submittingExplain || !reason.trim()}
                    >
                      <Send className="h-4 w-4" /> {submittingExplain ? 'Sending…' : 'Send to teacher'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
