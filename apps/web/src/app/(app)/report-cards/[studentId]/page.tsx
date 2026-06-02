'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardBody, CardHeader, Stat } from '@/components/ui/Card';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { api, session } from '@/lib/api';
import { Printer } from 'lucide-react';

type Report = {
  student: { id: string; name: string; rollNumber: string | null; section: any };
  exams: Array<{
    exam: { id: string; name: string; type: string; date: string | null; maxMarks: number };
    rows: Array<{ subject: string; marks: number; max: number; grade: string | null; remarks: string | null }>;
    total: number;
    max: number;
    percentage: number;
  }>;
  cumulative: { total: number; max: number; percentage: number } | null;
};

export default function ReportCardPage() {
  const params = useParams<{ studentId: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<Report>(`/students/${params.studentId}/report-card`, {
      token: session.token(),
      subdomain: session.subdomain(),
    }).then(setReport).catch((e) => setErr(e.message));
  }, [params.studentId]);

  if (!report) {
    return <><TopBar title="Report card" /><div className="p-6 text-sm text-[var(--color-text-muted)]">{err ?? 'Loading…'}</div></>;
  }

  return (
    <>
      <TopBar title="Report card" />
      <div className="flex-1 p-6 space-y-5 max-w-4xl print:max-w-none">
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h2 className="text-xl font-semibold">{report.student.name}</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              {report.student.section?.class?.label} · Section {report.student.section?.name} · Roll {report.student.rollNumber || '—'}
            </p>
          </div>
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print / Save PDF</Button>
        </div>

        <Card className="print:shadow-none print:border-0">
          <CardBody className="p-8">
            <header className="border-b border-[var(--color-border)] pb-4 mb-5">
              <h1 className="text-2xl font-bold">{report.student.name}</h1>
              <div className="mt-1 text-sm text-[var(--color-text-muted)]">
                {report.student.section?.class?.label} · Section {report.student.section?.name} · Roll {report.student.rollNumber || '—'}
              </div>
            </header>

            {report.cumulative && (
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                <Stat label="Cumulative total" value={`${report.cumulative.total} / ${report.cumulative.max}`} />
                <Stat label="Cumulative %" value={`${report.cumulative.percentage}%`} tone={report.cumulative.percentage >= 60 ? 'success' : 'warn'} />
                <Stat label="Exams considered" value={report.exams.length} />
              </div>
            )}

            {report.exams.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">No published marks yet.</p>
            ) : (
              <div className="space-y-6">
                {report.exams.map((e) => (
                  <section key={e.exam.id}>
                    <div className="flex items-baseline justify-between mb-2">
                      <h3 className="font-semibold">
                        {e.exam.name}{' '}
                        <span className="text-sm text-[var(--color-text-muted)] font-normal">
                          · {e.exam.type.replace('_', ' ')}
                          {e.exam.date ? ` · ${new Date(e.exam.date).toLocaleDateString()}` : ''}
                        </span>
                      </h3>
                      <div className="text-sm">
                        <strong>{e.total} / {e.max}</strong>{' '}
                        <span className="text-[var(--color-text-muted)]">({e.percentage}%)</span>
                      </div>
                    </div>
                    <table className="w-full text-sm border border-[var(--color-border)] rounded-lg overflow-hidden">
                      <thead className="bg-[var(--color-surface-muted)]">
                        <tr>
                          <th className="px-4 py-2 text-left">Subject</th>
                          <th className="px-4 py-2 text-right">Marks</th>
                          <th className="px-4 py-2 text-right">Max</th>
                          <th className="px-4 py-2 text-center">Grade</th>
                          <th className="px-4 py-2 text-left">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {e.rows.map((r, i) => (
                          <tr key={i} className="border-t border-[var(--color-border)]">
                            <td className="px-4 py-2">{r.subject}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{r.marks}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-[var(--color-text-muted)]">{r.max}</td>
                            <td className="px-4 py-2 text-center"><span className="ef-chip">{r.grade || '—'}</span></td>
                            <td className="px-4 py-2 text-[var(--color-text-muted)]">{r.remarks || ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                ))}
              </div>
            )}

            <footer className="mt-8 pt-4 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)] flex justify-between">
              <span>Generated on {new Date().toLocaleString()}</span>
              <span>EduFlow · {report.student.section?.class?.label}</span>
            </footer>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
