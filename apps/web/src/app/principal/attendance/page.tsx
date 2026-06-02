'use client';
import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Calendar as CalendarIcon, Users, Download } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api, session } from '@/lib/api';
import { downloadCsv } from '@/lib/export';

const ACCENT = '#dc2626';

type ClassRow = { id: string; label: string; sections: { id: string; name: string }[] };
type Row = { id: string; name: string; rollNumber: string | null; status: string | null };

type SectionStats = {
  section: { id: string; classLabel: string; name: string };
  total: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  pending: number;
  pct: number;
};

export default function PrincipalAttendancePage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [stats, setStats] = useState<SectionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Load all classes + their sections
  useEffect(() => {
    api<ClassRow[]>('/classes', { token: session.token(), subdomain: session.subdomain() })
      .then(setClasses)
      .catch((e) => setErr(e.message));
  }, []);

  // For each section, pull today's roll-call and aggregate
  useEffect(() => {
    if (!classes.length) return;
    setLoading(true);
    const allSections = classes.flatMap((c) =>
      c.sections.map((s) => ({ classLabel: c.label, ...s }))
    );

    Promise.all(
      allSections.map((sec) =>
        api<Row[]>(`/attendance/section/${sec.id}?date=${date}`, {
          token: session.token(), subdomain: session.subdomain(),
        })
          .then((rows) => {
            const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, HALF_DAY: 0, pending: 0 };
            for (const r of rows) {
              if (r.status === 'PRESENT')  counts.PRESENT++;
              else if (r.status === 'ABSENT')   counts.ABSENT++;
              else if (r.status === 'LATE')     counts.LATE++;
              else if (r.status === 'HALF_DAY') counts.HALF_DAY++;
              else counts.pending++;
            }
            const total = rows.length;
            const present = counts.PRESENT + counts.LATE + 0.5 * counts.HALF_DAY;
            const pct = total ? Math.round((present / total) * 100) : 0;
            return {
              section: { id: sec.id, classLabel: sec.classLabel, name: sec.name },
              total,
              present: counts.PRESENT,
              absent: counts.ABSENT,
              late: counts.LATE,
              halfDay: counts.HALF_DAY,
              pending: counts.pending,
              pct,
            } as SectionStats;
          })
          .catch(() => ({
            section: { id: sec.id, classLabel: sec.classLabel, name: sec.name },
            total: 0, present: 0, absent: 0, late: 0, halfDay: 0, pending: 0, pct: 0,
          })),
      ),
    ).then((results) => {
      setStats(results);
      setLoading(false);
    });
  }, [classes, date]);

  const overall = useMemo(() => {
    const acc = { total: 0, present: 0, absent: 0, late: 0, halfDay: 0, pending: 0 };
    for (const s of stats) {
      acc.total += s.total;
      acc.present += s.present;
      acc.absent += s.absent;
      acc.late += s.late;
      acc.halfDay += s.halfDay;
      acc.pending += s.pending;
    }
    const presentEffective = acc.present + acc.late + 0.5 * acc.halfDay;
    const pct = acc.total ? Math.round((presentEffective / acc.total) * 100) : 0;
    return { ...acc, pct };
  }, [stats]);

  return (
    <>
      <TopBar title="Attendance overview" eyebrow="Principal portal" />
      <div className="flex-1 p-6 space-y-5 max-w-7xl">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        {/* Header card with date picker */}
        <Card variant="solid">
          <CardBody className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-3">
              <span
                className="h-10 w-10 rounded-xl grid place-items-center"
                style={{ background: `${ACCENT}10`, color: ACCENT }}
              >
                <CalendarCheck className="h-5 w-5" />
              </span>
              <div>
                <div className="ef-eyebrow">School-wide</div>
                <h2 className="text-lg font-bold">Attendance summary</h2>
              </div>
            </div>
            <div className="ml-auto flex items-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const rows = stats.map((s) => ({
                    Class: s.section.classLabel,
                    Section: s.section.name,
                    Roll: s.total,
                    Present: s.present,
                    Absent: s.absent,
                    Late: s.late,
                    HalfDay: s.halfDay,
                    Pending: s.pending,
                    Percentage: s.pct,
                  }));
                  downloadCsv(`attendance-${date}.csv`, rows);
                }}
                disabled={!stats.length}
              >
                <Download className="h-4 w-4" /> CSV
              </Button>
              <div className="w-44">
                <Input
                  label="Date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Overall stats */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <BigStat label="Roll" value={overall.total} sub="students with sections" />
          <BigStat label="Present" value={overall.present} tone="success" />
          <BigStat label="Absent" value={overall.absent} tone="danger" />
          <BigStat label="Late" value={overall.late} tone="warn" />
          <BigStat label="Overall %" value={`${overall.pct}%`} tone={overall.pct >= 90 ? 'success' : overall.pct >= 75 ? 'warn' : 'danger'} />
        </section>

        {/* Per-section table */}
        <Card variant="solid">
          <CardHeader
            eyebrow="By section"
            title={`${stats.length} sections`}
            subtitle={loading ? 'Loading…' : `Showing roll-call for ${date}`}
          />
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-text-subtle)]">
                  <th className="px-5 py-3">Section</th>
                  <th className="px-5 py-3 text-right">Roll</th>
                  <th className="px-5 py-3 text-right">Present</th>
                  <th className="px-5 py-3 text-right">Absent</th>
                  <th className="px-5 py-3 text-right">Late</th>
                  <th className="px-5 py-3 text-right">Half-day</th>
                  <th className="px-5 py-3 text-right">Pending</th>
                  <th className="px-5 py-3 text-right w-28">%</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.section.id} className="border-b last:border-0 border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]/60">
                    <td className="px-5 py-3 font-medium">
                      {s.section.classLabel} <span className="text-[var(--color-text-muted)]">· {s.section.name}</span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-[var(--color-text-muted)]">{s.total}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-[var(--color-success)]">{s.present}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-[var(--color-danger)]">{s.absent}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-[var(--color-warn)]">{s.late}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-[var(--color-info)]">{s.halfDay}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-[var(--color-text-muted)]">{s.pending}</td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className="ef-chip"
                        style={{
                          background:
                            s.pct >= 90 ? '#ecfdf5' :
                            s.pct >= 75 ? '#fff7ed' :
                            '#fef2f2',
                          color:
                            s.pct >= 90 ? '#15803d' :
                            s.pct >= 75 ? '#b45309' :
                            '#b91c1c',
                          borderColor: 'transparent',
                        }}
                      >
                        {s.pct}%
                      </span>
                    </td>
                  </tr>
                ))}
                {stats.length === 0 && !loading && (
                  <tr><td colSpan={8} className="px-5 py-10 text-center text-[var(--color-text-muted)]">No sections.</td></tr>
                )}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function BigStat({
  label, value, sub, tone,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: 'success' | 'warn' | 'danger';
}) {
  const cls = tone === 'success' ? 'text-[var(--color-success)]'
    : tone === 'warn'   ? 'text-[var(--color-warn)]'
    : tone === 'danger' ? 'text-[var(--color-danger)]'
    : 'text-[var(--color-text)]';
  return (
    <Card className="p-5">
      <div className="ef-eyebrow">{label}</div>
      <div className={`mt-3 text-2xl font-bold tabular-nums tracking-tight ${cls}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-[var(--color-text-muted)]">{sub}</div>}
    </Card>
  );
}
