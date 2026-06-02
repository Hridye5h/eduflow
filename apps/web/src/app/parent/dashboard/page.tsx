'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarCheck, FileText, ClipboardList, Wallet, MessageSquare,
  ArrowRight, Clock, Sparkles, CheckCircle2, AlertCircle, MinusCircle,
} from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api, session } from '@/lib/api';
import { useChildren } from '@/lib/use-children';
import { ChildHeader } from '@/components/parent/ChildHeader';

const ACCENT = '#0d9488';
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ParentDashboard() {
  const me = session.user();
  const { children, activeChild, activeChildId, setActiveChildId, loading } = useChildren();

  const [timetable, setTimetable] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);

  useEffect(() => {
    if (!activeChildId) return;
    const t = session.token();
    const s = session.subdomain();
    const month = new Date().toISOString().slice(0, 7);

    api(`/timetable/student/${activeChildId}`,                              { token: t, subdomain: s }).then(setTimetable).catch(() => setTimetable(null));
    api(`/students/${activeChildId}/report-card`,                           { token: t, subdomain: s }).then(setReport).catch(() => setReport(null));
    api(`/attendance/student/${activeChildId}/month?month=${month}`,        { token: t, subdomain: s }).then(setAttendance).catch(() => setAttendance(null));
    api('/feed',                                                            { token: t, subdomain: s }).then((p: any) => setPosts(p ?? [])).catch(() => {});
    api(`/fees/student/${activeChildId}`,                                   { token: t, subdomain: s }).then((f: any) => setFees(f ?? [])).catch(() => setFees([]));
  }, [activeChildId]);

  // Derived
  const today = new Date();
  const dow = today.getDay() === 0 ? 6 : today.getDay() - 1;

  const todaysPeriods = useMemo(() => {
    const periods = timetable?.timetable?.periods ?? [];
    return periods
      .filter((p: any) => p.dayOfWeek === dow)
      .sort((a: any, b: any) => a.periodIndex - b.periodIndex);
  }, [timetable, dow]);

  const pendingHomework = useMemo(() => {
    return posts
      .filter((p) => p.type === 'ASSIGNMENT' && p.assignment && new Date(p.assignment.dueAt) > new Date())
      .slice(0, 3);
  }, [posts]);

  const latestExam = report?.exams?.[report.exams.length - 1];
  const outstandingFees = useMemo(
    () => fees.filter((f) => f.status !== 'PAID'),
    [fees],
  );
  const totalDue = outstandingFees.reduce((a, f) => a + (f.structure?.amount ?? 0) - (f.amountPaid ?? 0), 0);

  // Today's attendance for this child — pulled from the monthly view
  const todayIso = today.toISOString().slice(0, 10);
  const todayRecord = (attendance?.records ?? []).find((r: any) =>
    new Date(r.date).toISOString().slice(0, 10) === todayIso
  );
  const todayStatus = todayRecord?.status ?? null;

  return (
    <>
      <TopBar
        title={`Hello, ${me?.name?.split('(')[0]?.trim() ?? 'Parent'}`}
        eyebrow="Parent portal"
      />
      <div className="flex-1 p-6 space-y-5 max-w-7xl">
        {loading && <Card className="p-4 text-sm text-[var(--color-text-muted)]">Loading your child's profile…</Card>}

        <ChildHeader children={children} active={activeChild} onSwitch={setActiveChildId} />

        {!activeChild ? null : (
          <>
            {/* Today's status hero — the single most important thing for parents */}
            <TodayStatusHero
              status={todayStatus}
              studentFirstName={activeChild.student.name.split(' ')[0]}
            />

            {/* Stats */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <BigStat
                label="This month's attendance"
                value={attendance ? `${attendance.percentage}%` : '—'}
                icon={<CalendarCheck className="h-5 w-5" />}
                tone={attendance?.percentage >= 90 ? 'success' : attendance?.percentage >= 75 ? 'warn' : 'danger'}
                sub={attendance?.records ? `${attendance.records.length} days` : ''}
              />
              <BigStat
                label="Latest grade"
                value={latestExam ? `${latestExam.percentage}%` : '—'}
                icon={<Sparkles className="h-5 w-5" />}
                sub={latestExam?.exam.name ?? 'No published exams yet'}
                tone={latestExam?.percentage >= 60 ? 'success' : 'warn'}
              />
              <BigStat
                label="Pending homework"
                value={pendingHomework.length}
                icon={<ClipboardList className="h-5 w-5" />}
                sub={pendingHomework.length === 0 ? 'All caught up' : 'Due soon'}
              />
              <BigStat
                label="Outstanding fees"
                value={totalDue > 0 ? `₹${totalDue.toLocaleString()}` : '—'}
                icon={<Wallet className="h-5 w-5" />}
                sub={`${outstandingFees.length} item${outstandingFees.length === 1 ? '' : 's'}`}
                tone={totalDue > 0 ? 'warn' : 'success'}
              />
            </section>

            <section className="grid lg:grid-cols-3 gap-4">
              {/* Today's schedule */}
              <Card variant="solid" className="lg:col-span-2 overflow-hidden">
                <CardHeader
                  eyebrow="Today's classes"
                  title={DAYS_FULL[today.getDay()]}
                  subtitle={todaysPeriods.length ? `${todaysPeriods.length} period${todaysPeriods.length === 1 ? '' : 's'}` : 'No classes scheduled today'}
                  right={
                    <Link href="/parent/timetable" className="ef-btn ef-btn-ghost text-sm">
                      Full week <ArrowRight className="h-4 w-4" />
                    </Link>
                  }
                />
                {todaysPeriods.length === 0 ? (
                  <CardBody className="text-center py-10 text-[var(--color-text-muted)]">
                    Day off for {activeChild.student.name.split(' ')[0]}.
                  </CardBody>
                ) : (
                  <ul>
                    {todaysPeriods.map((p: any) => (
                      <li key={p.id} className="px-5 py-3 border-b last:border-0 border-[var(--color-border)] flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-lg grid place-items-center text-sm font-bold tabular-nums shrink-0"
                          style={{ background: `${ACCENT}10`, color: ACCENT }}
                        >
                          P{p.periodIndex}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{p.subject?.name ?? '—'}</div>
                          <div className="text-xs text-[var(--color-text-muted)] tabular-nums">{p.startTime}–{p.endTime}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {/* Quick actions */}
              <Card variant="solid">
                <CardHeader eyebrow="Quick actions" title="Stay in the loop" />
                <CardBody className="space-y-2">
                  <QuickAction href="/parent/marks"        icon={<FileText className="h-4 w-4" />}     label="View report card" />
                  <QuickAction href="/parent/attendance"   icon={<CalendarCheck className="h-4 w-4" />} label="Attendance history" />
                  <QuickAction href="/parent/fees"         icon={<Wallet className="h-4 w-4" />}        label="Outstanding fees" />
                  <QuickAction href="/parent/chat"         icon={<MessageSquare className="h-4 w-4" />} label="Message a teacher" />
                </CardBody>
              </Card>
            </section>

            {/* Pending homework */}
            {pendingHomework.length > 0 && (
              <Card variant="solid">
                <CardHeader
                  eyebrow="Reminders"
                  title={`${pendingHomework.length} pending homework`}
                  right={<Link href="/parent/assignments" className="ef-btn ef-btn-ghost text-sm">All <ArrowRight className="h-4 w-4" /></Link>}
                />
                <CardBody className="p-0">
                  <ul>
                    {pendingHomework.map((p) => (
                      <li key={p.id} className="px-5 py-3 border-b last:border-0 border-[var(--color-border)] flex items-center gap-3">
                        <span
                          className="h-9 w-9 rounded-lg grid place-items-center shrink-0"
                          style={{ background: `${ACCENT}10`, color: ACCENT }}
                        >
                          <ClipboardList className="h-4 w-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{p.title}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">Due {new Date(p.assignment.dueAt).toLocaleString()}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}

            {/* Latest grades */}
            {report?.exams?.length > 0 && (
              <Card variant="solid">
                <CardHeader
                  eyebrow="Latest grades"
                  title={`${activeChild.student.name.split(' ')[0]}'s recent exams`}
                  right={<Link href="/parent/marks" className="ef-btn ef-btn-ghost text-sm">Full report card <ArrowRight className="h-4 w-4" /></Link>}
                />
                <CardBody className="p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {report.exams.slice(-3).reverse().map((e: any) => (
                    <div key={e.exam.id} className="p-4 rounded-xl border border-[var(--color-border)] bg-white">
                      <div className="ef-eyebrow">{e.exam.type.replace('_', ' ')}</div>
                      <div className="font-semibold mt-1 text-sm">{e.exam.name}</div>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span
                          className="text-2xl font-bold tabular-nums"
                          style={{
                            color:
                              e.percentage >= 70 ? 'var(--color-success)' :
                              e.percentage >= 40 ? 'var(--color-warn)' :
                              'var(--color-danger)',
                          }}
                        >
                          {e.percentage}%
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">{e.total} / {e.max}</span>
                      </div>
                    </div>
                  ))}
                </CardBody>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}

function BigStat({
  label, value, icon, sub, tone,
}: {
  label: string; value: React.ReactNode; icon: React.ReactNode; sub?: string;
  tone?: 'success' | 'warn' | 'danger';
}) {
  const cls = tone === 'success' ? 'text-[var(--color-success)]'
    : tone === 'warn'   ? 'text-[var(--color-warn)]'
    : tone === 'danger' ? 'text-[var(--color-danger)]'
    : 'text-[var(--color-text)]';
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="ef-eyebrow">{label}</div>
        <span className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: `${ACCENT}10`, color: ACCENT }}>
          {icon}
        </span>
      </div>
      <div className={`mt-3 text-3xl font-bold tabular-nums tracking-tight ${cls}`}>{value}</div>
      {sub && <div className="mt-1.5 text-xs text-[var(--color-text-muted)]">{sub}</div>}
    </Card>
  );
}

/** Big "PRESENT today" hero — the single most important thing for parents. */
function TodayStatusHero({
  status,
  studentFirstName,
}: { status: string | null; studentFirstName: string }) {
  const today = new Date();
  const isWeekend = today.getDay() === 0 || today.getDay() === 6;

  // Determine tone + content
  let bg: string, ring: string, icon: React.ReactNode, headline: string, sub: string;
  if (isWeekend) {
    bg = 'rgba(15,23,42,0.04)';
    ring = 'rgba(15,23,42,0.08)';
    icon = <MinusCircle className="h-9 w-9" style={{ color: 'var(--color-text-muted)' }} />;
    headline = 'No school today';
    sub = 'Enjoy the weekend.';
  } else if (status === 'PRESENT') {
    bg = 'linear-gradient(135deg, rgba(22,163,74,0.10), rgba(22,163,74,0.04))';
    ring = 'rgba(22,163,74,0.30)';
    icon = <CheckCircle2 className="h-9 w-9" style={{ color: 'var(--color-success)' }} />;
    headline = `${studentFirstName} is present today`;
    sub = `All good — marked in for ${today.toLocaleDateString(undefined, { weekday: 'long' })}.`;
  } else if (status === 'LATE') {
    bg = 'linear-gradient(135deg, rgba(217,119,6,0.12), rgba(217,119,6,0.04))';
    ring = 'rgba(217,119,6,0.35)';
    icon = <AlertCircle className="h-9 w-9" style={{ color: 'var(--color-warn)' }} />;
    headline = `${studentFirstName} arrived late today`;
    sub = 'Marked present, but flagged late by the class teacher.';
  } else if (status === 'HALF_DAY') {
    bg = 'linear-gradient(135deg, rgba(2,132,199,0.12), rgba(2,132,199,0.04))';
    ring = 'rgba(2,132,199,0.30)';
    icon = <AlertCircle className="h-9 w-9" style={{ color: 'var(--color-info)' }} />;
    headline = `${studentFirstName} attended half-day`;
    sub = 'Counted as half a day in this month’s attendance.';
  } else if (status === 'ABSENT') {
    bg = 'linear-gradient(135deg, rgba(220,38,38,0.12), rgba(220,38,38,0.04))';
    ring = 'rgba(220,38,38,0.35)';
    icon = <AlertCircle className="h-9 w-9" style={{ color: 'var(--color-danger)' }} />;
    headline = `${studentFirstName} is absent today`;
    sub = 'Tap below to send a reason — the class teacher will see it instantly.';
  } else if (status === 'ON_LEAVE') {
    bg = 'linear-gradient(135deg, rgba(79,70,229,0.10), rgba(79,70,229,0.04))';
    ring = 'rgba(79,70,229,0.30)';
    icon = <CheckCircle2 className="h-9 w-9" style={{ color: 'var(--color-brand)' }} />;
    headline = `${studentFirstName} is on approved leave`;
    sub = 'A leave application is in effect for today.';
  } else {
    bg = 'rgba(15,23,42,0.03)';
    ring = 'rgba(15,23,42,0.08)';
    icon = <Clock className="h-9 w-9" style={{ color: 'var(--color-text-muted)' }} />;
    headline = `Attendance not yet marked`;
    sub = `The class teacher will mark roll call for ${studentFirstName} shortly.`;
  }

  return (
    <Card variant="solid" className="overflow-hidden">
      <div
        className="p-5 sm:p-6 flex items-center gap-4 border-l-4"
        style={{
          background: bg,
          borderLeftColor: ring,
        }}
      >
        <div
          className="h-16 w-16 rounded-2xl grid place-items-center shrink-0 bg-white"
          style={{ boxShadow: `0 6px 24px ${ring}` }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="ef-eyebrow mb-1">Today &middot; {today.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">{headline}</h3>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{sub}</p>
        </div>
        {status === 'ABSENT' && (
          <Link
            href="/parent/attendance"
            className="ef-btn ef-btn-outline text-sm hidden sm:inline-flex"
          >
            Explain
          </Link>
        )}
      </div>
    </Card>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] transition-all group"
    >
      <span className="h-8 w-8 rounded-lg grid place-items-center shrink-0" style={{ background: `${ACCENT}10`, color: ACCENT }}>
        {icon}
      </span>
      <span className="text-sm font-medium flex-1">{label}</span>
      <ArrowRight className="h-4 w-4 text-[var(--color-text-subtle)] group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}
