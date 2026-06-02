'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, ArrowRight, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api, session } from '@/lib/api';

const ACCENT = '#2563eb';

type FeedAssignment = {
  id: string;
  title: string;
  body: string;
  sectionId: string | null;
  assignment: { id: string; dueAt: string; maxMarks: number | null; _count: { submissions: number } };
};

export default function StudentAssignmentsPage() {
  const me = session.user();
  const [items, setItems] = useState<FeedAssignment[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<any[]>('/feed', { token: session.token(), subdomain: session.subdomain() })
      .then((posts) => {
        const a = posts
          .filter((p) => p.type === 'ASSIGNMENT' && p.assignment)
          .map((p) => ({ id: p.id, title: p.title, body: p.body, sectionId: p.sectionId, assignment: p.assignment }));
        setItems(a);
      })
      .catch((e) => setErr(e.message));
  }, []);

  const split = useMemo(() => {
    const now = new Date();
    const upcoming = items.filter((x) => new Date(x.assignment.dueAt) > now);
    const past = items.filter((x) => new Date(x.assignment.dueAt) <= now);
    return { upcoming, past };
  }, [items]);

  return (
    <>
      <TopBar title="Homework & assignments" eyebrow="Student portal" />
      <div className="flex-1 p-6 space-y-5 max-w-3xl">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        <section className="grid grid-cols-2 gap-4">
          <BigStat label="Upcoming" value={split.upcoming.length} icon={<Clock className="h-5 w-5" />} />
          <BigStat label="Past due" value={split.past.length} icon={<AlertTriangle className="h-5 w-5" />} />
        </section>

        {split.upcoming.length === 0 && split.past.length === 0 && (
          <Card variant="solid" className="p-10 text-center text-[var(--color-text-muted)] flex flex-col items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-[var(--color-success)]" />
            <p>No assignments yet. Check back later.</p>
          </Card>
        )}

        {split.upcoming.length > 0 && (
          <Card variant="solid">
            <CardHeader eyebrow="Upcoming" title="Submit before the due date" />
            <CardBody className="p-0">
              <ul>
                {split.upcoming.map((a) => (
                  <AssignmentRow key={a.id} a={a} />
                ))}
              </ul>
            </CardBody>
          </Card>
        )}

        {split.past.length > 0 && (
          <Card variant="solid">
            <CardHeader eyebrow="Past due" title="Late submissions still accepted (where allowed)" />
            <CardBody className="p-0">
              <ul>
                {split.past.map((a) => (
                  <AssignmentRow key={a.id} a={a} late />
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}

function AssignmentRow({ a, late }: { a: FeedAssignment; late?: boolean }) {
  return (
    <li className="px-5 py-4 border-b last:border-0 border-[var(--color-border)] flex items-start gap-3">
      <span
        className="h-10 w-10 rounded-lg grid place-items-center shrink-0 mt-0.5"
        style={{ background: `${ACCENT}10`, color: ACCENT }}
      >
        <ClipboardList className="h-5 w-5" />
      </span>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm">{a.title}</h3>
        <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mt-0.5">{a.body}</p>
        <div className="flex flex-wrap gap-2 mt-2 text-xs">
          <span className={`ef-chip ${late ? 'ef-chip-danger' : 'ef-chip-brand'}`}>
            <Clock className="h-3 w-3" /> Due {new Date(a.assignment.dueAt).toLocaleString()}
          </span>
          {a.assignment.maxMarks != null && <span className="ef-chip">Max {a.assignment.maxMarks}</span>}
        </div>
      </div>
      <Link
        href={`/student/assignments/${a.assignment.id}`}
        className="ef-btn ef-btn-outline text-xs py-1.5 px-3 shrink-0"
      >
        Open <ArrowRight className="h-3 w-3" />
      </Link>
    </li>
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
