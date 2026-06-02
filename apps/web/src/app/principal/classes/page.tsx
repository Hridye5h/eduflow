'use client';
import { useEffect, useState } from 'react';
import { Plus, Users, Building2, ChevronRight } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, session } from '@/lib/api';

const ACCENT = '#dc2626';

type SectionLite = { id: string; name: string; classTeacher?: { name: string } | null };
type ClassRow = { id: string; grade: number; label: string; sections: SectionLite[] };

export default function PrincipalClassesPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [newGrade, setNewGrade] = useState('');
  const [newSection, setNewSection] = useState<Record<string, string>>({});

  async function refresh() {
    try {
      const list = await api<ClassRow[]>('/classes', {
        token: session.token(), subdomain: session.subdomain(),
      });
      setClasses(list);
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { refresh(); }, []);

  async function createClass(e: React.FormEvent) {
    e.preventDefault();
    if (!newGrade) return;
    setBusy(true);
    try {
      await api('/classes', {
        method: 'POST', token: session.token(), subdomain: session.subdomain(),
        body: JSON.stringify({ grade: Number(newGrade) }),
      });
      setNewGrade('');
      await refresh();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function addSection(classId: string) {
    const name = newSection[classId]?.trim();
    if (!name) return;
    try {
      await api(`/classes/${classId}/sections`, {
        method: 'POST', token: session.token(), subdomain: session.subdomain(),
        body: JSON.stringify({ name }),
      });
      setNewSection((m) => ({ ...m, [classId]: '' }));
      await refresh();
    } catch (e: any) { setErr(e.message); }
  }

  const totalSections = classes.reduce((a, c) => a + c.sections.length, 0);

  return (
    <>
      <TopBar title="Classes & sections" eyebrow="Principal portal" />
      <div className="flex-1 p-6 space-y-5 max-w-5xl">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        <section className="grid grid-cols-2 gap-4">
          <StatBox label="Classes" value={classes.length} icon={<Building2 className="h-5 w-5" />} />
          <StatBox label="Sections" value={totalSections} icon={<Users className="h-5 w-5" />} />
        </section>

        <Card variant="solid">
          <CardHeader title="Add a class" subtitle="Each class belongs to the current academic year." />
          <CardBody>
            <form onSubmit={createClass} className="flex flex-wrap gap-3 items-end">
              <div className="w-32">
                <Input
                  label="Grade"
                  type="number" min={1} max={12}
                  value={newGrade}
                  onChange={(e) => setNewGrade(e.target.value)}
                  required
                />
              </div>
              <Button disabled={busy} type="submit">
                <Plus className="h-4 w-4" /> Add class
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="space-y-3">
          {classes.length === 0 && (
            <Card className="p-8 text-center text-[var(--color-text-muted)]">
              No classes yet. Add one above to get started.
            </Card>
          )}
          {classes.map((c) => (
            <Card key={c.id} variant="solid">
              <CardHeader
                eyebrow={`Grade ${c.grade}`}
                title={c.label}
                subtitle={`${c.sections.length} section${c.sections.length === 1 ? '' : 's'}`}
              />
              <CardBody>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {c.sections.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="ef-chip" style={{ background: `${ACCENT}10`, color: ACCENT, borderColor: `${ACCENT}30` }}>
                          Section {s.name}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-[var(--color-text-muted)] flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {s.classTeacher?.name ?? 'No class teacher assigned'}
                      </div>
                    </div>
                  ))}

                  <form
                    onSubmit={(e) => { e.preventDefault(); addSection(c.id); }}
                    className="p-4 rounded-xl border border-dashed border-[var(--color-border-strong)] flex gap-2 items-end"
                  >
                    <Input
                      label="New section"
                      value={newSection[c.id] || ''}
                      onChange={(e) => setNewSection((m) => ({ ...m, [c.id]: e.target.value }))}
                      placeholder="A"
                      className="uppercase"
                    />
                    <Button variant="outline" type="submit"><Plus className="h-4 w-4" /></Button>
                  </form>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}

function StatBox({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="ef-eyebrow">{label}</div>
        <span className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: `${ACCENT}10`, color: ACCENT }}>
          {icon}
        </span>
      </div>
      <div className="mt-3 text-3xl font-bold tabular-nums tracking-tight">{value}</div>
    </Card>
  );
}
