'use client';
import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api, session } from '@/lib/api';
import { useChildren } from '@/lib/use-children';
import { ChildHeader } from '@/components/parent/ChildHeader';

const ACCENT = '#0d9488';

type Item = {
  id: string;
  title: string;
  body: string;
  sectionId: string | null;
  assignment: { id: string; dueAt: string; maxMarks: number | null; _count: { submissions: number } };
};

export default function ParentAssignmentsPage() {
  const { children, activeChild, activeChildId, setActiveChildId } = useChildren();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!activeChildId) return;
    api<any[]>('/feed', { token: session.token(), subdomain: session.subdomain() })
      .then((posts) => {
        const a = posts
          .filter((p) => p.type === 'ASSIGNMENT' && p.assignment)
          .map((p) => ({ id: p.id, title: p.title, body: p.body, sectionId: p.sectionId, assignment: p.assignment }));
        setItems(a);
      })
      .catch(() => setItems([]));
  }, [activeChildId]);

  const split = useMemo(() => {
    const now = new Date();
    return {
      upcoming: items.filter((x) => new Date(x.assignment.dueAt) > now),
      past: items.filter((x) => new Date(x.assignment.dueAt) <= now),
    };
  }, [items]);

  return (
    <>
      <TopBar title="Homework" eyebrow="Parent portal" />
      <div className="flex-1 p-6 space-y-5 max-w-3xl">
        <ChildHeader children={children} active={activeChild} onSwitch={setActiveChildId} />

        {!activeChild ? null : (
          <>
            <section className="grid grid-cols-2 gap-4">
              <BigStat label="Upcoming" value={split.upcoming.length} icon={<Clock className="h-5 w-5" />} />
              <BigStat label="Past due" value={split.past.length} icon={<AlertTriangle className="h-5 w-5" />} />
            </section>

            {split.upcoming.length === 0 && split.past.length === 0 && (
              <Card variant="solid" className="p-10 text-center text-[var(--color-text-muted)] flex flex-col items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-[var(--color-success)]" />
                <p>No assignments for {activeChild.student.name.split(' ')[0]} yet.</p>
              </Card>
            )}

            {split.upcoming.length > 0 && (
              <Card variant="solid">
                <CardHeader eyebrow="Upcoming" title="Due in the future" />
                <CardBody className="p-0">
                  <ul>
                    {split.upcoming.map((a) => <Row key={a.id} a={a} />)}
                  </ul>
                </CardBody>
              </Card>
            )}

            {split.past.length > 0 && (
              <Card variant="solid">
                <CardHeader eyebrow="Past due" title="Already past their due dates" />
                <CardBody className="p-0">
                  <ul>
                    {split.past.map((a) => <Row key={a.id} a={a} late />)}
                  </ul>
                </CardBody>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}

function Row({ a, late }: { a: Item; late?: boolean }) {
  return (
    <li className="px-5 py-4 border-b last:border-0 border-[var(--color-border)] flex items-start gap-3">
      <span className="h-10 w-10 rounded-lg grid place-items-center shrink-0 mt-0.5" style={{ background: `${ACCENT}10`, color: ACCENT }}>
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
