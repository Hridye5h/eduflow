'use client';
import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader, Stat } from '@/components/ui/Card';
import { TopBar } from '@/components/layout/TopBar';
import { api, session } from '@/lib/api';
import { Users, GraduationCap, School, CalendarCheck } from 'lucide-react';

type Stats = {
  students: number;
  teachers: number;
  classes: number;
  sections: number;
  todayAttendance: Array<{ status: string; _count: { _all: number } }>;
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<Stats>('/school/stats', { token: session.token(), subdomain: session.subdomain() })
      .then(setStats)
      .catch((e) => setErr(e.message));
  }, []);

  const present =
    stats?.todayAttendance?.find((t) => t.status === 'PRESENT')?._count._all ?? 0;
  const absent =
    stats?.todayAttendance?.find((t) => t.status === 'ABSENT')?._count._all ?? 0;
  const total = stats?.students ?? 0;
  const todayPct = total ? Math.round((present / total) * 100) : 0;

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="flex-1 p-6 space-y-6">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Students" value={stats?.students ?? '—'} hint="Active enrolment" />
          <Stat label="Teachers" value={stats?.teachers ?? '—'} hint="On staff" />
          <Stat label="Classes / Sections" value={`${stats?.classes ?? '—'} / ${stats?.sections ?? '—'}`} />
          <Stat
            label="Today’s attendance"
            value={`${todayPct}%`}
            tone={todayPct >= 90 ? 'success' : todayPct >= 75 ? 'warn' : 'danger'}
            hint={`${present} present · ${absent} absent`}
          />
        </section>

        <section className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader title="Quick actions" subtitle="Common tasks for super admins and teachers" />
            <CardBody>
              <div className="grid sm:grid-cols-2 gap-3">
                <QuickAction icon={<CalendarCheck className="h-4 w-4" />} title="Mark today's attendance" href="/attendance" />
                <QuickAction icon={<Users className="h-4 w-4" />} title="Manage classes & sections" href="/classes" />
                <QuickAction icon={<GraduationCap className="h-4 w-4" />} title="Add students (bulk)" href="/classes" />
                <QuickAction icon={<School className="h-4 w-4" />} title="Post to the class wall" href="/feed" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="At a glance" />
            <CardBody>
              <ul className="text-sm space-y-3 text-[var(--color-text-muted)]">
                <li>Attendance threshold: <strong className="text-[var(--color-text)]">75%</strong></li>
                <li>Board: <strong className="text-[var(--color-text)]">CBSE</strong></li>
                <li>Plan: <strong className="text-[var(--color-text)]">Phase 1 (Auth · Classes · Attendance · Feed)</strong></li>
              </ul>
            </CardBody>
          </Card>
        </section>
      </div>
    </>
  );
}

function QuickAction({
  icon,
  title,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] transition-colors"
    >
      <span className="h-8 w-8 grid place-items-center rounded-md bg-[var(--color-surface-muted)] text-[var(--color-text)]">
        {icon}
      </span>
      <span className="text-sm font-medium text-[var(--color-text)]">{title}</span>
    </a>
  );
}
