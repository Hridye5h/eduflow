'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarCheck, BookOpenCheck, MessageSquare, ClipboardList,
  ArrowRight, Clock, Megaphone, ChevronRight, Sparkles, Shield,
} from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api, session } from '@/lib/api';

const ACCENT = '#d97706';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type ClassRow = {
  id: string;
  label: string;
  sections: Array<{
    id: string;
    name: string;
    classTeacherId: string | null;
    classTeacher?: { id: string; name: string } | null;
  }>;
};

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

type SectionPeriods = {
  sectionId: string;
  className: string;
  sectionName: string;
  periods: Period[];
};

export default function TeacherDashboard() {
  const me = session.user();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sectionsWithPeriods, setSectionsWithPeriods] = useState<SectionPeriods[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    const t = session.token();
    const s = session.subdomain();

    api<ClassRow[]>('/classes', { token: t, subdomain: s })
      .then(async (cs) => {
        setClasses(cs);
        // For each section, fetch the timetable and keep only periods this teacher owns
        const allSections = cs.flatMap((c) => c.sections.map((sec) => ({ ...sec, classLabel: c.label })));
        const tts = await Promise.all(
          allSections.map((sec) =>
            api<{ timetable: { periods: Period[] } }>(`/timetable/section/${sec.id}`, { token: t, subdomain: s })
              .then((r) => ({
                sectionId: sec.id,
                className: sec.classLabel,
                sectionName: sec.name,
                periods: r.timetable.periods.filter((p) => p.teacherId === me.id),
              }))
              .catch(() => ({ sectionId: sec.id, className: sec.classLabel, sectionName: sec.name, periods: [] as Period[] })),
          ),
        );
        setSectionsWithPeriods(tts.filter((s) => s.periods.length > 0));
      })
      .catch((e) => setErr(e.message));

    api<any[]>('/exams', { token: t, subdomain: s }).then(setExams).catch(() => {});
    api<any[]>('/feed', { token: t, subdomain: s }).then(setPosts).catch(() => {});
  }, [me?.id]);

  // ---- Derived ----
  const today = new Date();
  const todayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1; // Mon=0..Sat=5

  const todaysPeriods = useMemo(() => {
    const out: Array<Period & { className: string; sectionName: string; sectionId: string }> = [];
    for (const s of sectionsWithPeriods) {
      for (const p of s.periods.filter((x) => x.dayOfWeek === todayIdx)) {
        out.push({ ...p, className: s.className, sectionName: s.sectionName, sectionId: s.sectionId });
      }
    }
    return out.sort((a, b) => a.periodIndex - b.periodIndex);
  }, [sectionsWithPeriods, todayIdx]);

  const sectionsITeach = sectionsWithPeriods.length;

  // Sections where I'm class teacher
  const myClassTeacherships = useMemo(() => {
    return classes.flatMap((c) =>
      c.sections.filter((s) => s.classTeacherId === me?.id).map((s) => ({
        classLabel: c.label,
        sectionId: s.id,
        sectionName: s.name,
      })),
    );
  }, [classes, me?.id]);

  // Exams I entered
  const myExams = useMemo(() => exams.filter((e) => e.publishedAt), [exams]);
  const draftExams = useMemo(() => exams.filter((e) => !e.publishedAt), [exams]);

  return (
    <>
      <TopBar
        title={`Good ${greet()}, ${me?.name?.split(' ')[0] ?? 'Teacher'}`}
        eyebrow="Teacher portal"
      />
      <div className="flex-1 p-6 space-y-6 max-w-7xl">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        <HeroCard
          name={me?.name ?? 'Teacher'}
          todayLabel={today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          classTeacherSections={myClassTeacherships}
        />

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <BigStat
            label="Today's classes"
            value={todaysPeriods.length}
            icon={<Clock className="h-5 w-5" />}
            sub={todaysPeriods.length === 0 ? 'No periods today' : `Next: ${todaysPeriods[0].startTime}`}
          />
          <BigStat
            label="Sections you teach"
            value={sectionsITeach}
            icon={<Shield className="h-5 w-5" />}
          />
          <BigStat
            label="Published exams"
            value={myExams.length}
            icon={<BookOpenCheck className="h-5 w-5" />}
            sub={`${draftExams.length} drafts`}
          />
          <BigStat
            label="Class-teacher of"
            value={myClassTeacherships.length}
            icon={<Sparkles className="h-5 w-5" />}
            sub="sections"
          />
        </section>

        <section className="grid lg:grid-cols-3 gap-4">
          {/* Today's schedule */}
          <Card variant="solid" className="lg:col-span-2 overflow-hidden">
            <CardHeader
              eyebrow="Today's schedule"
              title={DAYS[today.getDay()] + ' · ' + today.toLocaleDateString()}
              subtitle={
                todaysPeriods.length
                  ? `${todaysPeriods.length} period${todaysPeriods.length === 1 ? '' : 's'}`
                  : 'No classes scheduled today'
              }
              right={
                <Link href="/teacher/timetable" className="ef-btn ef-btn-ghost text-sm">
                  Full week <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
            {todaysPeriods.length === 0 ? (
              <CardBody className="text-center py-10 text-[var(--color-text-muted)]">
                Free day. Catch up on grading or post homework for tomorrow.
              </CardBody>
            ) : (
              <ul>
                {todaysPeriods.map((p) => (
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
                        {p.subject?.name ?? '—'} <span className="text-[var(--color-text-muted)]">· {p.className} {p.sectionName}</span>
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)] tabular-nums">
                        {p.startTime}–{p.endTime}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[var(--color-text-subtle)]" />
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
                href="/teacher/attendance"
                icon={<CalendarCheck className="h-4 w-4" />}
                label="Mark today's attendance"
              />
              <QuickAction
                href="/teacher/marks"
                icon={<BookOpenCheck className="h-4 w-4" />}
                label="Enter exam marks"
              />
              <QuickAction
                href="/teacher/feed"
                icon={<Megaphone className="h-4 w-4" />}
                label="Post homework / notice"
              />
              <QuickAction
                href="/teacher/assignments"
                icon={<ClipboardList className="h-4 w-4" />}
                label="Grade submissions"
              />
            </CardBody>
          </Card>
        </section>

        {/* Recent posts */}
        <Card variant="solid">
          <CardHeader
            eyebrow="Recent on the wall"
            title="Latest class posts"
            right={
              <Link href="/teacher/feed" className="ef-btn ef-btn-ghost text-sm">
                Open feed <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          <CardBody className="p-0">
            {posts.slice(0, 5).length === 0 ? (
              <div className="p-8 text-center text-[var(--color-text-muted)]">No posts yet.</div>
            ) : (
              <ul>
                {posts.slice(0, 5).map((p) => (
                  <li key={p.id} className="px-5 py-3 border-b last:border-0 border-[var(--color-border)] flex items-start gap-3">
                    <span
                      className="h-9 w-9 rounded-lg grid place-items-center shrink-0"
                      style={{ background: `${ACCENT}10`, color: ACCENT }}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="ef-chip">{p.type.replace('_', ' ')}</span>
                        <span className="text-xs text-[var(--color-text-muted)]">{p.author?.name} · {new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="font-medium text-sm mt-0.5 truncate">{p.title}</p>
                    </div>
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

function greet() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

function HeroCard({
  name, todayLabel, classTeacherSections,
}: {
  name: string;
  todayLabel: string;
  classTeacherSections: Array<{ classLabel: string; sectionName: string }>;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="relative p-6">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            background:
              `radial-gradient(circle at 90% 0%, ${ACCENT} 0%, transparent 50%), ` +
              `radial-gradient(circle at 0% 100%, #eab308 0%, transparent 50%)`,
          }}
        />
        <div className="relative">
          <div className="ef-chip ef-role-teacher mb-2">
            <Shield className="h-3 w-3" /> Teacher
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text)]">
            {name}
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{todayLabel}</p>
          {classTeacherSections.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="ef-eyebrow self-center mr-1">Class teacher of</span>
              {classTeacherSections.map((s, i) => (
                <span key={i} className="ef-chip" style={{ background: `${ACCENT}10`, color: ACCENT, borderColor: 'transparent' }}>
                  {s.classLabel} · {s.sectionName}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function BigStat({
  label, value, icon, sub,
}: { label: string; value: React.ReactNode; icon: React.ReactNode; sub?: string }) {
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
      <div className="mt-3 text-3xl font-bold tabular-nums tracking-tight">{value}</div>
      {sub && <div className="mt-1.5 text-xs text-[var(--color-text-muted)]">{sub}</div>}
    </Card>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] transition-all group"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <span
        className="h-8 w-8 rounded-lg grid place-items-center shrink-0"
        style={{ background: `${ACCENT}10`, color: ACCENT }}
      >
        {icon}
      </span>
      <span className="text-sm font-medium flex-1">{label}</span>
      <ArrowRight className="h-4 w-4 text-[var(--color-text-subtle)] group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}
