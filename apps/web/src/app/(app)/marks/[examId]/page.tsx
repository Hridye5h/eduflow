'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardBody, CardHeader, Stat } from '@/components/ui/Card';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { api, session } from '@/lib/api';
import { CheckCircle2, Save, Megaphone, Download } from 'lucide-react';
import { downloadCsv } from '@/lib/export';

type ExamDetail = {
  id: string;
  name: string;
  maxMarks: number;
  passMarks: number | null;
  type: string;
  publishedAt: string | null;
  class: { id: string; label: string; sections: { id: string; name: string }[] };
  marks: Array<{ studentId: string; marks: number; grade: string | null; remarks: string | null }>;
};

type StudentRow = { id: string; name: string; rollNumber: string | null };
type Entry = { marks: string; remarks: string };

export default function ExamMarksEntry() {
  const params = useParams<{ examId: string }>();
  const examId = params.examId;

  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [sectionId, setSectionId] = useState<string>('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);

  async function loadExam() {
    try {
      const e = await api<ExamDetail>(`/exams/${examId}`, {
        token: session.token(),
        subdomain: session.subdomain(),
      });
      setExam(e);
      if (e.class.sections.length && !sectionId) setSectionId(e.class.sections[0].id);

      const sum = await api(`/exams/${examId}/summary`, {
        token: session.token(),
        subdomain: session.subdomain(),
      }).catch(() => null);
      setSummary(sum);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => { loadExam(); }, [examId]);

  useEffect(() => {
    if (!sectionId || !exam) return;
    api<StudentRow[]>(`/sections/${sectionId}/students`, {
      token: session.token(),
      subdomain: session.subdomain(),
    }).then((rows) => {
      setStudents(rows);
      const map: Record<string, Entry> = {};
      for (const r of rows) {
        const existing = exam.marks.find((m) => m.studentId === r.id);
        map[r.id] = {
          marks: existing ? String(existing.marks) : '',
          remarks: existing?.remarks ?? '',
        };
      }
      setEntries(map);
    }).catch((e) => setErr(e.message));
  }, [sectionId, exam]);

  const stats = useMemo(() => {
    const vals = Object.values(entries).map((e) => Number(e.marks)).filter((n) => !isNaN(n) && n > 0);
    if (!vals.length) return null;
    const total = vals.reduce((a, b) => a + b, 0);
    return {
      filled: vals.length,
      avg: Math.round((total / vals.length) * 10) / 10,
      top: Math.max(...vals),
      low: Math.min(...vals),
    };
  }, [entries]);

  async function save() {
    if (!exam) return;
    setBusy(true);
    setErr(null);
    try {
      const rows = Object.entries(entries)
        .filter(([, v]) => v.marks !== '')
        .map(([studentId, v]) => ({ studentId, marks: Number(v.marks), remarks: v.remarks || undefined }));
      await api(`/exams/${exam.id}/marks`, {
        method: 'POST',
        token: session.token(),
        subdomain: session.subdomain(),
        body: JSON.stringify({ rows }),
      });
      setSavedAt(new Date());
      await loadExam();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!exam) return;
    if (!confirm('Publish marks? Parents and students will be notified.')) return;
    setBusy(true);
    try {
      await api(`/exams/${exam.id}/publish`, {
        method: 'POST',
        token: session.token(),
        subdomain: session.subdomain(),
      });
      await loadExam();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!exam) {
    return <><TopBar title="Marks" /><div className="p-6 text-sm text-[var(--color-text-muted)]">Loading…</div></>;
  }

  return (
    <>
      <TopBar title={exam.name} />
      <div className="flex-1 p-6 space-y-5">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        <section className="grid sm:grid-cols-4 gap-4">
          <Stat label="Max" value={exam.maxMarks} />
          <Stat label="Entered" value={stats?.filled ?? 0} hint={`of ${students.length}`} />
          <Stat label="Class avg" value={stats ? `${stats.avg}` : '—'} tone="info" />
          <Stat
            label="Status"
            value={exam.publishedAt ? 'Published' : 'Draft'}
            tone={exam.publishedAt ? 'success' : 'warn'}
            hint={exam.publishedAt ? new Date(exam.publishedAt).toLocaleDateString() : 'Not yet published'}
          />
        </section>

        <Card>
          <CardBody className="flex items-end gap-3 flex-wrap">
            <div className="w-64">
              <Select label="Section" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                {exam.class.sections.map((s) => (
                  <option key={s.id} value={s.id}>{exam.class.label} — Section {s.name}</option>
                ))}
              </Select>
            </div>
            <div className="ml-auto flex gap-2 items-center">
              {savedAt && <span className="text-xs text-[var(--color-text-muted)]">Saved {savedAt.toLocaleTimeString()}</span>}
              <Button
                variant="outline"
                onClick={() => {
                  const rows = students.map((s) => {
                    const e = entries[s.id] ?? { marks: '', remarks: '' };
                    const n = Number(e.marks);
                    return {
                      Roll: s.rollNumber ?? '',
                      Name: s.name,
                      Marks: e.marks === '' ? '' : n,
                      Max: exam.maxMarks,
                      Percentage: e.marks === '' ? '' : Math.round((n / exam.maxMarks) * 100),
                      Remarks: e.remarks || '',
                    };
                  });
                  downloadCsv(`marks-${exam.name.replace(/\s+/g, '-')}.csv`, rows);
                }}
              >
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button variant="outline" onClick={save} disabled={busy}>
                <Save className="h-4 w-4" /> {busy ? 'Saving…' : 'Save'}
              </Button>
              {!exam.publishedAt && (
                <Button onClick={publish} disabled={busy}>
                  <Megaphone className="h-4 w-4" /> Publish
                </Button>
              )}
              {exam.publishedAt && (
                <span className="ef-chip ef-chip-success"><CheckCircle2 className="h-3 w-3" /> Published</span>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Roster" subtitle="Enter marks per student. Saved progress persists." />
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[var(--color-border)] text-[var(--color-text-subtle)] text-xs uppercase tracking-wider">
                  <th className="px-5 py-3 w-16">Roll</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3 w-32">Marks / {exam.maxMarks}</th>
                  <th className="px-5 py-3 w-24">Grade</th>
                  <th className="px-5 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const e = entries[s.id] ?? { marks: '', remarks: '' };
                  const n = Number(e.marks);
                  const pct = n && exam.maxMarks ? (n / exam.maxMarks) * 100 : 0;
                  const grade = !isNaN(n) && e.marks !== '' ? gradeOf(pct) : '';
                  const pass = exam.passMarks ? n >= exam.passMarks : pct >= 35;
                  return (
                    <tr key={s.id} className="border-b last:border-0 border-[var(--color-border)]">
                      <td className="px-5 py-2 text-[var(--color-text-muted)] tabular-nums">{s.rollNumber || '—'}</td>
                      <td className="px-5 py-2 font-medium">{s.name}</td>
                      <td className="px-5 py-2">
                        <input
                          type="number"
                          min={0}
                          max={exam.maxMarks}
                          value={e.marks}
                          onChange={(ev) => setEntries((m) => ({ ...m, [s.id]: { ...e, marks: ev.target.value } }))}
                          className="ef-input w-24 tabular-nums"
                        />
                      </td>
                      <td className="px-5 py-2">
                        {grade && (
                          <span className={`ef-chip ${pass ? 'ef-chip-success' : 'ef-chip-danger'}`}>{grade}</span>
                        )}
                      </td>
                      <td className="px-5 py-2">
                        <input
                          value={e.remarks}
                          placeholder="Optional"
                          onChange={(ev) => setEntries((m) => ({ ...m, [s.id]: { ...e, remarks: ev.target.value } }))}
                          className="ef-input"
                        />
                      </td>
                    </tr>
                  );
                })}
                {students.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-[var(--color-text-muted)]">No students in this section.</td></tr>
                )}
              </tbody>
            </table>
          </CardBody>
        </Card>

        {summary?.stats && (
          <Card>
            <CardHeader title="Class summary" subtitle="Across all sections of this class" />
            <CardBody>
              <div className="grid sm:grid-cols-4 gap-4">
                <Stat label="Students with marks" value={summary.stats.count} />
                <Stat label="Average" value={summary.stats.averageMarks} tone="info" />
                <Stat label="Top" value={summary.stats.topStudent || '—'} tone="success" />
                <Stat label="Lowest" value={summary.stats.bottomStudent || '—'} tone="warn" />
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}

function gradeOf(pct: number) {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}
