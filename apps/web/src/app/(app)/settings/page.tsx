'use client';
import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { api, session } from '@/lib/api';
import Link from 'next/link';
import { Users, BookOpen, ScrollText } from 'lucide-react';

export default function SettingsHome() {
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
      <TopBar title="Settings" />
      <div className="flex-1 p-6 space-y-5 max-w-4xl">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        <div className="grid sm:grid-cols-3 gap-4">
          <SettingCard href="/settings/users" icon={<Users className="h-5 w-5" />} title="Users" desc="Teachers, students, parents" />
          <SettingCard href="/settings/subjects" icon={<BookOpen className="h-5 w-5" />} title="Subjects" desc="Master subject list" />
          <SettingCard href="/settings/audit" icon={<ScrollText className="h-5 w-5" />} title="Audit log" desc="Who changed what" />
        </div>

        <Card>
          <CardHeader title="School profile" subtitle="Visible on report cards and notifications" />
          <CardBody>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="School name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="mt-4">
              <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
            </div>
          </CardBody>
        </Card>

        {school && (
          <Card>
            <CardHeader title="School identity" subtitle="Set during registration — read only here" />
            <CardBody>
              <dl className="grid sm:grid-cols-3 gap-4 text-sm">
                <Field label="Subdomain" value={school.subdomain} />
                <Field label="Board" value={school.board} />
                <Field label="Created" value={new Date(school.createdAt).toLocaleDateString()} />
              </dl>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}

function SettingCard({ href, icon, title, desc }: any) {
  return (
    <Link href={href} className="ef-card p-5 flex items-start gap-3 hover:border-[var(--color-brand)] transition-colors">
      <span className="h-10 w-10 grid place-items-center rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
        {icon}
      </span>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-[var(--color-text-muted)] mt-0.5">{desc}</div>
      </div>
    </Link>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)]">{label}</dt>
      <dd className="text-[var(--color-text)] mt-1">{value || '—'}</dd>
    </div>
  );
}
