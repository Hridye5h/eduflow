'use client';
import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader, Stat } from '@/components/ui/Card';
import { TopBar } from '@/components/layout/TopBar';
import { api, session } from '@/lib/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';

export default function ReportsPage() {
  const [attendance, setAttendance] = useState<any>(null);
  const [marks, setMarks] = useState<any[]>([]);
  const [atRisk, setAtRisk] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = session.token();
    const s = session.subdomain();
    Promise.all([
      api('/reports/attendance?days=30', { token: t, subdomain: s }),
      api('/reports/marks', { token: t, subdomain: s }),
      api('/reports/at-risk', { token: t, subdomain: s }),
      api('/reports/teacher-activity', { token: t, subdomain: s }),
    ])
      .then(([a, m, ar, ta]: any) => {
        setAttendance(a);
        setMarks(m);
        setAtRisk(ar);
        setTeachers(ta);
      })
      .catch((e) => setErr(e.message));
  }, []);

  const lastDay = attendance?.series?.[attendance.series.length - 1];

  return (
    <>
      <TopBar title="Reports & Analytics" />
      <div className="flex-1 p-6 space-y-5">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        <section className="grid sm:grid-cols-4 gap-4">
          <Stat label="At-risk students" value={atRisk.length} tone={atRisk.length ? 'danger' : 'success'} />
          <Stat label="Today's attendance" value={lastDay ? `${lastDay.percentage}%` : '—'} tone="info" />
          <Stat label="Published exams" value={marks.length} />
          <Stat label="Active teachers (30d)" value={teachers.length} />
        </section>

        <Card>
          <CardHeader title="Attendance trend" subtitle="Last 30 days" />
          <CardBody className="h-64">
            {attendance?.series?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendance.series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ee" />
                  <XAxis dataKey="date" stroke="#8b93a7" fontSize={11} />
                  <YAxis stroke="#8b93a7" fontSize={11} domain={[0, 100]} unit="%" />
                  <Tooltip />
                  <Line type="monotone" dataKey="percentage" stroke="#4f46e5" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid place-items-center h-full text-[var(--color-text-muted)] text-sm">No attendance data yet.</div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent exam averages" subtitle="Published exams, ordered by date" />
          <CardBody className="h-72">
            {marks.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marks}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ee" />
                  <XAxis dataKey="name" stroke="#8b93a7" fontSize={11} />
                  <YAxis stroke="#8b93a7" fontSize={11} domain={[0, 100]} unit="%" />
                  <Tooltip />
                  <Bar dataKey="averagePct" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid place-items-center h-full text-[var(--color-text-muted)] text-sm">No published exams yet.</div>
            )}
          </CardBody>
        </Card>

        <div className="grid lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader title="At-risk students" subtitle="Low attendance or marks" />
            <CardBody className="p-0">
              {atRisk.length === 0 ? (
                <div className="p-6 text-center text-sm text-[var(--color-text-muted)]">All students are on track.</div>
              ) : (
                <ul>
                  {atRisk.slice(0, 12).map((r) => (
                    <li key={r.studentId} className="px-5 py-3 border-b last:border-0 border-[var(--color-border)] flex items-center justify-between">
                      <div>
                        <div className="font-medium">{r.student?.name}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">
                          {r.reasons.join(' · ')}
                        </div>
                      </div>
                      <div className="text-sm text-[var(--color-text-muted)]">
                        {r.attendancePct ?? '—'}% att
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Teacher activity (30d)" subtitle="Posts · marks · attendance" />
            <CardBody className="p-0">
              {teachers.length === 0 ? (
                <div className="p-6 text-center text-sm text-[var(--color-text-muted)]">No teachers yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-text-subtle)]">
                      <th className="px-5 py-2">Teacher</th>
                      <th className="px-5 py-2 text-right">Posts</th>
                      <th className="px-5 py-2 text-right">Marks</th>
                      <th className="px-5 py-2 text-right">Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((t) => (
                      <tr key={t.teacher.id} className="border-b last:border-0 border-[var(--color-border)]">
                        <td className="px-5 py-2">{t.teacher.name}</td>
                        <td className="px-5 py-2 text-right tabular-nums">{t.posts}</td>
                        <td className="px-5 py-2 text-right tabular-nums">{t.marksEntered}</td>
                        <td className="px-5 py-2 text-right tabular-nums">{t.attendanceMarked}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
