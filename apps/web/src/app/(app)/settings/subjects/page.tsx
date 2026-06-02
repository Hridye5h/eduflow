'use client';
import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, session } from '@/lib/api';
import { Plus } from 'lucide-react';

type Subject = { id: string; name: string; code: string | null };

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [draft, setDraft] = useState({ name: '', code: '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const r = await api<Subject[]>('/admin/subjects', {
        token: session.token(), subdomain: session.subdomain(),
      });
      setSubjects(r);
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/admin/subjects', {
        method: 'POST',
        token: session.token(), subdomain: session.subdomain(),
        body: JSON.stringify(draft),
      });
      setDraft({ name: '', code: '' });
      await load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <TopBar title="Subjects" />
      <div className="flex-1 p-6 space-y-5 max-w-3xl">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        <Card>
          <CardHeader title="Add subject" />
          <CardBody>
            <form onSubmit={create} className="flex gap-3 items-end">
              <div className="flex-1">
                <Input label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required placeholder="Mathematics" />
              </div>
              <div className="w-32">
                <Input label="Code" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="MATH" />
              </div>
              <Button type="submit" disabled={busy}><Plus className="h-4 w-4" /> Add</Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`${subjects.length} subjects`} />
          <CardBody className="p-0">
            <ul>
              {subjects.map((s) => (
                <li key={s.id} className="px-5 py-3 border-b last:border-0 border-[var(--color-border)] flex justify-between items-center">
                  <span className="font-medium">{s.name}</span>
                  {s.code && <span className="ef-chip">{s.code}</span>}
                </li>
              ))}
              {subjects.length === 0 && (
                <li className="px-5 py-10 text-center text-[var(--color-text-muted)]">No subjects yet.</li>
              )}
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
