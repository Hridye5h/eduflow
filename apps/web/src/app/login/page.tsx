import Link from 'next/link';
import type { Metadata } from 'next';
import { ShieldAlert, Shield, GraduationCap, Users, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sign in — EduFlow',
  description: 'Choose your portal — Principal, Teacher, Student, or Parent.',
};

const PORTALS = [
  {
    href: '/login/principal',
    eyebrow: 'For administrators',
    title: 'Principal',
    tagline: 'Manage teachers, classes, fees, and the school as a whole.',
    icon: ShieldAlert,
    accent: '#dc2626',
    chipClass: 'ef-role-admin',
  },
  {
    href: '/login/teacher',
    eyebrow: 'For staff',
    title: 'Teacher',
    tagline: 'Mark attendance, enter marks, post to your class wall.',
    icon: Shield,
    accent: '#d97706',
    chipClass: 'ef-role-teacher',
  },
  {
    href: '/login/student',
    eyebrow: 'For learners',
    title: 'Student',
    tagline: 'Check your attendance, marks, homework, and timetable.',
    icon: GraduationCap,
    accent: '#2563eb',
    chipClass: 'ef-role-student',
  },
  {
    href: '/login/parent',
    eyebrow: 'For families',
    title: 'Parent',
    tagline: 'Stay updated on your child’s progress and school news.',
    icon: Users,
    accent: '#0d9488',
    chipClass: 'ef-role-parent',
  },
];

export default function LoginChooser() {
  return (
    <main className="min-h-screen grid place-items-center px-4 py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgba(79,70,229,0.22), transparent)' }} />
      <div className="pointer-events-none absolute -bottom-32 -left-24 w-[26rem] h-[26rem] rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgba(20,184,166,0.20), transparent)' }} />

      <div className="w-full max-w-3xl relative z-10">
        <Link
          href="/"
          className="flex items-center gap-2.5 justify-center mb-8 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <div
            className="h-9 w-9 rounded-xl grid place-items-center text-white font-bold"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #14b8a6 100%)',
              boxShadow: '0 6px 20px rgba(79,70,229,0.35)',
            }}
          >E</div>
          <span className="font-bold tracking-tight text-[var(--color-text)]">EduFlow</span>
        </Link>

        <div className="text-center mb-8">
          <div className="ef-eyebrow mb-2">Sign in</div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-text)]">
            Pick your portal
          </h1>
          <p className="mt-2 text-[var(--color-text-muted)] max-w-lg mx-auto">
            Each portal shows what you need most. You can switch from any login page.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {PORTALS.map(({ href, eyebrow, title, tagline, icon: Icon, accent, chipClass }) => (
            <Link
              key={href}
              href={href}
              className="ef-card p-5 group hover:border-[var(--color-brand)]/40 transition-all"
            >
              <div className="flex items-start gap-4">
                <div
                  className="h-12 w-12 rounded-xl grid place-items-center shrink-0"
                  style={{
                    background: `${accent}14`,
                    boxShadow: `0 0 24px ${accent}22`,
                  }}
                >
                  <Icon className="h-5 w-5" style={{ color: accent }} strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`ef-chip ${chipClass} mb-1.5`}>{eyebrow}</div>
                  <h2 className="font-semibold text-[var(--color-text)]">{title}</h2>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1 leading-snug">{tagline}</p>
                </div>
                <ArrowRight
                  className="h-4 w-4 mt-3 text-[var(--color-text-subtle)] group-hover:text-[var(--color-brand)] group-hover:translate-x-0.5 transition-all"
                />
              </div>
            </Link>
          ))}
        </div>

        <p className="text-center mt-8 text-sm text-[var(--color-text-muted)]">
          New school?{' '}
          <Link href="/register" className="text-[var(--color-brand)] font-semibold hover:underline">
            Register your school
          </Link>
        </p>
      </div>
    </main>
  );
}
