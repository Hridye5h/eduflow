'use client';
import { User as UserIcon, Mail, Phone, Users as ParentIcon, GraduationCap, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { session } from '@/lib/api';
import { useChildren } from '@/lib/use-children';

const ACCENT = '#0d9488';

export default function ParentProfilePage() {
  const me = session.user();
  const { children } = useChildren();

  return (
    <>
      <TopBar title="My profile" eyebrow="Parent portal" />
      <div className="flex-1 p-6 space-y-5 max-w-3xl">
        <Card className="overflow-hidden">
          <div className="relative p-6">
            <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
              style={{ background: `radial-gradient(circle at 100% 100%, ${ACCENT} 0%, transparent 60%)` }} />
            <div className="relative flex items-center gap-5">
              <div
                className="h-20 w-20 rounded-2xl grid place-items-center text-3xl font-bold"
                style={{
                  background: `linear-gradient(135deg, ${ACCENT} 0%, #06b6d4 100%)`,
                  color: '#fff',
                  boxShadow: `0 8px 24px ${ACCENT}40`,
                }}
              >
                {(me?.name || '?').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="ef-chip ef-role-parent mb-1.5">
                  <ParentIcon className="h-3 w-3" /> Parent
                </div>
                <h2 className="text-2xl font-bold tracking-tight">{me?.name}</h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{me?.email}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card variant="solid">
          <CardHeader eyebrow="Account" title="Your details" />
          <CardBody>
            <dl className="grid sm:grid-cols-2 gap-5">
              <Field icon={<UserIcon className="h-4 w-4" />} label="Full name" value={me?.name} />
              <Field icon={<Mail className="h-4 w-4" />} label="Email" value={me?.email} />
              <Field icon={<Phone className="h-4 w-4" />} label="Phone" value={me?.phone || 'Not set'} />
            </dl>
          </CardBody>
        </Card>

        <Card variant="solid">
          <CardHeader
            eyebrow="Linked children"
            title={`${children.length} child${children.length === 1 ? '' : 'ren'} on your account`}
            subtitle="Your view in this portal is filtered to each linked child. Ask the principal to link more if needed."
          />
          <CardBody className="p-0">
            {children.length === 0 ? (
              <div className="p-8 text-center text-[var(--color-text-muted)]">
                No children linked yet.
              </div>
            ) : (
              <ul>
                {children.map((c) => {
                  const s = c.student;
                  const sectionLabel = s.section ? `${s.section.class.label} · Section ${s.section.name}` : '—';
                  return (
                    <li key={s.id} className="px-5 py-4 border-b last:border-0 border-[var(--color-border)] flex items-center gap-3">
                      <div
                        className="h-11 w-11 rounded-xl grid place-items-center text-white font-bold shrink-0"
                        style={{ background: `linear-gradient(135deg, ${ACCENT}, #06b6d4)` }}
                      >
                        {s.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 mt-0.5">
                          <GraduationCap className="h-3 w-3" /> {sectionLabel} · Roll {s.rollNumber || '—'}
                        </div>
                      </div>
                      {c.relation && <span className="ef-chip">{c.relation}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card variant="solid">
          <CardBody className="flex items-start gap-3 text-sm">
            <span className="h-9 w-9 rounded-lg grid place-items-center shrink-0" style={{ background: `${ACCENT}10`, color: ACCENT }}>
              <UserIcon className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <h3 className="font-semibold">Password & contact updates</h3>
              <p className="text-[var(--color-text-muted)] mt-1">
                Reach out to the school office to update your password or contact info. Self-serve account updates are coming soon.
              </p>
            </div>
            <Link href="/parent/chat" className="ef-btn ef-btn-outline text-sm self-center">
              Message <ArrowRight className="h-4 w-4" />
            </Link>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Field({
  icon, label, value,
}: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <div className="flex items-start gap-3">
      <span className="h-8 w-8 rounded-lg grid place-items-center shrink-0 mt-0.5" style={{ background: `${ACCENT}10`, color: ACCENT }}>
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="ef-eyebrow">{label}</dt>
        <dd className="mt-1 font-medium text-[var(--color-text)] truncate">{value || '—'}</dd>
      </div>
    </div>
  );
}
