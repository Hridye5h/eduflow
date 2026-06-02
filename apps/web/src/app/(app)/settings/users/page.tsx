'use client';
import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { api, session } from '@/lib/api';
import { Plus, UserX, UserCheck, Search } from 'lucide-react';

type User = {
  id: string;
  role: string;
  name: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  rollNumber: string | null;
  sectionId: string | null;
};

export default function UsersPage() {
  const [role, setRole] = useState('TEACHER');
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [draft, setDraft] = useState({
    role: 'TEACHER',
    name: '', email: '', phone: '', password: '',
    sectionId: '', rollNumber: '',
  });
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const q = new URLSearchParams({ role, ...(search && { search }) });
      const r = await api<User[]>(`/admin/users?${q}`, {
        token: session.token(), subdomain: session.subdomain(),
      });
      setUsers(r);
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, [role]);

  useEffect(() => {
    api('/classes', { token: session.token(), subdomain: session.subdomain() })
      .then((c: any) => setClasses(c));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/admin/users', {
        method: 'POST',
        token: session.token(), subdomain: session.subdomain(),
        body: JSON.stringify({
          role: draft.role,
          name: draft.name,
          email: draft.email || undefined,
          phone: draft.phone || undefined,
          password: draft.password || undefined,
          sectionId: draft.role === 'STUDENT' ? draft.sectionId : undefined,
          rollNumber: draft.role === 'STUDENT' ? draft.rollNumber : undefined,
        }),
      });
      setDraft({ ...draft, name: '', email: '', phone: '', password: '', rollNumber: '' });
      setRole(draft.role);
      await load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function toggleActive(u: User) {
    await api(`/admin/users/${u.id}/active`, {
      method: 'PATCH',
      token: session.token(), subdomain: session.subdomain(),
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    await load();
  }

  return (
    <>
      <TopBar title="User management" />
      <div className="flex-1 p-6 space-y-5 max-w-5xl">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        <Card>
          <CardHeader title="Add user" subtitle="Create a teacher, student, or parent account." />
          <CardBody>
            <form onSubmit={create} className="grid sm:grid-cols-4 gap-3 items-end">
              <Select label="Role" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
                <option value="TEACHER">Teacher</option>
                <option value="STUDENT">Student</option>
                <option value="PARENT">Parent</option>
                <option value="SUPER_ADMIN">Super admin</option>
              </Select>
              <Input label="Full name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
              <Input label="Email" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              <Input label="Phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              <Input label="Password" type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} hint="Optional for parents (use OTP)" />
              {draft.role === 'STUDENT' && (
                <>
                  <Select label="Section" value={draft.sectionId} onChange={(e) => setDraft({ ...draft, sectionId: e.target.value })}>
                    <option value="">— Select section —</option>
                    {classes.flatMap((c: any) => c.sections.map((s: any) => (
                      <option key={s.id} value={s.id}>{c.label} — {s.name}</option>
                    )))}
                  </Select>
                  <Input label="Roll number" value={draft.rollNumber} onChange={(e) => setDraft({ ...draft, rollNumber: e.target.value })} />
                </>
              )}
              <div className="sm:col-span-4 flex justify-end">
                <Button type="submit" disabled={busy}><Plus className="h-4 w-4" /> {busy ? 'Adding…' : 'Add user'}</Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={`${role.toLowerCase().replace('_', ' ')}s`}
            subtitle={`${users.length} total`}
            right={
              <div className="flex gap-2 items-center">
                <Select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="SUPER_ADMIN">Admins</option>
                  <option value="TEACHER">Teachers</option>
                  <option value="STUDENT">Students</option>
                  <option value="PARENT">Parents</option>
                </Select>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-surface-muted)] text-sm w-64">
                  <Search className="h-4 w-4 text-[var(--color-text-muted)]" />
                  <input
                    placeholder="Search name, email…"
                    className="bg-transparent outline-none flex-1"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && load()}
                  />
                </div>
              </div>
            }
          />
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-text-subtle)]">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email / Phone</th>
                  {role === 'STUDENT' && <th className="px-5 py-3">Roll</th>}
                  <th className="px-5 py-3 w-32">Status</th>
                  <th className="px-5 py-3 w-32"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]/60">
                    <td className="px-5 py-3 font-medium">{u.name}</td>
                    <td className="px-5 py-3 text-[var(--color-text-muted)]">{u.email || u.phone || '—'}</td>
                    {role === 'STUDENT' && <td className="px-5 py-3 tabular-nums text-[var(--color-text-muted)]">{u.rollNumber || '—'}</td>}
                    <td className="px-5 py-3">
                      {u.isActive
                        ? <span className="ef-chip ef-chip-success">Active</span>
                        : <span className="ef-chip ef-chip-danger">Disabled</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="ghost" onClick={() => toggleActive(u)}>
                        {u.isActive ? <><UserX className="h-4 w-4" /> Disable</> : <><UserCheck className="h-4 w-4" /> Enable</>}
                      </Button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-[var(--color-text-muted)]">No users.</td></tr>
                )}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
