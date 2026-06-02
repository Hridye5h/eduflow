'use client';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, UserCheck, UserX, ShieldAlert, Shield, GraduationCap, Users as ParentIcon } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody, CardHeader, Stat } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { api, session } from '@/lib/api';

const ACCENT = '#dc2626';

type User = {
  id: string;
  role: 'SUPER_ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
  name: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  rollNumber: string | null;
  sectionId: string | null;
};

const ROLE_META = {
  SUPER_ADMIN: { label: 'Admins',   icon: ShieldAlert,  chip: 'ef-role-admin'   },
  TEACHER:     { label: 'Teachers', icon: Shield,       chip: 'ef-role-teacher' },
  STUDENT:     { label: 'Students', icon: GraduationCap, chip: 'ef-role-student' },
  PARENT:      { label: 'Parents',  icon: ParentIcon,   chip: 'ef-role-parent'  },
} as const;

export default function PrincipalUsersPage() {
  const [role, setRole] = useState<User['role']>('TEACHER');
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const [draft, setDraft] = useState({
    role: 'TEACHER', name: '', email: '', phone: '', password: '',
    sectionId: '', rollNumber: '',
  });
  const [busy, setBusy] = useState(false);

  async function loadCounts() {
    const all = await Promise.all([
      api<User[]>('/admin/users?role=SUPER_ADMIN', { token: session.token(), subdomain: session.subdomain() }),
      api<User[]>('/admin/users?role=TEACHER',     { token: session.token(), subdomain: session.subdomain() }),
      api<User[]>('/admin/users?role=STUDENT',     { token: session.token(), subdomain: session.subdomain() }),
      api<User[]>('/admin/users?role=PARENT',      { token: session.token(), subdomain: session.subdomain() }),
    ]);
    setCounts({
      SUPER_ADMIN: all[0].length,
      TEACHER:     all[1].length,
      STUDENT:     all[2].length,
      PARENT:      all[3].length,
    });
  }

  async function loadList() {
    try {
      const q = new URLSearchParams({ role, ...(search && { search }) });
      const r = await api<User[]>(`/admin/users?${q}`, { token: session.token(), subdomain: session.subdomain() });
      setUsers(r);
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { loadList(); }, [role]);
  useEffect(() => {
    loadCounts();
    api('/classes', { token: session.token(), subdomain: session.subdomain() })
      .then((c: any) => setClasses(c)).catch(() => {});
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
      setShowAdd(false);
      setDraft({ ...draft, name: '', email: '', phone: '', password: '', rollNumber: '' });
      setRole(draft.role as any);
      await Promise.all([loadList(), loadCounts()]);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function toggleActive(u: User) {
    await api(`/admin/users/${u.id}/active`, {
      method: 'PATCH',
      token: session.token(), subdomain: session.subdomain(),
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    await loadList();
  }

  return (
    <>
      <TopBar title="Users" eyebrow="Principal portal" />
      <div className="flex-1 p-6 space-y-5 max-w-7xl">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        {/* Role counter cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.keys(ROLE_META) as Array<keyof typeof ROLE_META>).map((r) => {
            const meta = ROLE_META[r];
            const Icon = meta.icon;
            const selected = r === role;
            return (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`ef-card p-5 text-left transition-all ${selected ? '' : 'opacity-80 hover:opacity-100'}`}
                style={selected ? {
                  borderColor: ACCENT,
                  boxShadow: `0 8px 24px ${ACCENT}1c`,
                } : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="ef-eyebrow">{meta.label}</div>
                  <span
                    className="h-8 w-8 rounded-lg grid place-items-center"
                    style={{ background: `${ACCENT}10`, color: ACCENT }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <div className="mt-3 text-3xl font-bold tabular-nums tracking-tight">
                  {counts[r] ?? '—'}
                </div>
              </button>
            );
          })}
        </section>

        {/* Add user form */}
        {showAdd && (
          <Card variant="solid">
            <CardHeader title="Add user" subtitle="Create a teacher, student, parent, or another admin." />
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
                <Input label="Password" type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} hint="Optional for parents (OTP)" />
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
                <div className="sm:col-span-4 flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
                  <Button type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add user'}</Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )}

        {/* User table */}
        <Card variant="solid">
          <CardHeader
            eyebrow={ROLE_META[role].label}
            title={`${users.length} ${ROLE_META[role].label.toLowerCase()}`}
            right={
              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-surface-muted)] text-sm w-64">
                  <Search className="h-4 w-4 text-[var(--color-text-muted)]" />
                  <input
                    placeholder="Search name, email…"
                    className="bg-transparent outline-none flex-1"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadList()}
                  />
                </div>
                <Button onClick={() => { setDraft({ ...draft, role }); setShowAdd((v) => !v); }}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
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
