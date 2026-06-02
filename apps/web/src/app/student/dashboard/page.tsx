'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarCheck, BookOpenCheck, MessageSquare, ClipboardList, FileText,
  ArrowRight, Clock, GraduationCap, Sparkles,
} from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api, session } from '@/lib/api';

const ACCENT = '#2563eb';
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StudentDashboard() {
  const me = session.user();
  const [timetable, setTimetable] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    const t = session.token();
    const s = session.subdomain();
    const month = new Date().toISOString().slice(0, 7);

    api(`/timetable/student/${me.id}`, { token: t, subdomain: s }).then(setTimetable).catch(() => setTimetable(null));
    api(`/students/${me.id}/report-card`, { token: t, subdomain: s }).then(setReport).catch(() => setReport(null));
    api(`/attendance/student/${me.id}/month?month=${month}`, { token: t, subdomain: s }).then(setAttendance).catch(() => setAttendance(null));
    api('/feed', { token: t, subdomain: s }).then((p: any) => setPosts(p ?? [])).catch(() => {});
  }, [me?.id]);

  const today = new Date();
  const dow = today.getDay() === 0 ? 6 : today.getDay() - 1; // Mon=0..Sat=5

  const todaysPeriods = useMemo(() => {
    const periods = timetable?.timetable?.periods ?? [];
    return periods
      .filter((p: any) => p.dayOfWeek === dow)
      .sort((a: any, b: any) => a.periodIndex - b.periodIndex);
  }, [timetable, dow]);

  const sectionLabel = timetable?.section
    ? `${timetable.section.class?.label} · Section ${timetable.section.name}`
    : '—';

  // Pending assignments (not yet past due, ASSIGNMENT type) — from feed
  const pendingHomework = useMemo(() => {
    return posts
      .filter((p) => p.type === 'ASSIGNMENT' && p.assignment && new Date(p.assignment.dueAt) > new Date())
      .slice(0, 3);
  }, [posts]);

  // "What's due this week" — assignments due in the next 7 days, sorted by urgency.
  const dueThisWeek = useMemo(() => {
    const now = Date.now();
    const weekFromNow = now + 7 * 86_400_000;
    return posts
      .filter((p) => p.type === 'ASSIGNMENT' && p.assignment)
      .map((p) => ({
        ...p,
        _dueAt: new Date(p.assignment.dueAt).getTime(),
      }))
      .filter((p) => p._dueAt > now && p._dueAt <= weekFromNow)
      .sort((a, b) => a._dueAt - b._dueAt);
  }, [posts]);

  const latestExam = report?.exams?.[report.exams.length - 1];

  return (
    <>
      <TopBar
        title={`Hey ${me?.name?.split(' ')[0] ?? 'there'}`}
        eyebrow="Student portal"
      />
      <div className="flex-1 p-6 space-y-6 max-w-7xl">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        {/* Hero */}
        <Card className="overflow-hidden">
          <div className="relative p-6">
            <div
              className="absolute inset-0 opacity-[0.06] pointer-events-none"
              style={{
                background:
                  `radial-gradient(circle at 90% 0%, ${ACCENT} 0%, transparent 50%), ` +
                  `radial-gradient(circle at 0% 100%, #14b8a6 0%, transparent 50%)`,
              }}
            />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="ef-chip ef-role-student mb-2">
                  <GraduationCap className="h-3 w-3" /> Student
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text)]">
                  {me?.name ?? 'Student'}
                </h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  {DAYS_FULL[today.getDay()]}, {today.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} · {sectionLabel}
                </p>
              </div>
              <Link href="/student/marks" className="ef-btn ef-btn-outline text-sm">
                <FileText className="h-4 w-4" /> View report card
              </Link>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <BigStat
            label="This month's attendance"
            value={attendance ? `${attendance.percentage}%` : '—'}
            icon={<CalendarCheck className="h-5 w-5" />}
            tone={attendance?.percentage >= 90 ? 'success' : attendance?.percentage >= 75 ? 'warn' : 'danger'}
            sub={attendance?.records ? `${attendance.records.length} school days` : ''}
          />
          <BigStat
            label="Today's classes"
            value={todaysPeriods.length}
            icon={<Clock className="h-5 w-5" />}
            sub={todaysPeriods.length === 0 ? 'No classes today' : `Starts at ${todaysPeriods[0].startTime}`}
          />
          <BigStat
            label="Latest grade"
            value={latestExam ? `${latestExam.percentage}%` : '—'}
            icon={<Sparkles className="h-5 w-5" />}
            sub={latestExam ? latestExam.exam.name : 'No published exams yet'}
            tone={latestExam?.percentage >= 60 ? 'success' : 'warn'}
          />
          <BigStat
            label="Pending homework"
            value={pendingHomework.length}
            icon={<ClipboardList className="h-5 w-5" />}
            sub={pendingHomework.length === 0 ? 'All caught up' : 'Due soon'}
          />
        </section>

        <section className="grid lg:grid-cols-3 gap-4">
          {/* Today's schedule */}
          <Card variant="solid" className="lg:col-span-2 overflow-hidden">
            <CardHeader
              eyebrow="Your schedule"
              title={`Today · ${DAYS_FULL[today.getDay()]}`}
              subtitle={todaysPeriods.length ? `${todaysPeriods.length} period${todaysPeriods.length === 1 ? '' : 's'}` : 'No classes scheduled today'}
              right={
                <Link href="/student/timetable" className="ef-btn ef-btn-ghost text-sm">
                  Full week <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
            {todaysPeriods.length === 0 ? (
              <CardBody className="text-center py-10 text-[var(--color-text-muted)]">
                Day off. Catch up on pending homework.
              </CardBody>
            ) : (
              <ul>
                {todaysPeriods.map((p: any) => (
                  <li
                    key={p.id}
                    className="px-5 py-3 border-b last:border-0 border-[var(--color-border)] flex items-center gap-3"
                  >
                    <div
                      className="h-10 w-10 rounded-lg grid place-items-center text-sm font-bold tabular-nums shrink-0"
                      style={{ background: `${ACCENT}10`, color: ACCENT }}
                    >
                      P{p.periodIndex}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {p.subject?.name ?? '—'}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)] tabular-nums">
                        {p.startTime}–{p.endTime}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Quick actions */}
          <Card variant="solid">
            <CardHeader eyebrow="Quick actions" title="What to do" />
            <CardBody className="space-y-2">
              <QuickAction
                href="/student/marks"
                icon={<FileText className="h-4 w-4" />}
                label="View report card"
              />
              <QuickAction
                href="/student/assignments"
                icon={<ClipboardList className="h-4 w-4" />}
                label="Submit homework"
              />
              <QuickAction
                href="/student/feed"
                icon={<MessageSquare className="h-4 w-4" />}
                label="Class wall"
              />
              <QuickAction
                href="/student/chat"
                icon={<BookOpenCheck className="h-4 w-4" />}
                label="Message a teacher"
              />
            </CardBody>
          </Card>
        </section>

        {/* What's due this week — replaces simple pending homework with urgency cues */}
        {dueThisWeek.length > 0 && (
          <Card variant="solid">
            <CardHeader
              eyebrow="This week"
              title={`${dueThisWeek.length} due in the next 7 days`}
              subtitle="Soonest first"
              right={
                <Link href="/student/assignments" className="ef-btn ef-btn-ghost text-sm">
                  All <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
            <CardBody className="p-0">
              <ul>
                {dueThisWeek.map((p) => {
                  const ms = p._dueAt - Date.now();
                  const hours = ms / 3_600_000;
                  const isToday = hours < 24;
                  const isTomorrow = hours >= 24 && hours < 48;
                  const dueLabel = isToday
                    ? `Due today · ${new Date(p._dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : isTomorrow
                    ? `Due tomorrow · ${new Date(p._dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : `Due ${new Date(p._dueAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}`;
                  const chipTone = isToday ? 'ef-chip-danger' : isTomorrow ? 'ef-chip-warn' : 'ef-chip-brand';
                  return (
                    <li key={p.id} className="px-5 py-3 border-b last:border-0 border-[var(--color-border)] flex items-center gap-3">
                      <span
                        className="h-9 w-9 rounded-lg grid place-items-center shrink-0"
                        style={isToday
                          ? { background: 'rgba(220,38,38,0.10)', color: 'var(--color-danger)' }
                          : { background: `${ACCENT}10`, color: ACCENT }}
                      >
                        <ClipboardList className="h-4 w-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{p.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`ef-chip ${chipTone}`}>{dueLabel}</span>
                          {p.assignment.maxMarks != null && (
                            <span className="text-xs text-[var(--color-text-muted)]">Max {p.assignment.maxMarks}</span>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/student/assignments/${p.assignment.id}`}
                        className="ef-btn ef-btn-outline text-xs py-1.5 px-3"
                      >
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>
        )}

        {/* Recent grades */}
        {report?.exams?.length > 0 && (
          <Card variant="solid">
            <CardHeader
              eyebrow="Recently published"
              title="Latest grades"
              right={
                <Link href="/student/marks" className="ef-btn ef-btn-ghost text-sm">
                  Full report card <ArrowRight className="h-4 w-4" />
                </Link>
              }
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
