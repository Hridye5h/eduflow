'use client';
import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader, Stat } from '@/components/ui/Card';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { api, session } from '@/lib/api';
import { Bell, Plus, Receipt, IndianRupee } from 'lucide-react';

type ClassRow = { id: string; label: string };
type Structure = {
  id: string;
  name: string;
  amount: number;
  dueDate: string | null;
  isMandatory: boolean;
  payments: Array<{
    id: string;
    amountPaid: number;
    status: string;
    student: { id: string; name: string; rollNumber: string | null };
  }>;
  stats: { total: number; paid: number; partial: number; overdue: number };
  collected: number;
};

export default function FeesPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState('');
  const [structures, setStructures] = useState<Structure[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: '', amount: '', dueDate: '' });
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!classId) return;
    try {
      const [c, s] = await Promise.all([
        api<Structure[]>(`/fees/class/${classId}`, { token: session.token(), subdomain: session.subdomain() }),
        api(`/fees/summary`, { token: session.token(), subdomain: session.subdomain() }),
      ]);
      setStructures(c);
      setSummary(s);
    } catch (e: any) { setErr(e.message); }
  }

  useEffect(() => {
    api<any[]>('/classes', { token: session.token(), subdomain: session.subdomain() }).then((cs) => {
      const list = cs.map((c) => ({ id: c.id, label: c.label }));
      setClasses(list);
      if (list[0]) setClassId(list[0].id);
    }).catch((e) => setErr(e.message));
  }, []);
  useEffect(() => { load(); }, [classId]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/fees/structures', {
        method: 'POST',
        token: session.token(), subdomain: session.subdomain(),
        body: JSON.stringify({
          classId,
          name: draft.name,
          amount: Number(draft.amount),
          dueDate: draft.dueDate || undefined,
        }),
      });
      setDraft({ name: '', amount: '', dueDate: '' });
      await load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function recordPayment(paymentId: string, full: number) {
    const amount = prompt(`Amount paid (₹)?`, String(full));
    if (!amount) return;
    try {
      await api(`/fees/payments/${paymentId}`, {
        method: 'POST',
        token: session.token(), subdomain: session.subdomain(),
        body: JSON.stringify({ amount: Number(amount) }),
      });
      await load();
    } catch (e: any) { setErr(e.message); }
  }

  async function remindAll() {
    try {
      const r = await api<{ reminded: number }>('/fees/overdue-remind', {
        method: 'POST',
        token: session.token(), subdomain: session.subdomain(),
      });
      alert(`Reminders sent to ${r.reminded} parents.`);
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <>
      <TopBar title="Fees" />
      <div className="flex-1 p-6 space-y-5">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        {summary && (
          <>
            <section className="grid sm:grid-cols-4 gap-4">
              <Stat label="Collected" value={`₹${summary.collected.toLocaleString()}`} tone="success" />
              <Stat label="Expected" value={`₹${summary.expected.toLocaleString()}`} />
              <Stat label="Pending" value={summary.pending} tone="warn" />
              <Stat label="Overdue" value={summary.overdue} tone="danger" />
            </section>
            <CollectionMeter collected={summary.collected} expected={summary.expected} />
          </>
        )}

        <Card>
          <CardBody className="flex items-end gap-3 flex-wrap">
            <div className="w-64">
              <Select label="Class" value={classId} onChange={(e) => setClassId(e.target.value)}>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </Select>
            </div>
            <Button variant="outline" onClick={remindAll} className="ml-auto">
              <Bell className="h-4 w-4" /> Send overdue reminders
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Add fee item" subtitle="Tuition, transport, activity fee, etc." />
          <CardBody>
            <form onSubmit={create} className="grid sm:grid-cols-4 gap-3 items-end">
              <Input label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required placeholder="Tuition Term 1" />
              <Input label="Amount (₹)" type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} required />
              <Input label="Due date" type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
              <Button type="submit" disabled={busy}><Plus className="h-4 w-4" /> Add</Button>
            </form>
          </CardBody>
        </Card>

        <div className="space-y-3">
          {structures.map((s) => (
            <Card key={s.id}>
              <CardHeader
                title={s.name}
                subtitle={`₹${s.amount.toLocaleString()} · ${s.dueDate ? new Date(s.dueDate).toLocaleDateString() : 'no due date'}`}
                right={
                  <div className="flex gap-1.5">
                    <span className="ef-chip ef-chip-success">{s.stats.paid} paid</span>
                    <span className="ef-chip ef-chip-warn">{s.stats.partial} partial</span>
                    <span className="ef-chip ef-chip-danger">{s.stats.overdue} overdue</span>
                  </div>
                }
              />
              <CardBody className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-text-subtle)]">
                      <th className="px-5 py-2 w-14">Roll</th>
                      <th className="px-5 py-2">Student</th>
                      <th className="px-5 py-2 text-right">Paid</th>
                      <th className="px-5 py-2 text-right">Outstanding</th>
                      <th className="px-5 py-2">Status</th>
                      <th className="px-5 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.payments.map((p) => {
                      const remaining = s.amount - p.amountPaid;
                      const dueDate = s.dueDate ? new Date(s.dueDate) : null;
                      const daysOverdue = dueDate
                        ? Math.floor((Date.now() - dueDate.getTime()) / 86_400_000)
                        : 0;
                      const overdue = p.status !== 'PAID' && daysOverdue > 0;
                      return (
                        <tr key={p.id} className="border-b last:border-0 border-[var(--color-border)]">
                          <td className="px-5 py-2 text-[var(--color-text-muted)]">{p.student.rollNumber || '—'}</td>
                          <td className="px-5 py-2">
                            <div className="font-medium">{p.student.name}</div>
                            {overdue && (
                              <div className="text-xs font-semibold mt-0.5" style={{ color: 'var(--color-danger)' }}>
                                {daysOverdue} day{daysOverdue === 1 ? '' : 's'} overdue
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-2 text-right tabular-nums">₹{p.amountPaid.toLocaleString()}</td>
                          <td className="px-5 py-2 text-right tabular-nums font-semibold">
                            {p.status !== 'PAID' ? `₹${remaining.toLocaleString()}` : '—'}
                          </td>
                          <td className="px-5 py-2">
                            <StatusChip status={overdue ? 'OVERDUE' : p.status} />
                          </td>
                          <td className="px-5 py-2 text-right">
                            {p.status !== 'PAID' && (
                              <Button variant="outline" onClick={() => recordPayment(p.id, remaining)}>
                                <Receipt className="h-4 w-4" /> Record
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          ))}
          {structures.length === 0 && (
            <Card className="p-8 text-center text-[var(--color-text-muted)]">No fee items for this class.</Card>
          )}
        </div>
      </div>
    </>
  );
}

function StatusChip({ status }: { status: string }) {
  if (status === 'PAID') return <span className="ef-chip ef-chip-success">Paid</span>;
  if (status === 'PARTIAL') return <span className="ef-chip ef-chip-warn">Partial</span>;
  if (status === 'OVERDUE') return <span className="ef-chip ef-chip-danger">Overdue</span>;
  return <span className="ef-chip">Pending</span>;
}

/** Visual fee-collection meter — shows "₹X collected out of ₹Y" as a progress bar. */
function CollectionMeter({ collected, expected }: { collected: number; expected: number }) {
  const pct = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0;
  const tone =
    pct >= 80 ? 'var(--color-success)' :
    pct >= 50 ? 'var(--color-warn)' :
    'var(--color-danger)';
  const remaining = Math.max(0, expected - collected);

  return (
    <Card variant="solid" className="overflow-hidden">
      <CardBody>
        <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
          <div>
            <div className="ef-eyebrow">This term · collection progress</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums tracking-tight">
                ₹{collected.toLocaleString()}
              </span>
              <span className="text-sm text-[var(--color-text-muted)] tabular-nums">
                / ₹{expected.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold tabular-nums tracking-tight" style={{ color: tone }}>
              {pct}%
            </div>
            <div className="text-xs text-[var(--color-text-muted)] mt-0.5 tabular-nums">
              ₹{remaining.toLocaleString()} outstanding
            </div>
          </div>
        </div>

        <div className="relative h-3 rounded-full bg-[var(--color-surface-muted)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${tone}aa, ${tone})`,
              boxShadow: `0 0 12px ${tone}66`,
            }}
          />
        </div>
      </CardBody>
    </Card>
  );
}
