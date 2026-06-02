'use client';
import { useEffect, useMemo, useState } from 'react';
import { Wallet, IndianRupee, Receipt, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api, session } from '@/lib/api';
import { useChildren } from '@/lib/use-children';
import { ChildHeader } from '@/components/parent/ChildHeader';

const ACCENT = '#0d9488';

type Payment = {
  id: string;
  amountPaid: number;
  status: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE';
  paidAt: string | null;
  txnRef: string | null;
  receiptUrl: string | null;
  structure: {
    id: string;
    name: string;
    amount: number;
    dueDate: string | null;
    isMandatory: boolean;
  };
};

export default function ParentFeesPage() {
  const { children, activeChild, activeChildId, setActiveChildId } = useChildren();
  const [items, setItems] = useState<Payment[]>([]);

  useEffect(() => {
    if (!activeChildId) return;
    api<Payment[]>(`/fees/student/${activeChildId}`, {
      token: session.token(), subdomain: session.subdomain(),
    }).then(setItems).catch(() => setItems([]));
  }, [activeChildId]);

  const totals = useMemo(() => {
    const now = new Date();
    let paid = 0, due = 0, overdue = 0, expected = 0;
    for (const p of items) {
      expected += p.structure.amount;
      paid += p.amountPaid;
      const isOverdue = p.status !== 'PAID' && p.structure.dueDate && new Date(p.structure.dueDate) < now;
      if (p.status !== 'PAID') {
        due += p.structure.amount - p.amountPaid;
        if (isOverdue) overdue += p.structure.amount - p.amountPaid;
      }
    }
    return { paid, due, overdue, expected };
  }, [items]);

  const outstanding = items.filter((p) => p.status !== 'PAID');
  const history = items.filter((p) => p.amountPaid > 0);

  return (
    <>
      <TopBar title="Fees" eyebrow="Parent portal" />
      <div className="flex-1 p-6 space-y-5 max-w-4xl">
        <ChildHeader children={children} active={activeChild} onSwitch={setActiveChildId} />

        {!activeChild ? null : (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <BigStat
                label="Outstanding"
                value={`₹${totals.due.toLocaleString()}`}
                icon={<AlertTriangle className="h-5 w-5" />}
                tone={totals.due > 0 ? 'warn' : 'success'}
              />
              <BigStat
                label="Overdue"
                value={`₹${totals.overdue.toLocaleString()}`}
                icon={<AlertTriangle className="h-5 w-5" />}
                tone={totals.overdue > 0 ? 'danger' : 'success'}
              />
              <BigStat label="Paid this year" value={`₹${totals.paid.toLocaleString()}`} icon={<Receipt className="h-5 w-5" />} tone="success" />
              <BigStat label="Expected" value={`₹${totals.expected.toLocaleString()}`} icon={<IndianRupee className="h-5 w-5" />} />
            </section>

            <Card variant="solid">
              <CardHeader
                eyebrow={outstanding.length ? 'Pay these' : 'All clear'}
                title={outstanding.length ? `${outstanding.length} outstanding item${outstanding.length === 1 ? '' : 's'}` : 'No outstanding fees'}
                subtitle={
                  outstanding.length
                    ? 'Visit the school office to pay; receipts are recorded by the principal.'
                    : `${activeChild.student.name.split(' ')[0]}'s fees are fully paid.`
                }
              />
              <CardBody className="p-0">
                {outstanding.length === 0 ? (
                  <div className="p-8 text-center text-[var(--color-text-muted)] flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-6 w-6 text-[var(--color-success)]" />
                    <p>All fees paid.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-text-subtle)]">
                        <th className="px-5 py-3">Item</th>
                        <th className="px-5 py-3">Due</th>
                        <th className="px-5 py-3 text-right">Total</th>
                        <th className="px-5 py-3 text-right">Paid</th>
                        <th className="px-5 py-3 text-right">Remaining</th>
                        <th className="px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outstanding.map((p) => {
                        const remaining = p.structure.amount - p.amountPaid;
                        const dueDate = p.structure.dueDate ? new Date(p.structure.dueDate) : null;
                        const daysOverdue = dueDate
                          ? Math.floor((Date.now() - dueDate.getTime()) / 86_400_000)
                          : null;
                        const overdue = daysOverdue !== null && daysOverdue > 0;
                        return (
                          <tr key={p.id} className="border-b last:border-0 border-[var(--color-border)]">
                            <td className="px-5 py-3 font-medium">{p.structure.name}</td>
                            <td className="px-5 py-3 text-[var(--color-text-muted)]">
                              {dueDate ? (
                                <div>
                                  <div>{dueDate.toLocaleDateString()}</div>
                                  {overdue && (
                                    <div className="text-xs font-semibold mt-0.5" style={{ color: 'var(--color-danger)' }}>
                                      {daysOverdue} day{daysOverdue === 1 ? '' : 's'} overdue
                                    </div>
                                  )}
                                </div>
                              ) : '—'}
                            </td>
                            <td className="px-5 py-3 text-right tabular-nums">₹{p.structure.amount.toLocaleString()}</td>
                            <td className="px-5 py-3 text-right tabular-nums text-[var(--color-success)]">₹{p.amountPaid.toLocaleString()}</td>
                            <td className="px-5 py-3 text-right tabular-nums font-semibold">₹{remaining.toLocaleString()}</td>
                            <td className="px-5 py-3">
                              <StatusChip status={overdue && p.status !== 'PAID' ? 'OVERDUE' : p.status} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardBody>
            </Card>

            {history.length > 0 && (
              <Card variant="solid">
                <CardHeader eyebrow="History" title="Payments made" subtitle={`${history.length} payment${history.length === 1 ? '' : 's'}`} />
                <CardBody className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-text-subtle)]">
                        <th className="px-5 py-3">Item</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Reference</th>
                        <th className="px-5 py-3 text-right">Amount</th>
                        <th className="px-5 py-3 w-32">Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((p) => (
                        <tr key={p.id} className="border-b last:border-0 border-[var(--color-border)]">
                          <td className="px-5 py-3 font-medium">{p.structure.name}</td>
                          <td className="px-5 py-3 text-[var(--color-text-muted)]">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</td>
                          <td className="px-5 py-3 text-[var(--color-text-muted)] font-mono text-xs">{p.txnRef || '—'}</td>
                          <td className="px-5 py-3 text-right tabular-nums">₹{p.amountPaid.toLocaleString()}</td>
                          <td className="px-5 py-3">
                            {p.receiptUrl ? (
                              <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="ef-btn ef-btn-ghost text-xs">
                                <Receipt className="h-3 w-3" /> Open
                              </a>
                            ) : (
                              <span className="text-xs text-[var(--color-text-muted)]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}

function StatusChip({ status }: { status: string }) {
  if (status === 'PAID')    return <span className="ef-chip ef-chip-success">Paid</span>;
  if (status === 'PARTIAL') return <span className="ef-chip ef-chip-warn">Partial</span>;
  if (status === 'OVERDUE') return <span className="ef-chip ef-chip-danger">Overdue</span>;
  return <span className="ef-chip">Pending</span>;
}

function BigStat({
  label, value, icon, tone,
}: { label: string; value: React.ReactNode; icon: React.ReactNode; tone?: 'success' | 'warn' | 'danger' }) {
  const cls = tone === 'success' ? 'text-[var(--color-success)]'
    : tone === 'warn'   ? 'text-[var(--color-warn)]'
    : tone === 'danger' ? 'text-[var(--color-danger)]'
    : 'text-[var(--color-text)]';
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="ef-eyebrow">{label}</div>
        <span className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: `${ACCENT}10`, color: ACCENT }}>
          {icon}
        </span>
      </div>
      <div className={`mt-3 text-2xl font-bold tabular-nums tracking-tight ${cls}`}>{value}</div>
    </Card>
  );
}
