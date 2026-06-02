'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { api, session } from '@/lib/api';
import { ArrowRight, Building2, UserCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    schoolName: '',
    subdomain: '',
    board: 'CBSE',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await api<{ accessToken: string; school: any }>('/auth/register-school', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      session.set(res.accessToken, { name: form.adminName, role: 'SUPER_ADMIN' }, form.subdomain);
      router.push('/dashboard');
    } catch (e: any) {
      setErr(e.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center px-4 py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgba(79,70,229,0.22), transparent)' }} />
      <div className="pointer-events-none absolute -bottom-32 -left-24 w-[26rem] h-[26rem] rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgba(20,184,166,0.20), transparent)' }} />

      <div className="w-full max-w-xl relative z-10">
        <Link href="/" className="flex items-center gap-2.5 justify-center mb-7 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          <div
            className="h-9 w-9 rounded-xl grid place-items-center text-white font-bold"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #14b8a6 100%)',
              boxShadow: '0 6px 20px rgba(79,70,229,0.35)',
            }}
          >E</div>
          <span className="font-bold tracking-tight text-[var(--color-text)]">EduFlow</span>
        </Link>

        <Card variant="solid" className="p-7">
          <div className="ef-eyebrow mb-2">Create</div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">Set up your school</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            You'll be the principal / super admin once it's created.
          </p>

          <form onSubmit={submit} className="space-y-5 mt-6">
            <section>
              <div className="flex items-center gap-2 ef-eyebrow mb-3 text-[var(--color-brand)]">
                <Building2 className="h-3.5 w-3.5" /> School
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input label="School name" value={form.schoolName} onChange={(e) => set('schoolName', e.target.value)} required />
                <Input
                  label="Subdomain"
                  value={form.subdomain}
                  onChange={(e) => set('subdomain', e.target.value.replace(/[^a-z0-9-]/g, '').toLowerCase())}
                  required
                  hint="Lowercase, no spaces — e.g. springfield"
                />
              </div>
              <div className="mt-3">
                <Select label="Board" value={form.board} onChange={(e) => set('board', e.target.value)}>
                  <option>CBSE</option>
                  <option>ICSE</option>
                  <option>STATE</option>
                  <option>IB</option>
                  <option>OTHER</option>
                </Select>
              </div>
            </section>

            <section className="pt-4 border-t border-[var(--color-border)]">
              <div className="flex items-center gap-2 ef-eyebrow mb-3 text-[var(--color-brand)]">
                <UserCircle2 className="h-3.5 w-3.5" /> Admin account
              </div>
              <div className="space-y-3">
                <Input label="Full name" value={form.adminName} onChange={(e) => set('adminName', e.target.value)} required />
                <Input label="Email" type="email" value={form.adminEmail} onChange={(e) => set('adminEmail', e.target.value)} required />
                <Input label="Password" type="password" value={form.adminPassword} onChange={(e) => set('adminPassword', e.target.value)} required minLength={6} hint="At least 6 characters" />
              </div>
            </section>

            {err && (
              <div className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/8 border border-[var(--color-danger)]/15 rounded-xl px-3 py-2">
                {err}
              </div>
            )}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Creating…' : <>Create school <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-[var(--color-border)] text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              Already have an account? <Link href="/login" className="text-[var(--color-brand)] font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}
