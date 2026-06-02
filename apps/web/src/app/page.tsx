'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Shield,
  BookOpenCheck,
  MessagesSquare,
  BarChart3,
  ShieldAlert,
  GraduationCap,
  Users,
  CalendarCheck,
  Sparkles,
  Wallet,
  FileText,
  Check,
} from 'lucide-react';

const FEATURES = [
  { icon: CalendarCheck,  title: 'Attendance',     body: 'Daily roll-call · monthly calendar · auto-notify parents on absence.' },
  { icon: BookOpenCheck,  title: 'Marks & cards',  body: 'Per-subject exam entry · published report cards · print-to-PDF.' },
  { icon: MessagesSquare, title: 'Class wall + chat', body: 'Homework, notices, events. Real-time chat between teachers and class groups.' },
  { icon: BarChart3,      title: 'Reports',        body: 'Trend charts, at-risk flags, teacher-activity leaderboard.' },
  { icon: Wallet,         title: 'Fees',           body: 'Fee structures, payment tracking, parent-side outstanding view.' },
  { icon: FileText,       title: 'Timetable',      body: 'Weekly grid editor with cross-section conflict detection.' },
];

const PORTALS = [
  { href: '/login/principal', label: 'Principal', icon: ShieldAlert,    accent: '#dc2626', chipClass: 'ef-role-admin'   },
  { href: '/login/teacher',   label: 'Teacher',   icon: Shield,         accent: '#d97706', chipClass: 'ef-role-teacher' },
  { href: '/login/student',   label: 'Student',   icon: GraduationCap,  accent: '#2563eb', chipClass: 'ef-role-student' },
  { href: '/login/parent',    label: 'Parent',    icon: Users,          accent: '#0d9488', chipClass: 'ef-role-parent'  },
];

const ROLE_ROTATOR = [
  { word: 'principals', color: '#dc2626' },
  { word: 'teachers',   color: '#d97706' },
  { word: 'students',   color: '#2563eb' },
  { word: 'parents',    color: '#0d9488' },
];

const STATS = [
  { label: 'Boards supported', value: '5',  hint: 'CBSE · ICSE · IB · State · Other' },
  { label: 'Modules built-in', value: '12', hint: 'Attendance through fees' },
  { label: 'Real-time',        value: '✓',  hint: 'Socket.IO chat + notifications' },
  { label: 'Multi-tenant',     value: '∞',  hint: 'Every school its own portal' },
];

export default function Landing() {
  const [roleIdx, setRoleIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setRoleIdx((i) => (i + 1) % ROLE_ROTATOR.length), 2200);
    return () => clearInterval(t);
  }, []);
  const role = ROLE_ROTATOR[roleIdx];

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Decorative orbs (pulsing) */}
      <div
        className="pointer-events-none absolute -top-32 -right-24 w-[34rem] h-[34rem] rounded-full pulse-soft"
        style={{ background: 'radial-gradient(closest-side, rgba(79,70,229,0.25), transparent)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 w-[30rem] h-[30rem] rounded-full pulse-soft"
        style={{ background: 'radial-gradient(closest-side, rgba(20,184,166,0.22), transparent)', animationDelay: '3s' }}
      />
      <div
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[20rem] h-[20rem] rounded-full pulse-soft"
        style={{ background: 'radial-gradient(closest-side, rgba(217,119,6,0.10), transparent)', animationDelay: '5s' }}
      />

      <header className="relative z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="h-9 w-9 rounded-xl grid place-items-center text-white font-bold"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #14b8a6 100%)',
                boxShadow: '0 6px 20px rgba(79,70,229,0.35)',
              }}
            >E</div>
            <span className="font-bold tracking-tight">EduFlow</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="ef-btn ef-btn-ghost">Sign in</Link>
            <Link href="/register" className="ef-btn ef-btn-primary">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-12 sm:pt-16 sm:pb-16">
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-12 items-center">
          <div>
            <div className="ef-chip ef-chip-brand mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-current pulse-soft" />
              School management, simplified
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-[var(--color-text)]">
              Run your school from{' '}
              <span style={{
                background: 'linear-gradient(90deg, #4f46e5, #14b8a6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>one calm hub.</span>
            </h1>

            <p className="mt-5 text-lg sm:text-xl text-[var(--color-text-muted)] leading-relaxed">
              Made for{' '}
              <span
                key={role.word}
                className="rotate-word font-semibold"
                style={{ color: role.color }}
              >
                {role.word}
              </span>
              {' '}— attendance, marks, timetable, fees, and a class wall that actually gets used.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="ef-btn ef-btn-primary">
                Create your school <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className="ef-btn ef-btn-outline">Sign in</Link>
            </div>
            <p className="mt-3 ef-eyebrow">No credit card · CBSE / ICSE / State board ready</p>

            <div className="mt-10">
              <div className="ef-eyebrow mb-3">Sign in by role</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PORTALS.map(({ href, label, icon: Icon, accent, chipClass }) => (
                  <Link
                    key={href}
                    href={href}
                    className="ef-card flex flex-col items-center gap-1.5 py-3 group hover:border-[var(--color-brand)]/40 transition-all"
                  >
                    <span
                      className="h-9 w-9 rounded-xl grid place-items-center transition-transform group-hover:scale-110"
                      style={{ background: `${accent}14`, boxShadow: `0 0 18px ${accent}22` }}
                    >
                      <Icon className="h-4 w-4" style={{ color: accent }} strokeWidth={2.2} />
                    </span>
                    <span className={`ef-chip ${chipClass}`}>{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Floating mock-dashboard preview */}
          <div className="relative">
            <div className="float-soft">
              <PreviewCard role={role} />
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        <div className="ef-card-strong grid grid-cols-2 sm:grid-cols-4 divide-x divide-[var(--color-border)] overflow-hidden">
          {STATS.map((s) => (
            <div key={s.label} className="p-5 text-center">
              <div className="ef-eyebrow">{s.label}</div>
              <div className="text-3xl font-bold tabular-nums tracking-tight mt-1.5">{s.value}</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-1">{s.hint}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <div className="ef-eyebrow inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> What's inside
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-text)] mt-2">
            Everything a school needs — already wired.
          </h2>
          <p className="text-[var(--color-text-muted)] mt-3 max-w-2xl mx-auto">
            Pilot-ready out of the box. Demo data, real-time chat, and printable report cards in
            under five minutes.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="ef-card p-5 group">
              <div className="flex items-start gap-3">
                <span
                  className="h-10 w-10 rounded-xl grid place-items-center shrink-0 transition-transform group-hover:scale-110"
                  style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold tracking-tight">{title}</h3>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1.5 leading-snug">{body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-20 text-center">
        <div className="ef-card-strong p-10 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 100% 0%, #4f46e5 0%, transparent 50%), ' +
                'radial-gradient(circle at 0% 100%, #14b8a6 0%, transparent 50%)',
            }}
          />
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Try it with demo data in under a minute.
            </h2>
            <p className="text-[var(--color-text-muted)] mt-3 max-w-xl mx-auto">
              Sign in with the seed Principal account and click through the entire flow — students,
              teachers, parents are pre-populated.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/login/principal" className="ef-btn ef-btn-primary">
                <ShieldAlert className="h-4 w-4" /> Sign in as Principal
              </Link>
              <Link href="/register" className="ef-btn ef-btn-outline">
                Create your own school
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function PreviewCard({ role }: { role: { word: string; color: string } }) {
  return (
    <div className="ef-card-strong p-5 relative overflow-hidden" style={{ boxShadow: '0 24px 60px rgba(15,23,42,0.12)' }}>
      <div className="absolute -top-px left-8 right-8 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${role.color}88, transparent)` }} />

      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="h-8 w-8 rounded-lg grid place-items-center text-white font-bold text-sm"
          style={{ background: `linear-gradient(135deg, ${role.color}, #14b8a6)` }}
        >
          E
        </div>
        <div>
          <div className="ef-eyebrow capitalize">{role.word}'s dashboard</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Attendance', value: '94%' },
          { label: 'Today',      value: '6'   },
          { label: 'Pending',    value: '2'   },
        ].map((s) => (
          <div key={s.label} className="p-2.5 rounded-lg bg-[var(--color-surface-muted)]">
            <div className="ef-eyebrow text-[9px]">{s.label}</div>
            <div className="text-lg font-bold tabular-nums mt-0.5">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        {[
          { p: 'P1', t: '09:00', subj: 'Mathematics' },
          { p: 'P2', t: '09:45', subj: 'English'     },
          { p: 'P3', t: '10:45', subj: 'Physics'     },
        ].map((row, i) => (
          <div key={i} className="flex items-center gap-2.5 p-2 rounded-md hover:bg-[var(--color-surface-muted)]">
            <div
              className="h-7 w-7 rounded-md grid place-items-center text-xs font-bold tabular-nums"
              style={{ background: `${role.color}14`, color: role.color }}
            >
              {row.p}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{row.subj}</div>
              <div className="text-[10px] text-[var(--color-text-muted)] tabular-nums">{row.t}</div>
            </div>
            <Check className="h-3.5 w-3.5 text-[var(--color-success)]" />
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
        <Sparkles className="h-3 w-3" style={{ color: role.color }} />
        Live data on a real Vercel deploy
      </div>
    </div>
  );
}
