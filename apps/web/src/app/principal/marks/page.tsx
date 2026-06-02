'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, ArrowRight, CheckCircle2, FileText } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { api, session } from '@/lib/api';

const ACCENT = '#dc2626';

type ClassRow = { id: string; grade: number; label: string; sections: { id: string; name: string }[] };
type Exam = {
  id: string; name: string; type: string; maxMarks: number;
  date: string | null; publishedAt: string | null;
  class: { id: string; label: string };
  subject?: { id: string; name: string } | null;
  _count: { marks: number };
};

const EXAM_TYPES = ['UNIT_TEST', 'MID_TERM', 'FINAL', 'PRACTICAL', 'ASSIGNMENT', 'OTHER'];

export default function PrincipalMarksPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [draft, setDraft] = useState({
    name: '', type: 'UNIT_TEST', classId: '', maxMarks: '50', date: '',
  });
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [c, e] = await Promise.all([
        api<ClassRow[]>('/classes', { token: session.token(), subdomain: session.subdomain() }),
        api<Exam[]>('/exams',       { token: session.token(), subdomain: session.subdomain() }),
      ]);
      setClasses(c);
      setExams(e);
      if (c.length && !draft.classId) setDraft((d) => ({ ...d, classId: c[0].id }));
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function createExam(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/exams', {
        method: 'POST',
        token: session.token(), subdomain: session.subdomain(),
        body: JSON.stringify({
          name: draft.name, type: draft.type, classId: draft.classId,
          maxMarks: Number(draft.maxMarks), date: draft.date || undefined,
        }),
      });
      setDraft({ ...draft, name: '', date: '' });
      await load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const visible = filter === 'all' ? exams :
    filter === 'published' ? exams.filter((e) => e.publishedAt) :
    exams.filter((e) => !e.publishedAt);

  return (
    <>
      <TopBar title="Marks & exams" eyebrow="Principal portal" />
      <div className="flex-1 p-6 space-y-5 max-w-7xl">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        <section className="grid grid-cols-3 gap-4">
          <BigStat label="All exams"   value={exams.length} />
          <BigStat label="Published"   value={exams.filter((e) => e.publishedAt).length} tone="success" />
          <BigStat label="Drafts"      value={exams.filter((e) => !e.publishedAt).length} tone="warn" />
        </section>

        <Card variant="solid">
          <CardHeader title="Create exam" subtitle="Schedule a unit test, mid-term, or final for any class." />
          <CardBody>
            <form onSubmit={createExam} className="grid sm:grid-cols-5 gap-3 items-end">
              <div className="sm:col-span-2">
                <Input label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required placeholder="Mid-term · Math" />
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

        <Card variant="solid">
          <CardHeader
            eyebrow="All exams"
            title={`${visible.length} ${filter !== 'all' ? filter : ''} exam${visible.length === 1 ? '' : 's'}`}
            right={
              <div className="flex gap-1 p-1 bg-[var(--color-surface-muted)] rounded-lg text-xs">
                {(['all', 'published', 'draft'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors capitalize ${
                      filter === f ? 'bg-white shadow-sm text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            }
          />
          <CardBody className="p-0">
            {visible.length === 0 ? (
              <div className="p-8 text-center text-[var(--color-text-muted)]">No exams.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-text-subtle)]">
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
                  {visible.map((e) => (
                    <tr key={e.id} className="border-b last:border-0 border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]/60">
                      <td className="px-5 py-3 font-medium">{e.name}</td>
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
                        <Link href={`/principal/marks/${e.id}`} className="ef-btn ef-btn-ghost text-sm">
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

function BigStat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'success' | 'warn' | 'danger' }) {
  const cls = tone === 'success' ? 'text-[var(--color-success)]'
    : tone === 'warn'   ? 'text-[var(--color-warn)]'
    : tone === 'danger' ? 'text-[var(--color-danger)]'
    : 'text-[var(--color-text)]';
  return (
    <Card className="p-5">
      <div className="ef-eyebrow">{label}</div>
      <div className={`mt-3 text-3xl font-bold tabular-nums tracking-tight ${cls}`}>{value}</div>
    </Card>
  );
}
