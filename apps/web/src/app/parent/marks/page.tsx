'use client';
import { useEffect, useState } from 'react';
import { Printer, Download } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, session } from '@/lib/api';
import { useChildren } from '@/lib/use-children';
import { ChildHeader } from '@/components/parent/ChildHeader';
import { downloadCsv } from '@/lib/export';
import { SubjectTrends } from '@/components/charts/SubjectTrends';

const ACCENT = '#0d9488';

type Report = {
  student: { id: string; name: string; rollNumber: string | null; section: any };
  exams: Array<{
    exam: { id: string; name: string; type: string; date: string | null; maxMarks: number };
    rows: Array<{ subject: string; marks: number; max: number; grade: string | null; remarks: string | null }>;
    total: number; max: number; percentage: number;
  }>;
  cumulative: { total: number; max: number; percentage: number } | null;
};

export default function ParentReportCardPage() {
  const { children, activeChild, activeChildId, setActiveChildId } = useChildren();
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    if (!activeChildId) return;
    api<Report>(`/students/${activeChildId}/report-card`, {
      token: session.token(), subdomain: session.subdomain(),
    }).then(setReport).catch(() => setReport(null));
  }, [activeChildId]);

  return (
    <>
      <TopBar title="Report card" eyebrow="Parent portal" />
      <div className="flex-1 p-6 space-y-5 max-w-4xl print:max-w-none">
        <div className="print:hidden">
          <ChildHeader children={children} active={activeChild} onSwitch={setActiveChildId} />
        </div>

        {!activeChild ? null : !report ? (
          <Card variant="solid" className="p-8 text-center text-[var(--color-text-muted)]">
            Loading report card…
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between print:hidden">
              <div>
                <div className="ef-eyebrow">Cumulative this year</div>
                {report.cumulative && (
                  <div className="mt-1 flex items-baseline gap-3">
                    <span
                      className="text-4xl font-bold tabular-nums tracking-tight"
                      style={{
                        color:
                          report.cumulative.percentage >= 70 ? 'var(--color-success)' :
                          report.cumulative.percentage >= 40 ? 'var(--color-warn)' :
                          'var(--color-danger)',
                      }}
                    >
                      {report.cumulative.percentage}%
                    </span>
                    <span className="text-sm text-[var(--color-text-muted)] tabular-nums">
                      {report.cumulative.total} / {report.cumulative.max}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const rows = report.exams.flatMap((e) =>
                      e.rows.map((r) => ({
                        Exam: e.exam.name,
                        Type: e.exam.type,
                        Date: e.exam.date ? new Date(e.exam.date).toLocaleDateString() : '',
                        Subject: r.subject,
                        Marks: r.marks,
                        Max: r.max,
                        Grade: r.grade ?? '',
                        Remarks: r.remarks ?? '',
                      })),
                    );
                    downloadCsv(`report-card-${report.student.rollNumber || report.student.id}.csv`, rows);
                  }}
                >
                  <Download className="h-4 w-4" /> CSV
                </Button>
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" /> Print / PDF
                </Button>
              </div>
            </div>

            <SubjectTrends exams={report.exams} accent={ACCENT} />

            <Card variant="solid" className="print:shadow-none print:border-0 overflow-hidden">
              <div className="p-8 print:p-6">
                <header className="border-b border-[var(--color-border)] pb-4 mb-5">
                  <h1 className="text-2xl font-bold">{report.student.name}</h1>
                  <div className="mt-1 text-sm text-[var(--color-text-muted)]">
                    {report.student.section?.class?.label} · Section {report.student.section?.name} · Roll {report.student.rollNumber || '—'}
                  </div>
                </header>

                {report.exams.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">No published marks yet.</p>
                ) : (
                  <div className="space-y-6">
                    {report.exams.map((e) => (
                      <section key={e.exam.id}>
                        <div className="flex items-baseline justify-between mb-2">
                          <div>
                            <div className="ef-eyebrow">{e.exam.type.replace('_', ' ')}</div>
                            <h3 className="font-semibold">{e.exam.name}</h3>
                          </div>
                          <div className="text-right">
                            <div
                              className="text-2xl font-bold tabular-nums"
                              style={{
                                color:
                                  e.percentage >= 70 ? 'var(--color-success)' :
                                  e.percentage >= 40 ? 'var(--color-warn)' :
                                  'var(--color-danger)',
                              }}
                            >
                              {e.percentage}%
                            </div>
                            <div className="text-xs text-[var(--color-text-muted)] tabular-nums">{e.total} / {e.max}</div>
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
              </div>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
