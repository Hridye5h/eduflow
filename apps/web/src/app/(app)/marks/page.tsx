'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { api, session } from '@/lib/api';
import { ArrowRight, Plus, CheckCircle2 } from 'lucide-react';

type ClassRow = { id: string; grade: number; label: string; sections: { id: string; name: string }[] };
type Exam = {
  id: string;
  name: string;
  type: string;
  maxMarks: number;
  date: string | null;
  publishedAt: string | null;
  class: { id: string; label: string };
  subject?: { id: string; name: string } | null;
  _count: { marks: number };
};

const EXAM_TYPES = ['UNIT_TEST', 'MID_TERM', 'FINAL', 'PRACTICAL', 'ASSIGNMENT', 'OTHER'];

export default function MarksPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: '',
    type: 'UNIT_TEST',
    classId: '',
    maxMarks: '50',
    date: '',
  });
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [c, e] = await Promise.all([
        api<ClassRow[]>('/classes', { token: session.token(), subdomain: session.subdomain() }),
        api<Exam[]>('/exams', { token: session.token(), subdomain: session.subdomain() }),
      ]);
      setClasses(c);
      setExams(e);
      if (c.length && !draft.classId) setDraft((d) => ({ ...d, classId: c[0].id }));
    } catch (e: any) {
      setErr(e.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function createExam(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/exams', {
        method: 'POST',
        token: session.token(),
        subdomain: session.subdomain(),
        body: JSON.stringify({
          name: draft.name,
          type: draft.type,
          classId: draft.classId,
          maxMarks: Number(draft.maxMarks),
          date: draft.date || undefined,
        }),
      });
      setDraft({ ...draft, name: '', date: '' });
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar title="Marks & Exams" />
      <div className="flex-1 p-6 space-y-5 max-w-5xl">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        <Card>
          <CardHeader title="Create exam" subtitle="Add a new unit test, mid-term, or final." />
          <CardBody>
            <form onSubmit={createExam} className="grid sm:grid-cols-5 gap-3 items-end">
              <div className="sm:col-span-2">
                <Input
                  label="Name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  required
                  placeholder="Mid-term · Math"
                />
              </div>
              <Select label="Type" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                {EXAM_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </Select>
              <Select label="Class" value={draft.classId} onChange={(e) => setDraft({ ...draft, classId: e.target.value })}>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </Select>
              <Input label="Max marks" type="number" value={draft.maxMarks} onChange={(e) => setDraft({ ...draft, maxMarks: e.target.value })} required />
              <Input label="Date" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
              <Button type="submit" disabled={busy}><Plus className="h-4 w-4" /> Create</Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="All exams" subtitle={`${exams.length} exam${exams.length === 1 ? '' : 's'} so far`} />
          <CardBody className="p-0">
            {exams.length === 0 ? (
              <div className="p-8 text-center text-[var(--color-text-muted)]">No exams yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-[var(--color-border)] text-[var(--color-text-subtle)] text-xs uppercase tracking-wider">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Class</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3 text-right">Max</th>
                    <th className="px-5 py-3 text-right">Marked</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((e) => (
                    <tr key={e.id} className="border-b last:border-0 border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]/60">
                      <td className="px-5 py-3 font-medium text-[var(--color-text)]">{e.name}</td>
                      <td className="px-5 py-3 text-[var(--color-text-muted)]">{e.class.label}</td>
                      <td className="px-5 py-3"><span className="ef-chip">{e.type.replace('_', ' ')}</span></td>
                      <td className="px-5 py-3 text-right tabular-nums">{e.maxMarks}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-[var(--color-text-muted)]">{e._count.marks}</td>
                      <td className="px-5 py-3">
                        {e.publishedAt ? (
                          <span className="ef-chip ef-chip-success"><CheckCircle2 className="h-3 w-3" /> Published</span>
                        ) : (
                          <span className="ef-chip ef-chip-warn">Draft</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link href={`/marks/${e.id}`} className="ef-btn ef-btn-ghost text-sm">
                          Open <ArrowRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
