'use client';
import { useEffect, useState } from 'react';
import { User as UserIcon, Mail, Phone, GraduationCap, Building2, Users as ParentIcon } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api, session } from '@/lib/api';

const ACCENT = '#2563eb';

export default function StudentProfilePage() {
  const me = session.user();
  const [report, setReport] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  // Re-use the report-card endpoint to also surface the section + class info
  useEffect(() => {
    if (!me) return;
    api(`/students/${me.id}/report-card`, {
      token: session.token(), subdomain: session.subdomain(),
    }).then(setReport).catch((e) => setErr(e.message));
  }, [me?.id]);

  const sectionLabel = report?.student?.section
    ? `${report.student.section.class?.label} · Section ${report.student.section.name}`
    : '—';

  return (
    <>
      <TopBar title="My profile" eyebrow="Student portal" />
      <div className="flex-1 p-6 space-y-5 max-w-3xl">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        {/* Profile hero */}
        <Card className="overflow-hidden">
          <div className="relative p-6">
            <div
              className="absolute inset-0 opacity-[0.06] pointer-events-none"
              style={{ background: `radial-gradient(circle at 100% 100%, ${ACCENT} 0%, transparent 60%)` }}
            />
            <div className="relative flex items-center gap-5">
              <div
                className="h-20 w-20 rounded-2xl grid place-items-center text-3xl font-bold"
                style={{
                  background: `linear-gradient(135deg, ${ACCENT} 0%, #14b8a6 100%)`,
                  color: '#fff',
                  boxShadow: `0 8px 24px ${ACCENT}40`,
                }}
              >
                {(me?.name || '?').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="ef-chip ef-role-student mb-1.5">
                  <GraduationCap className="h-3 w-3" /> Student
                </div>
                <h2 className="text-2xl font-bold tracking-tight">{me?.name}</h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{sectionLabel}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Details */}
        <Card variant="solid">
          <CardHeader eyebrow="Account" title="Your details" />
          <CardBody>
            <dl className="grid sm:grid-cols-2 gap-5">
              <Field icon={<UserIcon className="h-4 w-4" />} label="Full name" value={me?.name} />
              <Field icon={<GraduationCap className="h-4 w-4" />} label="Roll number" value={me?.rollNumber || '—'} mono />
              <Field icon={<Mail className="h-4 w-4" />} label="Email" value={me?.email} />
              <Field icon={<Phone className="h-4 w-4" />} label="Phone" value={me?.phone || 'Not set'} />
              <Field icon={<Building2 className="h-4 w-4" />} label="Section" value={sectionLabel} />
            </dl>
          </CardBody>
        </Card>

        {/* Password note */}
        <Card variant="solid">
          <CardBody className="flex items-start gap-3 text-sm">
            <span className="h-9 w-9 rounded-lg grid place-items-center shrink-0" style={{ background: `${ACCENT}10`, color: ACCENT }}>
              <UserIcon className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-semibold">Need to change your password?</h3>
              <p className="text-[var(--color-text-muted)] mt-1">
                Ask your class teacher or the principal — they can reset it from the Users page.
                Self-service password change is coming soon.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Field({
  icon, label, value, mono,
}: { icon: React.ReactNode; label: string; value: any; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="h-8 w-8 rounded-lg grid place-items-center shrink-0 mt-0.5" style={{ background: `${ACCENT}10`, color: ACCENT }}>
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="ef-eyebrow">{label}</dt>
        <dd className={`mt-1 font-medium text-[var(--color-text)] truncate ${mono ? 'font-mono tabular-nums' : ''}`}>
          {value || '—'}
        </dd>
      </div>
    </div>
  );
}
