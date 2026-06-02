'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ShieldAlert, Shield, GraduationCap, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, session } from '@/lib/api';
import { portalForRole } from '@/lib/role-config';

export type LoginRole = 'principal' | 'teacher' | 'student' | 'parent';
type Mode = 'password' | 'otp';

const ROLE_META: Record<LoginRole, {
  eyebrow: string;
  title: string;
  tagline: string;
  icon: any;
  accentColor: string;     // hex for the role-coded brand mark
  chipClass: string;       // ef-role-* utility
  defaultMode: Mode;
}> = {
  principal: {
    eyebrow: 'Administrator portal',
    title: 'Welcome back, Principal',
    tagline: 'Manage teachers, classes, fees, and run school-wide announcements.',
    icon: ShieldAlert,
    accentColor: '#dc2626',
    chipClass: 'ef-role-admin',
    defaultMode: 'password',
  },
  teacher: {
    eyebrow: 'Teacher portal',
    title: 'Welcome, Teacher',
    tagline: 'Mark attendance, enter marks, post homework, and chat with your class.',
    icon: Shield,
    accentColor: '#d97706',
    chipClass: 'ef-role-teacher',
    defaultMode: 'password',
  },
  student: {
    eyebrow: 'Student portal',
    title: 'Welcome to your portal',
    tagline: 'Check your attendance, report card, homework, and class wall.',
    icon: GraduationCap,
    accentColor: '#2563eb',
    chipClass: 'ef-role-student',
    defaultMode: 'password',
  },
  parent: {
    eyebrow: 'Parent portal',
    title: 'Welcome, Parent',
    tagline: 'Track your child’s attendance, marks, and school updates.',
    icon: Users,
    accentColor: '#0d9488',
    chipClass: 'ef-role-parent',
    defaultMode: 'otp',
  },
};

const OTHER_PORTALS: Record<LoginRole, Array<{ role: LoginRole; label: string }>> = {
  principal: [
    { role: 'teacher',  label: 'Teacher' },
    { role: 'student',  label: 'Student' },
    { role: 'parent',   label: 'Parent' },
  ],
  teacher: [
    { role: 'principal', label: 'Principal' },
    { role: 'student',   label: 'Student' },
    { role: 'parent',    label: 'Parent' },
  ],
  student: [
    { role: 'principal', label: 'Principal' },
    { role: 'teacher',   label: 'Teacher' },
    { role: 'parent',    label: 'Parent' },
  ],
  parent: [
    { role: 'principal', label: 'Principal' },
    { role: 'teacher',   label: 'Teacher' },
    { role: 'student',   label: 'Student' },
  ],
};

export function LoginForm({ role }: { role: LoginRole }) {
  const meta = ROLE_META[role];
  const RoleIcon = meta.icon;
  const router = useRouter();

  const [mode, setMode] = useState<Mode>(meta.defaultMode);
  const [subdomain, setSubdomain] = useState('springfield');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      let user: any;
      if (mode === 'password') {
        const res = await api<{ accessToken: string; user: any }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ subdomain, email: identifier, password }),
        });
        session.set(res.accessToken, res.user, subdomain);
        user = res.user;
      } else if (!otpRequested) {
        await api('/auth/otp/request', {
          method: 'POST',
          body: JSON.stringify({ subdomain, identifier }),
        });
        setOtpRequested(true);
        setBusy(false);
        return;
      } else {
        const res = await api<{ accessToken: string; user: any }>('/auth/otp/verify', {
          method: 'POST',
          body: JSON.stringify({ subdomain, identifier, code }),
        });
        session.set(res.accessToken, res.user, subdomain);
        user = res.user;
      }
      // Route to the user's actual portal — regardless of which login page
      // they came through. A student who lands on /login/principal still
      // ends up at /student/dashboard after authenticating.
      const portal = portalForRole(user?.role);
      router.push(portal.defaultRoute);
    } catch (e: any) {
      setErr(e.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center px-4 py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full"
        style={{ background: `radial-gradient(closest-side, ${meta.accentColor}33, transparent)` }} />
      <div className="pointer-events-none absolute -bottom-32 -left-24 w-[26rem] h-[26rem] rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgba(20,184,166,0.20), transparent)' }} />

      <div className="w-full max-w-md relative z-10">
        <Link
          href="/"
          className="flex items-center gap-2.5 justify-center mb-7 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <div
            className="h-9 w-9 rounded-xl grid place-items-center text-white font-bold"
            style={{
              background: `linear-gradient(135deg, ${meta.accentColor} 0%, #14b8a6 100%)`,
              boxShadow: `0 6px 20px ${meta.accentColor}55`,
            }}
          >E</div>
          <span className="font-bold tracking-tight text-[var(--color-text)]">EduFlow</span>
        </Link>

        <Card variant="solid" className="p-7">
          <div className="flex items-center gap-2 mb-2">
            <span className={`ef-chip ${meta.chipClass}`}>
              <RoleIcon className="h-3 w-3" /> {meta.eyebrow}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">{meta.title}</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{meta.tagline}</p>

          <div className="flex gap-1 p-1 mt-5 mb-5 bg-[var(--color-surface-muted)] rounded-xl text-sm">
            <button
              type="button"
              onClick={() => { setMode('password'); setOtpRequested(false); setErr(null); }}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                mode === 'password' ? 'bg-white shadow-sm text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'
              }`}
            >
              Email + Password
            </button>
            <button
              type="button"
              onClick={() => { setMode('otp'); setErr(null); }}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                mode === 'otp' ? 'bg-white shadow-sm text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'
              }`}
            >
              Email OTP
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Input
              label="School subdomain"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              placeholder="springfield"
              required
              hint="The part before .eduflow.app"
            />
            <Input
              label={mode === 'password' ? 'Email' : 'Email or phone'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={role === 'student' ? 's.<rollno>@…' : role === 'parent' ? 'p.<rollno>@…' : 'you@school.edu'}
              required
            />
            {mode === 'password' ? (
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            ) : otpRequested ? (
              <Input
                label="6-digit code"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                hint="Check your email"
              />
            ) : null}

            {err && (
              <div className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/8 border border-[var(--color-danger)]/15 rounded-xl px-3 py-2">
                {err}
              </div>
            )}

            <Button type="submit" disabled={busy} className="w-full">
              {busy
                ? 'Working…'
                : mode === 'password'
                ? <>Sign in <ArrowRight className="h-4 w-4" /></>
                : otpRequested
                ? <>Verify code <ArrowRight className="h-4 w-4" /></>
                : <>Send OTP <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>

          {role === 'principal' && (
            <div className="mt-6 pt-5 border-t border-[var(--color-border)] text-center">
              <p className="text-sm text-[var(--color-text-muted)]">
                New school?{' '}
                <Link href="/register" className="text-[var(--color-brand)] font-semibold hover:underline">
                  Register
                </Link>
              </p>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-[var(--color-border)]">
            <p className="ef-eyebrow text-center mb-2">Looking for a different portal?</p>
            <div className="flex flex-wrap justify-center gap-2">
              {OTHER_PORTALS[role].map((o) => (
                <Link
                  key={o.role}
                  href={`/login/${o.role}`}
                  className="ef-btn ef-btn-ghost text-xs py-1.5 px-3"
                >
                  {o.label}
                </Link>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
