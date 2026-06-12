'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, GraduationCap, Building2, CalendarCheck, BookOpenCheck, Wallet,
  Megaphone, BarChart3, ArrowRight, AlertTriangle, ShieldAlert, Sparkles,
} from 'lucide-react';
import { api, session } from '@/lib/api';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart,
} from 'recharts';

type Stats = {
  students: number;
  teachers: number;
  classes: number;
  sections: number;
  todayAttendance: Array<{ status: string; _count: { _all: number } }>;
};

type AttendanceTrend = { since: string; series: Array<{ date: string; present: number; absent: number; late: number; percentage: number }> };

type AtRiskStudent = {
  studentId: string;
  attendancePct: number | null;
  avgMarksPct: number | null;
  reasons: string[];
  student: { id: string; name: string; rollNumber: string | null; sectionId: string | null } | null;
};

const ACCENT = '#dc2626';

export default function PrincipalDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [attendance, setAttendance] = useState<AttendanceTrend | null>(null);
  const [atRisk, setAtRisk] = useState<AtRiskStudent[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const user = session.user();

  useEffect(() => {
    const t = session.token();
    const s = session.subdomain();
    // Settle each independently — a single slow/failed report (at-risk and
    // marks are heavy on the free tier) must not blank the entire dashboard.
    Promise.allSettled([
      api<Stats>('/school/stats', { token: t, subdomain: s }),
      api<AttendanceTrend>('/reports/attendance?days=30', { token: t, subdomain: s }),
      api<AtRiskStudent[]>('/reports/at-risk', { token: t, subdomain: s }),
      api<any[]>('/reports/marks', { token: t, subdomain: s }),
    ]).then(([r1, r2, r3, r4]) => {
      if (r1.status === 'fulfilled') setStats(r1.value);
      if (r2.status === 'fulfilled') setAttendance(r2.value);
      if (r3.status === 'fulfilled') setAtRisk(r3.value);
      if (r4.status === 'fulfilled') setMarks(r4.value);
      const failed = [r1, r2, r3, r4].find((r) => r.status === 'rejected');
      if (failed && failed.status === 'rejected') {
        setErr(failed.reason?.message ?? 'Some dashboard data could not be loaded.');
      }
    });
  }, []);

  const todayPresent = stats?.todayAttendance.find((t) => t.status === 'PRESENT')?._count._all ?? 0;
  const todayAbsent  = stats?.todayAttendance.find((t) => t.status === 'ABSENT')?._count._all  ?? 0;
  const total = stats?.students ?? 0;
  const todayPct = total ? Math.round((todayPresent / total) * 100) : 0;
  const yesterday = attendance?.series?.[attendance.series.length - 2];

  return (
    <>
      <TopBar
        title={`Good ${greet()}, ${user?.name?.split(' ')[0] ?? 'Principal'}`}
        eyebrow="Principal portal"
      />
      <div className="flex-1 p-6 space-y-6 max-w-7xl">
        {err && (
          <Card className="p-4 text-sm text-[var(--color-danger)] flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {err}
          </Card>
        )}

        {/* Hero — school identity card */}
        <HeroCard
          schoolSubdomain={session.subdomain() ?? '—'}
          academicYear="2026-2027"
        />

        {/* Empty school → offer one-click sample data */}
        {stats && stats.students === 0 && <SampleDataCard />}

        {/* Stats row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <BigStat
            label="Students"
            value={stats?.students ?? '—'}
            icon={<Users className="h-5 w-5" />}
            sub="enrolled"
          />
          <BigStat
            label="Teachers"
            value={stats?.teachers ?? '—'}
            icon={<GraduationCap className="h-5 w-5" />}
            sub="on staff"
          />
          <BigStat
            label="Classes / Sections"
            value={`${stats?.classes ?? '—'} / ${stats?.sections ?? '—'}`}
            icon={<Building2 className="h-5 w-5" />}
            sub="active"
          />
          <BigStat
            label="Today’s attendance"
            value={`${todayPct}%`}
            icon={<CalendarCheck className="h-5 w-5" />}
            sub={`${todayPresent} present · ${todayAbsent} absent`}
            tone={todayPct >= 90 ? 'success' : todayPct >= 75 ? 'warn' : 'danger'}
          />
        </section>

        {/* Attendance trend chart */}
        <Card variant="solid" className="overflow-hidden">
          <CardHeader
            eyebrow="Live signal"
            title="30-day attendance trend"
            subtitle={attendance?.series?.length ? `${attendance.series.length} school days · last from ${attendance.series[attendance.series.length-1]?.date}` : 'No data yet'}
            right={
              yesterday && (
                <div className="text-right">
                  <div className="ef-eyebrow">Yesterday</div>
                  <div className="text-2xl font-bold tabular-nums mt-1">{yesterday.percentage}%</div>
                </div>
              )
            }
          />
          <div className="h-64">
            {attendance?.series?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendance.series} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
                  <defs>
                    <linearGradient id="attFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ACCENT} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(255,255,255,0.96)',
                      border: '1px solid rgba(15,23,42,0.08)',
                      borderRadius: '12px',
                      boxShadow: '0 12px 32px rgba(15,23,42,0.10)',
                    }}
                  />
                  <Area type="monotone" dataKey="percentage" stroke={ACCENT} strokeWidth={2} fill="url(#attFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-sm text-[var(--color-text-muted)]">
                No attendance data yet.
              </div>
            )}
          </div>
        </Card>

        {/* Two-column row: at-risk + quick actions */}
        <section className="grid lg:grid-cols-3 gap-4">
          {/* At-risk students */}
          <Card variant="solid" className="lg:col-span-2 overflow-hidden">
            <CardHeader
              eyebrow="Flagged"
              title="At-risk students"
              subtitle={atRisk.length === 0 ? 'All students are on track.' : `${atRisk.length} flagged for low attendance or marks`}
              right={
                <Link href="/principal/reports" className="ef-btn ef-btn-ghost text-sm">
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
            {atRisk.length === 0 ? (
              <CardBody className="text-center text-sm text-[var(--color-text-muted)] py-8">
                Nothing to flag. Healthy week.
              </CardBody>
            ) : (
              <ul>
                {atRisk.slice(0, 6).map((r) => (
                  <li
                    key={r.studentId}
                    className="px-5 py-3 border-b last:border-0 border-[var(--color-border)] flex items-center gap-3"
                  >
                    <div
                      className="h-9 w-9 rounded-full grid place-items-center font-bold text-sm shrink-0"
                      style={{ background: '#fef2f2', color: ACCENT }}
                    >
                      {(r.student?.name || '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{r.student?.name ?? 'Unknown'}</div>
                      <div className="text-xs text-[var(--color-text-muted)] truncate">
                        Roll {r.student?.rollNumber || '—'} · {r.reasons.join(' · ')}
                      </div>
                    </div>
                    {r.attendancePct !== null && (
                      <span className={`ef-chip ${r.attendancePct < 60 ? 'ef-chip-danger' : 'ef-chip-warn'}`}>
                        {r.attendancePct}% att
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Quick actions */}
          <Card variant="solid">
            <CardHeader eyebrow="Quick actions" title="What's next?" />
            <CardBody className="space-y-2">
              <QuickAction
                href="/principal/feed"
                icon={<Megaphone className="h-4 w-4" />}
                label="Post school-wide announcement"
              />
              <QuickAction
                href="/principal/users"
                icon={<Users className="h-4 w-4" />}
                label="Manage teachers & students"
              />
              <QuickAction
                href="/principal/marks"
                icon={<BookOpenCheck className="h-4 w-4" />}
                label="Review & publish exam marks"
              />
              <QuickAction
                href="/principal/fees"
                icon={<Wallet className="h-4 w-4" />}
                label="Fee structures & collection"
              />
              <QuickAction
                href="/principal/reports"
                icon={<BarChart3 className="h-4 w-4" />}
                label="Full school analytics"
              />
              <QuickAction
                href="/principal/settings"
                icon={<ShieldAlert className="h-4 w-4" />}
                label="School settings & audit log"
              />
            </CardBody>
          </Card>
        </section>

        {/* Recent exam averages */}
        <Card variant="solid" className="overflow-hidden">
          <CardHeader
            eyebrow="Academic pulse"
            title="Recent exam averages"
            subtitle={marks.length ? `${marks.length} published exams` : 'No published exams yet'}
            right={
              <Link href="/principal/marks" className="ef-btn ef-btn-ghost text-sm">
                Open marks <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          {marks.length === 0 ? (
            <CardBody className="text-center text-sm text-[var(--color-text-muted)] py-8">
              Once teachers publish exams, averages appear here.
            </CardBody>
          ) : (
            <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
              {marks.slice(0, 8).map((e) => (
                <div key={e.examId} className="p-3 rounded-xl border border-[var(--color-border)] bg-white">
                  <div className="ef-eyebrow truncate">{e.class}</div>
                  <div className="font-medium text-sm mt-1 truncate">{e.name}</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span
                      className="text-xl font-bold tabular-nums"
                      style={{
                        color:
                          e.averagePct >= 70 ? 'var(--color-success)' :
                          e.averagePct >= 40 ? 'var(--color-warn)' :
                          'var(--color-danger)',
                      }}
                    >
                      {e.averagePct}%
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">avg · {e.students} students</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

// =====================================================================
// Sub-components
// =====================================================================

function greet() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

function HeroCard({ schoolSubdomain, academicYear }: { schoolSubdomain: string; academicYear: string }) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  return (
    <Card className="overflow-hidden">
      <div className="relative p-6">
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            background:
              `radial-gradient(circle at 90% 0%, ${ACCENT} 0%, transparent 50%), ` +
              `radial-gradient(circle at 0% 100%, #14b8a6 0%, transparent 50%)`,
          }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="ef-chip ef-role-admin mb-2">
              <ShieldAlert className="h-3 w-3" /> Administrator
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text)]">
              {schoolSubdomain}
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {today} · Academic year {academicYear}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function BigStat({
  label, value, icon, sub, tone,
}: {
  label: string; value: React.ReactNode; icon: React.ReactNode; sub?: string;
  tone?: 'default' | 'success' | 'warn' | 'danger';
}) {
  const toneClass = tone === 'success' ? 'text-[var(--color-success)]'
    : tone === 'warn'    ? 'text-[var(--color-warn)]'
    : tone === 'danger'  ? 'text-[var(--color-danger)]'
    : 'text-[var(--color-text)]';

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="ef-eyebrow">{label}</div>
        <span
          className="h-8 w-8 rounded-lg grid place-items-center"
          style={{ background: `${ACCENT}10`, color: ACCENT }}
        >
          {icon}
        </span>
      </div>
      <div className={`mt-3 text-3xl font-bold tabular-nums tracking-tight ${toneClass}`}>
        {value}
      </div>
      {sub && <div className="mt-1.5 text-xs text-[var(--color-text-muted)]">{sub}</div>}
    </Card>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] transition-all group"
    >
      <span
        className="h-8 w-8 rounded-lg grid place-items-center shrink-0"
        style={{ background: `${ACCENT}10`, color: ACCENT }}
      >
        {icon}
      </span>
      <span className="text-sm font-medium text-[var(--color-text)] flex-1">{label}</span>
      <ArrowRight className="h-4 w-4 text-[var(--color-text-subtle)] group-hover:text-[var(--color-brand)] group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}

/**
 * Shown only while the school has zero students: lets a new principal (or a
 * sales demo) fill the school with realistic sample data in one click instead
 * of staring at empty tables.
 */
function SampleDataCard() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSample() {
    setBusy(true);
    setError(null);
    try {
      await api('/school/demo-data', {
        method: 'POST',
        token: session.token(),
        subdomain: session.subdomain(),
      });
      window.location.reload();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <Card variant="solid">
      <CardBody className="flex flex-wrap items-center gap-4">
        <span
          className="h-11 w-11 rounded-xl grid place-items-center shrink-0"
          style={{ background: `${ACCENT}10`, color: ACCENT }}
        >
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-[220px]">
          <h3 className="font-semibold text-[var(--color-text)]">New school? Load sample data</h3>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Two classes, 44 students with parents, a month of attendance, exams, fees and a
            timetable — so you can explore every screen before entering real data.
          </p>
          {error && <p className="text-sm text-[var(--color-danger)] mt-1">{error}</p>}
        </div>
        <Button onClick={loadSample} disabled={busy}>
          {busy ? 'Loading sample data…' : 'Load sample data'}
        </Button>
      </CardBody>
    </Card>
  );
}
