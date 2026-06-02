'use client';
import { useEffect, useState } from 'react';
import { Building2, BookOpen, ScrollText, Plus } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, session } from '@/lib/api';

const ACCENT = '#dc2626';

type Tab = 'profile' | 'subjects' | 'audit';

export default function PrincipalSettingsPage() {
  const [tab, setTab] = useState<Tab>('profile');

  return (
    <>
      <TopBar title="Settings" eyebrow="Principal portal" />
      <div className="flex-1 p-6 space-y-5 max-w-4xl">
        {/* Tab strip */}
        <div className="flex gap-1 p-1 bg-[var(--color-surface-muted)] rounded-xl">
          {([
            { id: 'profile',  label: 'School profile', icon: Building2 },
            { id: 'subjects', label: 'Subjects',       icon: BookOpen },
            { id: 'audit',    label: 'Audit log',      icon: ScrollText },
          ] as Array<{ id: Tab; label: string; icon: any }>).map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  active ? 'bg-white shadow-sm text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'
                }`}
                style={active ? { color: ACCENT } : undefined}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            );
          })}
        </div>

        {tab === 'profile' && <ProfileTab />}
        {tab === 'subjects' && <SubjectsTab />}
        {tab === 'audit' && <AuditTab />}
      </div>
    </>
  );
}

// =====================================================================
// Profile tab
// =====================================================================
function ProfileTab() {
  const [school, setSchool] = useState<any>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      const s = await api('/school', { token: session.token(), subdomain: session.subdomain() });
      setSchool(s);
      setForm({
        name: (s as any).name ?? '',
        email: (s as any).email ?? '',
        phone: (s as any).phone ?? '',
        address: (s as any).address ?? '',
      });
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setBusy(true);
    try {
      await api('/school', {
        method: 'PATCH',
        token: session.token(), subdomain: session.subdomain(),
        body: JSON.stringify(form),
      });
      await load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <>
      {err && <Card className="p-4 text-sm text-[var(--color-danger)] mb-4">{err}</Card>}
      <Card variant="solid">
        <CardHeader title="School profile" subtitle="Shown on report cards, login forms, and notifications." />
        <CardBody>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="School name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="mt-4">
            <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </CardBody>
      </Card>
      {school && (
        <Card variant="solid" className="mt-4">
          <CardHeader eyebrow="Read-only" title="School identity" subtitle="Set at registration; contact support to change." />
          <CardBody>
            <dl className="grid sm:grid-cols-3 gap-4 text-sm">
              <Field label="Subdomain" value={school.subdomain} />
              <Field label="Board" value={school.board} />
              <Field label="Created" value={new Date(school.createdAt).toLocaleDateString()} />
            </dl>
          </CardBody>
        </Card>
      )}
    </>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <dt className="ef-eyebrow">{label}</dt>
      <dd className="text-[var(--color-text)] mt-1 font-medium">{value || '—'}</dd>
    </div>
  );
}

// =====================================================================
// Subjects tab
// =====================================================================
function SubjectsTab() {
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string; code: string | null }>>([]);
  const [draft, setDraft] = useState({ name: '', code: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      const r = await api<typeof subjects>('/admin/subjects', { token: session.token(), subdomain: session.subdomain() });
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
      {err && <Card className="p-4 text-sm text-[var(--color-danger)] mb-4">{err}</Card>}
      <Card variant="solid">
        <CardHeader title="Add subject" subtitle="Subjects map to class-subject teaching assignments and timetables." />
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
      <Card variant="solid" className="mt-4">
        <CardHeader eyebrow="Catalogue" title={`${subjects.length} subjects`} />
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
    </>
  );
}

// =====================================================================
// Audit tab
// =====================================================================
function AuditTab() {
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<any[]>('/admin/audit?limit=200', { token: session.token(), subdomain: session.subdomain() })
      .then(setItems)
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <Card variant="solid">
      <CardHeader title={`${items.length} recent events`} subtitle="Append-only log of meaningful actions." />
      <CardBody className="p-0">
        {err && <div className="p-4 text-sm text-[var(--color-danger)]">{err}</div>}
        {items.length === 0 ? (
          <div className="p-10 text-center text-[var(--color-text-muted)]">No activity yet.</div>
        ) : (
          <ul>
            {items.map((e) => (
              <li key={e.id} className="px-5 py-3 border-b last:border-0 border-[var(--color-border)]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{e.action}</span>
                  <span className="ef-chip">{e.entity}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">{new Date(e.createdAt).toLocaleString()}</span>
                </div>
                <div className="text-sm text-[var(--color-text-muted)] mt-1">
                  {e.actor ? `${e.actor.name} (${e.actor.role})` : 'System'}
                  {e.entityId && <> · <code className="text-xs">{e.entityId.slice(0, 8)}</code></>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
