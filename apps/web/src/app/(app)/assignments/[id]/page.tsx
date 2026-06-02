'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardBody, CardHeader, Stat } from '@/components/ui/Card';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, session } from '@/lib/api';
import { Clock, Save, AlertTriangle, Send, Download, CheckCircle2, Award, Pencil } from 'lucide-react';
import { FileUpload, type Attachment } from '@/components/ui/FileUpload';
import { downloadCsv } from '@/lib/export';

type Detail = {
  id: string;
  dueAt: string;
  maxMarks: number | null;
  post: {
    title: string;
    body: string;
    author: { id: string; name: string; role: string };
    section: { id: string; name: string; class: { label: string } };
  };
};

type Row = {
  student: { id: string; name: string; rollNumber: string | null };
  submission: any | null;
  status: string;
  isLate: boolean;
};

export default function AssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const me = session.user();
  const isStudent = me?.role === 'STUDENT';

  const [detail, setDetail] = useState<Detail | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [mySubmission, setMySubmission] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [studentBody, setStudentBody] = useState('');
  const [studentFiles, setStudentFiles] = useState<Attachment[]>([]);
  const [gradeMap, setGradeMap] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  async function load() {
    try {
      const d = await api<Detail>(`/assignments/${id}`, {
        token: session.token(), subdomain: session.subdomain(),
      });
      setDetail(d);

      if (isStudent) {
        const m = await api<any>(`/assignments/${id}/my-submission`, {
          token: session.token(), subdomain: session.subdomain(),
        }).catch(() => null);
        setMySubmission(m);
        if (m?.body) setStudentBody(m.body);
        if (m?.attachmentsJson) setStudentFiles(m.attachmentsJson as Attachment[]);
      } else {
        const s = await api<{ rows: Row[] }>(`/assignments/${id}/submissions`, {
          token: session.token(), subdomain: session.subdomain(),
        });
        setRows(s.rows);
      }
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, [id]);

  const stats = useMemo(() => {
    const total = rows.length;
    const submitted = rows.filter((r) => r.status !== 'PENDING').length;
    const graded = rows.filter((r) => r.status === 'GRADED').length;
    const late = rows.filter((r) => r.isLate).length;
    return { total, submitted, graded, late };
  }, [rows]);

  async function submitAsStudent() {
    setBusy(true);
    setErr(null);
    try {
      await api(`/assignments/${id}/submit`, {
        method: 'POST',
        token: session.token(),
        subdomain: session.subdomain(),
        body: JSON.stringify({ body: studentBody, attachments: studentFiles }),
      });
      // Refetch so the UI immediately reflects the submission status.
      const fresh = await api<any>(`/assignments/${id}/my-submission`, {
        token: session.token(), subdomain: session.subdomain(),
      });
      setMySubmission(fresh);
      setEditMode(false);
      setJustSubmitted(true);
      setTimeout(() => setJustSubmitted(false), 3500);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function gradeOne(submissionId: string) {
    const g = gradeMap[submissionId];
    if (!g?.grade) return;
    setBusy(true);
    try {
      await api(`/assignments/submissions/${submissionId}/grade`, {
        method: 'POST',
        token: session.token(),
        subdomain: session.subdomain(),
        body: JSON.stringify({ grade: Number(g.grade), feedback: g.feedback || undefined }),
      });
      await load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (!detail) return <><TopBar title="Assignment" /><div className="p-6 text-sm">{err ?? 'Loading…'}</div></>;

  const past = new Date() > new Date(detail.dueAt);

  return (
    <>
      <TopBar title={detail.post.title} />
      <div className="flex-1 p-6 space-y-5">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        <Card>
          <CardBody>
            <p className="text-[var(--color-text)] whitespace-pre-wrap">{detail.post.body}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className={`ef-chip ${past ? 'ef-chip-danger' : 'ef-chip-brand'}`}>
                <Clock className="h-3 w-3" /> Due {new Date(detail.dueAt).toLocaleString()}
              </span>
              {detail.maxMarks != null && <span className="ef-chip">Max {detail.maxMarks}</span>}
              <span className="ef-chip">{detail.post.section.class.label} · Section {detail.post.section.name}</span>
              <span className="ef-chip">by {detail.post.author.name}</span>
            </div>
          </CardBody>
        </Card>

        {isStudent ? (
          <StudentSubmissionView
            mySubmission={mySubmission}
            justSubmitted={justSubmitted}
            editMode={editMode}
            setEditMode={setEditMode}
            studentBody={studentBody}
            setStudentBody={setStudentBody}
            studentFiles={studentFiles}
            setStudentFiles={setStudentFiles}
            submit={submitAsStudent}
            busy={busy}
            maxMarks={detail.maxMarks}
          />
        ) : (
          <>
            <section className="grid sm:grid-cols-4 gap-4">
              <Stat label="Students" value={stats.total} />
              <Stat label="Submitted" value={stats.submitted} tone="info" />
              <Stat label="Graded" value={stats.graded} tone="success" />
              <Stat label="Late" value={stats.late} tone="warn" />
            </section>

            <Card>
              <CardHeader
                title="Submissions"
                subtitle="Review and grade each entry."
                right={
                  <Button
                    variant="outline"
                    onClick={() => {
                      const exportRows = rows.map((r) => ({
                        Roll: r.student.rollNumber ?? '',
                        Name: r.student.name,
                        Status: r.status,
                        Late: r.isLate ? 'yes' : 'no',
                        SubmittedAt: r.submission?.submittedAt ? new Date(r.submission.submittedAt).toLocaleString() : '',
                        Grade: r.submission?.grade ?? '',
                        Feedback: r.submission?.feedback ?? '',
                        BodyChars: r.submission?.body?.length ?? 0,
                      }));
                      downloadCsv(`submissions-${(detail.post.title || 'assignment').replace(/\s+/g, '-')}.csv`, exportRows);
                    }}
                  >
                    <Download className="h-4 w-4" /> Export CSV
                  </Button>
                }
              />
              <CardBody className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-text-subtle)]">
                      <th className="px-5 py-3 w-14">Roll</th>
                      <th className="px-5 py-3">Student</th>
                      <th className="px-5 py-3">Submission</th>
                      <th className="px-5 py-3 w-28">Status</th>
                      <th className="px-5 py-3 w-28">Grade</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const sub = r.submission;
                      const gm = gradeMap[sub?.id] ?? { grade: sub?.grade ?? '', feedback: sub?.feedback ?? '' };
                      return (
                        <tr key={r.student.id} className="border-b last:border-0 border-[var(--color-border)] align-top">
                          <td className="px-5 py-3 text-[var(--color-text-muted)]">{r.student.rollNumber || '—'}</td>
                          <td className="px-5 py-3 font-medium">{r.student.name}</td>
                          <td className="px-5 py-3 max-w-md">
                            {sub ? (
                              <details>
                                <summary className="cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                                  {(sub.body ?? '').slice(0, 80) || '(file only)'}
                                </summary>
                                <p className="mt-2 text-sm whitespace-pre-wrap">{sub.body}</p>
                              </details>
                            ) : (
                              <span className="text-[var(--color-text-subtle)]">No submission</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <StatusChip status={r.status} late={r.isLate} />
                          </td>
                          <td className="px-5 py-3">
                            {sub && (
                              <input
                                type="number"
                                className="ef-input w-20 tabular-nums"
                                value={gm.grade}
                                onChange={(e) => setGradeMap((m) => ({ ...m, [sub.id]: { ...gm, grade: e.target.value } }))}
                              />
                            )}
                          </td>
                          <td className="px-5 py-3">
                            {sub && (
                              <div className="flex items-center gap-2">
                                <input
                                  className="ef-input"
                                  placeholder="Feedback"
                                  value={gm.feedback}
                                  onChange={(e) => setGradeMap((m) => ({ ...m, [sub.id]: { ...gm, feedback: e.target.value } }))}
                                />
                                <Button variant="outline" onClick={() => gradeOne(sub.id)} disabled={busy}>
                                  <Save className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {rows.length === 0 && (
                      <tr><td colSpan={6} className="px-5 py-10 text-center text-[var(--color-text-muted)]">No students in this section.</td></tr>
                    )}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </>
  );
}

function StatusChip({ status, late }: { status: string; late: boolean }) {
  if (status === 'GRADED') return <span className="ef-chip ef-chip-success">Graded</span>;
  if (status === 'SUBMITTED') return (
    <span className={`ef-chip ${late ? 'ef-chip-warn' : 'ef-chip-info'}`}>
      {late && <AlertTriangle className="h-3 w-3" />} {late ? 'Late' : 'Submitted'}
    </span>
  );
  return <span className="ef-chip">Pending</span>;
}

// =====================================================================
// Student submission view — Submit / Submitted / Graded states
// =====================================================================

function StudentSubmissionView({
  mySubmission,
  justSubmitted,
  editMode,
  setEditMode,
  studentBody,
  setStudentBody,
  studentFiles,
  setStudentFiles,
  submit,
  busy,
  maxMarks,
}: {
  mySubmission: any;
  justSubmitted: boolean;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  studentBody: string;
  setStudentBody: (v: string) => void;
  studentFiles: Attachment[];
  setStudentFiles: (v: Attachment[]) => void;
  submit: () => void;
  busy: boolean;
  maxMarks: number | null;
}) {
  const status = mySubmission?.status;
  const isGraded = status === 'GRADED';
  const isSubmitted = status === 'SUBMITTED';
  const showForm = !mySubmission || editMode;

  // GRADED — show the result card prominently
  if (isGraded && !editMode) {
    const grade = mySubmission.grade;
    const pct = maxMarks && grade != null ? Math.round((grade / maxMarks) * 100) : null;
    const tone = pct == null ? 'info' : pct >= 70 ? 'success' : pct >= 40 ? 'warn' : 'danger';
    const toneColor =
      tone === 'success' ? 'var(--color-success)' :
      tone === 'warn'    ? 'var(--color-warn)' :
      tone === 'danger'  ? 'var(--color-danger)' :
                           'var(--color-info)';

    return (
      <>
        <Card variant="solid" className="overflow-hidden">
          <div className="relative p-6">
            <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
              style={{ background: `radial-gradient(circle at 100% 0%, ${toneColor} 0%, transparent 50%)` }} />
            <div className="relative">
              <div className="ef-chip ef-chip-success mb-2">
                <Award className="h-3 w-3" /> Graded
              </div>
              <div className="flex items-end gap-4 flex-wrap">
                <div>
                  <div className="ef-eyebrow">Your grade</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-5xl font-bold tabular-nums tracking-tight" style={{ color: toneColor }}>
                      {grade}
                    </span>
                    {maxMarks != null && (
                      <span className="text-lg text-[var(--color-text-muted)] tabular-nums">/ {maxMarks}</span>
                    )}
                    {pct != null && (
                      <span className="ef-chip" style={{ marginLeft: '0.5rem' }}>{pct}%</span>
                    )}
                  </div>
                </div>
                {mySubmission.gradedBy && (
                  <div className="ml-auto text-xs text-[var(--color-text-muted)] text-right">
                    <div className="ef-eyebrow">Graded by</div>
                    <div className="mt-1 font-medium text-[var(--color-text)]">{mySubmission.gradedBy.name}</div>
                    {mySubmission.gradedAt && (
                      <div className="text-[10px] mt-0.5">{new Date(mySubmission.gradedAt).toLocaleString()}</div>
                    )}
                  </div>
                )}
              </div>
              {mySubmission.feedback && (
                <div className="mt-5 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                  <div className="ef-eyebrow mb-1.5">Feedback</div>
                  <p className="text-sm whitespace-pre-wrap">{mySubmission.feedback}</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="What you submitted"
            subtitle={mySubmission.submittedAt ? `Submitted ${new Date(mySubmission.submittedAt).toLocaleString()}${mySubmission.isLate ? ' (late)' : ''}` : 'Submitted'}
          />
          <CardBody>
            {mySubmission.body && (
              <p className="text-sm whitespace-pre-wrap text-[var(--color-text)]">{mySubmission.body}</p>
            )}
            {Array.isArray(mySubmission.attachmentsJson) && mySubmission.attachmentsJson.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {(mySubmission.attachmentsJson as Attachment[]).map((a, i) => (
                  <li key={i}>
                    <a href={a.url} target="_blank" rel="noreferrer" className="ef-chip hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand)]">
                      {a.name}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </>
    );
  }

  // SUBMITTED but not graded — show a positive confirmation, allow re-edit
  if (isSubmitted && !editMode) {
    return (
      <Card variant="solid" className="overflow-hidden">
        <div className="relative p-6">
          {justSubmitted && (
            <div className="absolute -top-px left-8 right-8 h-px shimmer-line"
              style={{ background: 'linear-gradient(90deg, transparent, var(--color-success), transparent)' }} />
          )}
          <div className="flex items-start gap-4">
            <div
              className="h-12 w-12 rounded-xl grid place-items-center shrink-0"
              style={{ background: 'rgba(22,163,74,0.10)' }}
            >
              <CheckCircle2 className="h-6 w-6 text-[var(--color-success)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="ef-chip ef-chip-success mb-1.5">
                <CheckCircle2 className="h-3 w-3" /> {mySubmission.isLate ? 'Submitted (late)' : 'Submitted'}
              </div>
              <h3 className="font-semibold text-lg">
                {justSubmitted ? 'Just submitted!' : 'Your work is in.'}
              </h3>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                {mySubmission.submittedAt ? `On ${new Date(mySubmission.submittedAt).toLocaleString()}.` : ''}
                {' '}Waiting for your teacher to grade it.
              </p>
              {mySubmission.body && (
                <div className="mt-4 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                  <p className="text-sm whitespace-pre-wrap">{mySubmission.body}</p>
                </div>
              )}
              {Array.isArray(mySubmission.attachmentsJson) && mySubmission.attachmentsJson.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {(mySubmission.attachmentsJson as Attachment[]).map((a, i) => (
                    <li key={i}>
                      <a href={a.url} target="_blank" rel="noreferrer" className="ef-chip hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand)]">
                        {a.name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button variant="outline" onClick={() => setEditMode(true)} className="shrink-0">
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // FORM — initial submit or re-edit
  return (
    <Card>
      <CardHeader
        title={mySubmission ? 'Update your submission' : 'Your submission'}
        subtitle={mySubmission ? 'Re-submitting will replace your previous answer.' : 'Type your answer below; you can attach files too.'}
        right={
          mySubmission && (
            <Button variant="ghost" onClick={() => setEditMode(false)}>Cancel</Button>
          )
        }
      />
      <CardBody>
        <textarea
          className="ef-input min-h-[8rem]"
          placeholder="Write your submission here…"
          value={studentBody}
          onChange={(e) => setStudentBody(e.target.value)}
        />
        <div className="mt-3">
          <FileUpload value={studentFiles} onChange={setStudentFiles} label="Files" />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            onClick={submit}
            disabled={busy || (!studentBody.trim() && !studentFiles.length)}
          >
            <Send className="h-4 w-4" /> {busy ? 'Sending…' : mySubmission ? 'Re-submit' : 'Submit'}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
