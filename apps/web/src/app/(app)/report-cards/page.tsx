'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { TopBar } from '@/components/layout/TopBar';
import { Select } from '@/components/ui/Input';
import { api, session } from '@/lib/api';
import { FileText } from 'lucide-react';

type ClassRow = { id: string; grade: number; label: string; sections: { id: string; name: string }[] };
type StudentRow = { id: string; name: string; rollNumber: string | null };

export default function ReportCardsListPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<ClassRow[]>('/classes', { token: session.token(), subdomain: session.subdomain() })
      .then((c) => {
        setClasses(c);
        const first = c.flatMap((cc) => cc.sections)[0];
        if (first) setSectionId(first.id);
      })
      .catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    if (!sectionId) return;
    api<StudentRow[]>(`/sections/${sectionId}/students`, {
      token: session.token(),
      subdomain: session.subdomain(),
    }).then(setStudents).catch((e) => setErr(e.message));
  }, [sectionId]);

  return (
    <>
      <TopBar title="Report cards" />
      <div className="flex-1 p-6 space-y-5 max-w-5xl">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        <Card>
          <CardBody className="flex items-end gap-3">
            <div className="w-72">
              <Select label="Section" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                {classes.flatMap((c) => c.sections.map((s) => (
                  <option key={s.id} value={s.id}>{c.label} — Section {s.name}</option>
                )))}
              </Select>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Students" subtitle="Open a report card to print or share." />
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[var(--color-border)] text-[var(--color-text-subtle)] text-xs uppercase tracking-wider">
                  <th className="px-5 py-3 w-16">Roll</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3 text-right">Report card</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]/60">
                    <td className="px-5 py-3 text-[var(--color-text-muted)] tabular-nums">{s.rollNumber || '—'}</td>
                    <td className="px-5 py-3 font-medium">{s.name}</td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/report-cards/${s.id}`} className="ef-btn ef-btn-ghost text-sm">
                        <FileText className="h-4 w-4" /> Open
                      </Link>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-10 text-center text-[var(--color-text-muted)]">No students.</td></tr>
                )}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
