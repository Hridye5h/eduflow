'use client';
import { useEffect, useMemo, useState } from 'react';
import { Clock, Calendar as CalendarIcon } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api, session } from '@/lib/api';

const ACCENT = '#d97706';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type Period = {
  id: string;
  dayOfWeek: number;
  periodIndex: number;
  startTime: string;
  endTime: string;
  subjectId: string | null;
  teacherId: string | null;
  subject?: { id: string; name: string } | null;
};

type SectionTT = {
  sectionId: string;
  className: string;
  sectionName: string;
  periods: Period[];
};

export default function TeacherTimetablePage() {
  const me = session.user();
  const [data, setData] = useState<SectionTT[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    setLoading(true);
    api<any[]>('/classes', { token: session.token(), subdomain: session.subdomain() })
      .then(async (classes) => {
        const allSections = classes.flatMap((c) => c.sections.map((s: any) => ({ ...s, classLabel: c.label })));
        const results = await Promise.all(
          allSections.map((sec: any) =>
            api<{ timetable: { periods: Period[] } }>(`/timetable/section/${sec.id}`, {
              token: session.token(), subdomain: session.subdomain(),
            })
              .then((r) => ({
                sectionId: sec.id,
                className: sec.classLabel,
                sectionName: sec.name,
                periods: r.timetable.periods.filter((p) => p.teacherId === me.id),
              }))
              .catch(() => ({ sectionId: sec.id, className: sec.classLabel, sectionName: sec.name, periods: [] as Period[] })),
          ),
        );
        setData(results.filter((s) => s.periods.length > 0));
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [me?.id]);

  // Aggregate all my periods, then bucket by day -> period
  const grid = useMemo(() => {
    const m = new Map<string, Array<{ subject: string; section: string; className: string; start: string; end: string }>>();
    for (const sec of data) {
      for (const p of sec.periods) {
        const key = `${p.dayOfWeek}-${p.periodIndex}`;
        const arr = m.get(key) ?? [];
        arr.push({
          subject: p.subject?.name ?? '—',
          section: sec.sectionName,
          className: sec.className,
          start: p.startTime,
          end: p.endTime,
        });
        m.set(key, arr);
      }
    }
    return m;
  }, [data]);

  // Period rows (assume std 6 periods used by seed)
  const allPeriods = useMemo(() => {
    const set = new Set<number>();
    data.forEach((s) => s.periods.forEach((p) => set.add(p.periodIndex)));
    return [...set].sort((a, b) => a - b);
  }, [data]);

  const totalPeriods = data.reduce((a, s) => a + s.periods.length, 0);

  return (
    <>
      <TopBar title="My timetable" eyebrow="Teacher portal" />
      <div className="flex-1 p-6 space-y-5 max-w-6xl">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        <section className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <BigStat label="Sections you teach" value={data.length} icon={<CalendarIcon className="h-5 w-5" />} />
          <BigStat label="Total periods / week" value={totalPeriods} icon={<Clock className="h-5 w-5" />} />
          <BigStat label="Subjects" value={new Set(data.flatMap((s) => s.periods.map((p) => p.subject?.name))).size} icon={<Clock className="h-5 w-5" />} />
        </section>

        <Card variant="solid">
          <CardHeader
            eyebrow="Your week"
            title="Weekly grid"
            subtitle={loading ? 'Computing…' : totalPeriods === 0 ? 'You aren’t scheduled in any timetable yet.' : 'Each cell shows the section you teach during that period.'}
          />
          <CardBody className="p-0 overflow-x-auto">
            {totalPeriods === 0 && !loading ? (
              <div className="p-10 text-center text-[var(--color-text-muted)]">
                Ask your principal to add you to a class-subject assignment.
              </div>
            ) : (
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-text-subtle)]">
                    <th className="px-3 py-3 text-left w-24">Period</th>
                    {DAYS.map((d) => (
                      <th key={d} className="px-3 py-3 text-left">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allPeriods.map((idx) => {
                    // Find times for this period (assume same across the week)
                    const sample = data
                      .flatMap((s) => s.periods)
                      .find((p) => p.periodIndex === idx);
                    return (
                      <tr key={idx} className="border-b last:border-0 border-[var(--color-border)] align-top">
                        <td className="px-3 py-3">
                          <div className="font-bold tabular-nums">P{idx}</div>
                          {sample && (
                            <div className="text-xs text-[var(--color-text-muted)] tabular-nums">
                              {sample.startTime}–{sample.endTime}
                            </div>
                          )}
                        </td>
                        {DAYS.map((_, day) => {
                          const cells = grid.get(`${day}-${idx}`) ?? [];
                          return (
                            <td key={day} className="px-2 py-2 min-w-[120px]">
                              {cells.length === 0 ? (
                                <div className="h-12" />
                              ) : (
                                cells.map((c, i) => (
                                  <div
                                    key={i}
                                    className="p-2 rounded-lg mb-1 text-xs"
                                    style={{
                                      background: `${ACCENT}10`,
                                      border: `1px solid ${ACCENT}30`,
                                    }}
                                  >
                                    <div className="font-semibold" style={{ color: ACCENT }}>{c.subject}</div>
                                    <div className="text-[var(--color-text-muted)] mt-0.5">
                                      {c.className} · {c.section}
                                    </div>
                                  </div>
                                ))
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        {/* Per-section list */}
        {data.length > 0 && (
          <Card variant="solid">
            <CardHeader eyebrow="Where you teach" title="Sections + period count" />
            <CardBody className="p-0">
              <ul>
                {data.map((s) => (
                  <li key={s.sectionId} className="px-5 py-3 border-b last:border-0 border-[var(--color-border)] flex items-center justify-between">
                    <div>
                      <div className="font-medium">{s.className}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">Section {s.sectionName}</div>
                    </div>
                    <span className="ef-chip" style={{ background: `${ACCENT}10`, color: ACCENT, borderColor: 'transparent' }}>
                      {s.periods.length} period{s.periods.length === 1 ? '' : 's'}/week
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}

function BigStat({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="ef-eyebrow">{label}</div>
        <span className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: `${ACCENT}10`, color: ACCENT }}>
          {icon}
        </span>
      </div>
      <div className="mt-3 text-3xl font-bold tabular-nums tracking-tight">{value}</div>
    </Card>
  );
}
