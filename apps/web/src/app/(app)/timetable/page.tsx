'use client';
import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { api, session } from '@/lib/api';
import { Save, AlertTriangle } from 'lucide-react';

type ClassRow = { id: string; label: string; sections: { id: string; name: string }[] };
type Period = {
  id?: string;
  dayOfWeek: number;
  periodIndex: number;
  startTime: string;
  endTime: string;
  subjectId: string | null;
  teacherId: string | null;
  subject?: { id: string; name: string } | null;
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PERIODS = [
  { idx: 1, start: '09:00', end: '09:45' },
  { idx: 2, start: '09:45', end: '10:30' },
  { idx: 3, start: '10:45', end: '11:30' },
  { idx: 4, start: '11:30', end: '12:15' },
  { idx: 5, start: '13:00', end: '13:45' },
  { idx: 6, start: '13:45', end: '14:30' },
];

export default function TimetablePage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [grid, setGrid] = useState<Record<string, Period>>({});
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<ClassRow[]>('/classes', { token: session.token(), subdomain: session.subdomain() })
      .then((c) => {
        setClasses(c);
        const first = c.flatMap((cc) => cc.sections)[0];
        if (first) setSectionId(first.id);
      })
      .catch((e) => setErr(e.message));

    // teachers + subjects via admin (graceful fallback if endpoint missing)
    api('/admin/users?role=TEACHER', { token: session.token(), subdomain: session.subdomain() })
      .then((r: any) => setTeachers(r.users ?? r ?? []))
      .catch(() => {});
    api('/admin/subjects', { token: session.token(), subdomain: session.subdomain() })
      .then((r: any) => setSubjects(r ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!sectionId) return;
    api(`/timetable/section/${sectionId}`, {
      token: session.token(), subdomain: session.subdomain(),
    }).then((r: any) => {
      const map: Record<string, Period> = {};
      for (const p of r.timetable.periods) {
        map[`${p.dayOfWeek}-${p.periodIndex}`] = p;
      }
      setGrid(map);
      setConflicts([]);
    }).catch((e) => setErr(e.message));
  }, [sectionId]);

  function key(d: number, p: number) { return `${d}-${p}`; }
  function updateCell(d: number, p: number, patch: Partial<Period>) {
    const k = key(d, p);
    const tmpl = PERIODS.find((x) => x.idx === p)!;
    const existing = grid[k] ?? {
      dayOfWeek: d, periodIndex: p,
      startTime: tmpl.start, endTime: tmpl.end,
      subjectId: null, teacherId: null,
    };
    setGrid({ ...grid, [k]: { ...existing, ...patch } });
  }

  async function save() {
    setBusy(true);
    setConflicts([]);
    setErr(null);
    try {
      const periods = Object.values(grid).filter((p) => p.subjectId || p.teacherId);
      await api(`/timetable/section/${sectionId}`, {
        method: 'PUT',
        token: session.token(), subdomain: session.subdomain(),
        body: JSON.stringify({ periods }),
      });
      alert('Timetable saved.');
    } catch (e: any) {
      if (e.payload?.conflicts) setConflicts(e.payload.conflicts);
      setErr(e.message);
    } finally { setBusy(false); }
  }

  return (
    <>
      <TopBar title="Timetable" />
      <div className="flex-1 p-6 space-y-5">
        {err && (
          <Card className="p-4 text-sm text-[var(--color-danger)] flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p>{err}</p>
              {conflicts.length > 0 && (
                <ul className="mt-2 list-disc ml-5 space-y-1 text-xs">
                  {conflicts.map((c, i) => (
                    <li key={i}>
                      {c.kind === 'internal'
                        ? `Same teacher booked twice on day ${c.a.dayOfWeek}: ${c.a.startTime}–${c.a.endTime} and ${c.b.startTime}–${c.b.endTime}`
                        : `Teacher already teaching ${c.existing.class} / ${c.existing.section} at ${c.existing.startTime}–${c.existing.endTime}`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        )}

        <Card>
          <CardBody className="flex items-end gap-3">
            <div className="w-72">
              <Select label="Section" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                {classes.flatMap((c) => c.sections.map((s) => (
                  <option key={s.id} value={s.id}>{c.label} — Section {s.name}</option>
                )))}
              </Select>
            </div>
            <Button onClick={save} disabled={busy} className="ml-auto">
              <Save className="h-4 w-4" /> {busy ? 'Saving…' : 'Save timetable'}
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Weekly grid" subtitle="Click a cell to assign subject + teacher." />
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-text-subtle)]">
                  <th className="px-3 py-3 text-left w-24">Period</th>
                  {DAYS.map((d, i) => (
                    <th key={i} className="px-3 py-3 text-left">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((p) => (
                  <tr key={p.idx} className="border-b last:border-0 border-[var(--color-border)]">
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium">P{p.idx}</div>
                      <div className="text-xs text-[var(--color-text-muted)] tabular-nums">{p.start}–{p.end}</div>
                    </td>
                    {DAYS.map((_, day) => {
                      const cell = grid[key(day, p.idx)];
                      return (
                        <td key={day} className="px-2 py-2 align-top min-w-[140px]">
                          <select
                            className="ef-input text-xs py-1 mb-1"
                            value={cell?.subjectId ?? ''}
                            onChange={(e) => updateCell(day, p.idx, { subjectId: e.target.value || null })}
                          >
                            <option value="">— Subject —</option>
                            {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                          <select
                            className="ef-input text-xs py-1"
                            value={cell?.teacherId ?? ''}
                            onChange={(e) => updateCell(day, p.idx, { teacherId: e.target.value || null })}
                          >
                            <option value="">— Teacher —</option>
                            {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
