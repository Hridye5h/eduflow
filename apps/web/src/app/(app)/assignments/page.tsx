'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { api, session } from '@/lib/api';
import { ArrowRight, Plus } from 'lucide-react';

type ClassRow = { id: string; label: string; sections: { id: string; name: string }[] };
type AssignmentPost = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string };
  assignment: {
    id: string;
    dueAt: string;
    maxMarks: number | null;
    _count: { submissions: number };
  } | null;
};

export default function AssignmentsPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [items, setItems] = useState<AssignmentPost[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: '', body: '', dueAt: '', maxMarks: '' });
  const [busy, setBusy] = useState(false);

  async function loadClasses() {
    try {
      const c = await api<ClassRow[]>('/classes', {
        token: session.token(), subdomain: session.subdomain(),
      });
      setClasses(c);
      const first = c.flatMap((cc) => cc.sections)[0];
      if (first && !sectionId) setSectionId(first.id);
    } catch (e: any) { setErr(e.message); }
  }
  async function loadList() {
    if (!sectionId) return;
    try {
      const list = await api<AssignmentPost[]>(`/assignments?sectionId=${sectionId}`, {
        token: session.token(), subdomain: session.subdomain(),
      });
      setItems(list);
    } catch (e: any) { setErr(e.message); }
  }

  useEffect(() => { loadClasses(); }, []);
  useEffect(() => { loadList(); }, [sectionId]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/assignments', {
        method: 'POST',
        token: session.token(),
        subdomain: session.subdomain(),
        body: JSON.stringify({
          sectionId,
          title: draft.title,
          body: draft.body,
          dueAt: draft.dueAt,
          maxMarks: draft.maxMarks ? Number(draft.maxMarks) : undefined,
        }),
      });
      setDraft({ title: '', body: '', dueAt: '', maxMarks: '' });
      await loadList();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <TopBar title="Homework & Assignments" />
      <div className="flex-1 p-6 space-y-5 max-w-4xl">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        <Card>
          <CardBody>
            <div className="w-72">
              <Select label="Section" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                {classes.flatMap((c) => c.sections.map((s) => (
                  <option key={s.id} value={s.id}>{c.label} — Section {s.name}</option>
                )))}
              </Select>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="New assignment" />
          <CardBody>
            <form onSubmit={create} className="space-y-3">
              <Input label="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)] mb-1.5">Description</span>
                <textarea
                  className="ef-input min-h-[5rem]"
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  required
                />
              </label>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input label="Due at" type="datetime-local" value={draft.dueAt} onChange={(e) => setDraft({ ...draft, dueAt: e.target.value })} required />
                <Input label="Max marks (optional)" type="number" value={draft.maxMarks} onChange={(e) => setDraft({ ...draft, maxMarks: e.target.value })} />
              </div>
              <Button type="submit" disabled={busy}><Plus className="h-4 w-4" /> {busy ? 'Creating…' : 'Create'}</Button>
            </form>
          </CardBody>
        </Card>

        <div className="space-y-3">
          {items.length === 0 && (
            <Card className="p-8 text-center text-[var(--color-text-muted)]">No assignments in this section yet.</Card>
          )}
          {items.map((p) => (
            <Card key={p.id}>
              <CardBody className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 mt-1">{p.body}</p>
                  <div className="flex gap-2 mt-3 text-xs text-[var(--color-text-muted)] flex-wrap">
                    <span className="ef-chip ef-chip-brand">Due {new Date(p.assignment!.dueAt).toLocaleString()}</span>
                    {p.assignment!.maxMarks != null && <span className="ef-chip">Max {p.assignment!.maxMarks}</span>}
                    <span className="ef-chip">{p.assignment!._count.submissions} submissions</span>
                  </div>
                </div>
                <Link href={`/assignments/${p.assignment!.id}`} className="ef-btn ef-btn-ghost text-sm">
                  Open <ArrowRight className="h-4 w-4" />
                </Link>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
