'use client';
import { useCallback, useEffect, useState } from 'react';
import { IndianRupee, Send, CheckCircle2, Clock, Plus, RefreshCw } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api, session } from '@/lib/api';

const ACCENT = '#dc2626';

type Run = {
  id: string;
  studentId: string;
  amount: number;
  dueDate: string;
  toPhone: string;
  status: 'ACTIVE' | 'AWAITING_APPROVAL' | 'STOPPED' | 'PAID' | 'COMPLETED';
  stage: number;
  nextActionAt: string;
  updatedAt: string;
};
type Summary = { active: number; awaiting: number; paid: number; outstanding: number; total: number };

const STATUS_STYLE: Record<Run['status'], string> = {
  ACTIVE: 'bg-blue-50 text-blue-700',
  AWAITING_APPROVAL: 'bg-amber-50 text-amber-700',
  STOPPED: 'bg-gray-100 text-gray-600',
  PAID: 'bg-emerald-50 text-emerald-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
};

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const ymd = (s: string) => (s ? new Date(s).toISOString().slice(0, 10) : '');

export default function CollectionsPage() {
  const auth = { token: session.token(), subdomain: session.subdomain() };
  const [summary, setSummary] = useState<Summary | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ studentId: '', amount: '', dueDate: ymd(new Date().toISOString()), toPhone: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([
        api<Summary>('/dunning/summary', auth),
        api<Run[]>('/dunning', auth),
      ]);
      setSummary(s);
      setRuns(r);
      setErr(null);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, path: string, body?: any) {
    setBusy(id);
    try {
      await api(`/dunning/${id}/${path}`, {
        ...auth,
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      });
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function startRun(e: React.FormEvent) {
    e.preventDefault();
    setBusy('new');
    try {
      await api('/dunning/start', {
        ...auth,
        method: 'POST',
        body: JSON.stringify({
          studentId: form.studentId.trim(),
          amount: Number(form.amount),
          dueDate: form.dueDate,
          toPhone: form.toPhone.trim(),
        }),
      });
      setForm({ ...form, studentId: '', amount: '', toPhone: '' });
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  }

  const stats = [
    { label: 'Outstanding', value: summary ? inr(summary.outstanding) : '—', icon: IndianRupee },
    { label: 'Active reminders', value: summary?.active ?? '—', icon: Send },
    { label: 'Awaiting your approval', value: summary?.awaiting ?? '—', icon: Clock },
    { label: 'Collected', value: summary?.paid ?? '—', icon: CheckCircle2 },
  ];

  return (
    <div>
      <TopBar title="Collections" eyebrow="Smart Dunning — automated fee recovery" />

      <div className="p-4 sm:p-6 space-y-6">
        {err && <div className="rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">{err}</div>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardBody className="flex items-center gap-3">
                <span className="rounded-lg p-2" style={{ background: `${ACCENT}14`, color: ACCENT }}>
                  <s.icon size={18} />
                </span>
                <div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                  <div className="text-lg font-semibold">{s.value}</div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Start a reminder</h2>
            </div>
            <form onSubmit={startRun} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
              <Input label="Student ID" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required />
              <Input label="Amount (₹)" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              <Input label="Due date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
              <Input label="Parent phone" value={form.toPhone} onChange={(e) => setForm({ ...form, toPhone: e.target.value })} required />
              <Button type="submit" variant="primary" disabled={busy === 'new'}>
                <Plus size={16} className="inline -mt-0.5 mr-1" /> Start
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Active runs</h2>
              <Button variant="ghost" onClick={load} disabled={loading}>
                <RefreshCw size={15} className={`inline ${loading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </div>
            {loading ? (
              <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>
            ) : runs.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">No dunning runs yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-3">Student</th>
                      <th className="py-2 pr-3">Amount</th>
                      <th className="py-2 pr-3">Stage</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Next action</th>
                      <th className="py-2 pr-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-mono text-xs">{r.studentId.slice(0, 8)}…</td>
                        <td className="py-2 pr-3">{inr(r.amount)}</td>
                        <td className="py-2 pr-3">{r.stage}/5</td>
                        <td className="py-2 pr-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[r.status]}`}>
                            {r.status.replace('_', ' ').toLowerCase()}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-gray-500">{ymd(r.nextActionAt)}</td>
                        <td className="py-2 pr-3">
                          <div className="flex gap-2 justify-end">
                            {r.status === 'AWAITING_APPROVAL' && (
                              <Button variant="primary" disabled={busy === r.id} onClick={() => act(r.id, 'approve')}>
                                Approve send
                              </Button>
                            )}
                            {(r.status === 'ACTIVE' || r.status === 'AWAITING_APPROVAL') && (
                              <>
                                <Button variant="ghost" disabled={busy === r.id} onClick={() => act(r.id, 'paid')}>
                                  Mark paid
                                </Button>
                                <Button variant="ghost" disabled={busy === r.id} onClick={() => act(r.id, 'stop', { detail: 'stopped by owner' })}>
                                  Stop
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
