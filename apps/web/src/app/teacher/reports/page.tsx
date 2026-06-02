'use client';
import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarCheck, BookOpenCheck, ClipboardList } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api, session } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const ACCENT = '#d97706';

type TeacherActivity = Array<{
  teacher: { id: string; name: string };
  posts: number;
  marksEntered: number;
  attendanceMarked: number;
}>;

type Exam = {
  examId: string;
  name: string;
  class: string;
  students: number;
  maxMarks: number;
  averagePct: number;
};

export default function TeacherReportsPage() {
  const me = session.user();
  const [activity, setActivity] = useState<TeacherActivity>([]);
  const [marks, setMarks] = useState<Exam[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = session.token();
    const s = session.subdomain();
    Promise.all([
      api<TeacherActivity>('/reports/teacher-activity', { token: t, subdomain: s }),
      api<Exam[]>('/reports/marks', { token: t, subdomain: s }),
    ])
      .then(([a, m]) => { setActivity(a); setMarks(m); })
      .catch((e) => setErr(e.message));
  }, []);

  const myRow = useMemo(() => activity.find((a) => a.teacher.id === me?.id), [activity, me?.id]);
  const myRank = useMemo(() => {
    const sorted = [...activity].sort(
      (a, b) => (b.posts + b.marksEntered + b.attendanceMarked) - (a.posts + a.marksEntered + a.attendanceMarked),
    );
    const idx = sorted.findIndex((a) => a.teacher.id === me?.id);
    return idx >= 0 ? idx + 1 : null;
  }, [activity, me?.id]);

  return (
    <>
      <TopBar title="Your activity" eyebrow="Teacher portal" />
      <div className="flex-1 p-6 space-y-5 max-w-6xl">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <BigStat
            label="Posts (30d)"
            value={myRow?.posts ?? 0}
            icon={<BarChart3 className="h-5 w-5" />}
          />
          <BigStat
            label="Marks entries (30d)"
            value={myRow?.marksEntered ?? 0}
            icon={<BookOpenCheck className="h-5 w-5" />}
          />
          <BigStat
            label="Attendance entries (30d)"
            value={myRow?.attendanceMarked ?? 0}
            icon={<CalendarCheck className="h-5 w-5" />}
          />
          <BigStat
            label="Your rank in school"
            value={myRank ? `#${myRank}` : '—'}
            icon={<ClipboardList className="h-5 w-5" />}
            sub={`of ${activity.length} teachers · combined activity`}
          />
        </section>

        <Card variant="solid">
          <CardHeader
            eyebrow="Published exams"
            title="Class averages"
            subtitle={marks.length ? 'Most recent exams across the school' : 'No published exams yet'}
          />
          <CardBody className="h-72">
            {marks.length === 0 ? (
              <div className="h-full grid place-items-center text-sm text-[var(--color-text-muted)]">
                Once exams are published, you'll see averages here.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marks.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(255,255,255,0.96)',
                      border: '1px solid rgba(15,23,42,0.08)',
                      borderRadius: '12px',
                    }}
                  />
                  <Bar dataKey="averagePct" fill={ACCENT} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card variant="solid">
          <CardHeader
            eyebrow="Teacher leaderboard"
            title="Activity ranking"
            subtitle="Posts + marks + attendance entries in the last 30 days"
          />
          <CardBody className="p-0">
            {activity.length === 0 ? (
              <div className="p-8 text-center text-[var(--color-text-muted)]">No teacher activity yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-text-subtle)]">
                    <th className="px-5 py-3 w-12">#</th>
                    <th className="px-5 py-3">Teacher</th>
                    <th className="px-5 py-3 text-right">Posts</th>
                    <th className="px-5 py-3 text-right">Marks</th>
                    <th className="px-5 py-3 text-right">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.map((a, i) => {
                    const mine = a.teacher.id === me?.id;
                    return (
                      <tr
                        key={a.teacher.id}
                        className="border-b last:border-0 border-[var(--color-border)] transition-colors"
                        style={mine ? { background: `${ACCENT}08` } : undefined}
                      >
                        <td className="px-5 py-3 text-[var(--color-text-muted)] tabular-nums">{i + 1}</td>
                        <td className="px-5 py-3 font-medium">
                          {a.teacher.name}
                          {mine && (
                            <span className="ef-chip ef-role-teacher ml-2">You</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">{a.posts}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{a.marksEntered}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{a.attendanceMarked}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function BigStat({
  label, value, icon, sub,
}: { label: string; value: React.ReactNode; icon: React.ReactNode; sub?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="ef-eyebrow">{label}</div>
        <span className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: `${ACCENT}10`, color: ACCENT }}>
          {icon}
        </span>
      </div>
      <div className="mt-3 text-3xl font-bold tabular-nums tracking-tight">{value}</div>
      {sub && <div className="mt-1.5 text-xs text-[var(--color-text-muted)]">{sub}</div>}
    </Card>
  );
}
