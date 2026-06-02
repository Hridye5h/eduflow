'use client';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { api, session } from '@/lib/api';
import { CheckCircle2, Circle, Clock, Minus, Save } from 'lucide-react';

type SectionLite = { id: string; name: string };
type ClassRow = { id: string; grade: number; label: string; sections: SectionLite[] };
type Status = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | null;
type Row = { id: string; name: string; rollNumber: string | null; status: Status; note: string | null };

const STATUSES: { value: Exclude<Status, null>; label: string; icon: any; chip: string }[] = [
  { value: 'PRESENT',  label: 'Present',  icon: CheckCircle2, chip: 'ef-chip-success' },
  { value: 'ABSENT',   label: 'Absent',   icon: Circle,       chip: 'ef-chip-danger' },
  { value: 'LATE',     label: 'Late',     icon: Clock,        chip: 'ef-chip-warn' },
  { value: 'HALF_DAY', label: 'Half day', icon: Minus,        chip: 'ef-chip-info' },
];

export default function AttendancePage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sectionId, setSectionId] = useState<string>('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<ClassRow[]>('/classes', { token: session.token(), subdomain: session.subdomain() })
      .then((list) => {
        setClasses(list);
        const firstSection = list.flatMap((c) => c.sections)[0];
        if (firstSection) setSectionId(firstSection.id);
      })
      .catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    if (!sectionId || !date) return;
    setSaved(false);
    api<Row[]>(`/attendance/section/${sectionId}?date=${date}`, {
      token: session.token(),
      subdomain: session.subdomain(),
    })
      .then(setRows)
      .catch((e) => setErr(e.message));
  }, [sectionId, date]);

  const summary = useMemo(() => {
    const total = rows.length;
    const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, HALF_DAY: 0, PENDING: 0 } as any;
    rows.forEach((r) => {
      if (r.status) counts[r.status]++;
      else counts.PENDING++;
    });
    return { total, ...counts };
  }, [rows]);

  function setStatus(id: string, status: Status) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    setSaved(false);
  }

  function markAll(status: Status) {
    setRows((rs) => rs.map((r) => ({ ...r, status })));
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const payload = rows
        .filter((r) => r.status)
        .map((r) => ({ studentId: r.id, status: r.status, note: r.note ?? undefined }));
      await api(`/attendance/section/${sectionId}/mark`, {
        method: 'POST',
        token: session.token(),
        subdomain: session.subdomain(),
        body: JSON.stringify({ date, rows: payload }),
      });
      setSaved(true);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar title="Attendance" />
      <div className="flex-1 p-6 space-y-5">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        <Card>
          <CardBody className="flex flex-wrap items-end gap-3">
            <div className="w-64">
              <Select label="Section" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                {classes.flatMap((c) =>
                  c.sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {c.label} — Section {s.name}
                    </option>
                  )),
                )}
              </Select>
            </div>
            <div className="w-48">
              <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => markAll('PRESENT')}>Mark all present</Button>
              <Button onClick={save} disabled={busy || !rows.length}>
                <Save className="h-4 w-4" /> {busy ? 'Saving…' : saved ? 'Saved' : 'Save'}
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Roll call"
            subtitle={`${summary.total} students · ${summary.PRESENT} present · ${summary.ABSENT} absent · ${summary.PENDING} pending`}
          />
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[var(--color-border)] text-[var(--color-text-subtle)] text-xs uppercase tracking-wider">
                  <th className="px-5 py-3 w-16">Roll</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3 w-[28rem]">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]/60">
                    <td className="px-5 py-3 text-[var(--color-text-muted)] tabular-nums">{r.rollNumber || '—'}</td>
                    <td className="px-5 py-3 font-medium text-[var(--color-text)]">{r.name}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {STATUSES.map((s) => {
                          const active = r.status === s.value;
                          const Icon = s.icon;
                          return (
                            <button
                              key={s.value}
                              onClick={() => setStatus(r.id, s.value)}
                              className={`ef-chip ${active ? s.chip : ''} ${!active ? 'hover:bg-[var(--color-surface-muted)]' : ''}`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-10 text-center text-[var(--color-text-muted)]">
                      No students in this section yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
