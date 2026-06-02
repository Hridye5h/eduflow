'use client';
import { useEffect, useState } from 'react';
import { Bell, Check, Megaphone } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { api, session } from '@/lib/api';

const ACCENT = '#dc2626';

type Notif = {
  id: string; type: string; title: string; body: string;
  readAt: string | null; createdAt: string;
};

export default function PrincipalInboxPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [err, setErr] = useState<string | null>(null);
  const [broadcast, setBroadcast] = useState({ audience: 'ALL', title: '', body: '' });
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const list = await api<Notif[]>(`/notifications?unread=${tab === 'unread'}`, {
        token: session.token(), subdomain: session.subdomain(),
      });
      setItems(list);
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, [tab]);

  async function readOne(id: string) {
    await api(`/notifications/${id}/read`, { method: 'PATCH', token: session.token(), subdomain: session.subdomain() });
    await load();
  }
  async function readAll() {
    await api(`/notifications/read-all`, { method: 'POST', token: session.token(), subdomain: session.subdomain() });
    await load();
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api<{ sent: number }>('/notifications/broadcast', {
        method: 'POST',
        token: session.token(), subdomain: session.subdomain(),
        body: JSON.stringify(broadcast),
      });
      setBroadcast({ ...broadcast, title: '', body: '' });
      alert(`Sent to ${r.sent} recipients.`);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <TopBar title="Inbox & broadcast" eyebrow="Principal portal" />
      <div className="flex-1 p-6 space-y-5 max-w-3xl">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        <Card variant="solid">
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                <Megaphone className="h-4 w-4" style={{ color: ACCENT }} /> Broadcast notification
              </span>
            }
            subtitle="Push to every user (or filter by role)."
          />
          <CardBody>
            <form onSubmit={send} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <Select label="Audience" value={broadcast.audience} onChange={(e) => setBroadcast({ ...broadcast, audience: e.target.value })}>
                  <option value="ALL">Everyone</option>
                  <option value="TEACHER">All teachers</option>
                  <option value="PARENT">All parents</option>
                  <option value="STUDENT">All students</option>
                </Select>
                <Input
                  label="Title"
                  value={broadcast.title}
                  onChange={(e) => setBroadcast({ ...broadcast, title: e.target.value })}
                  required
                />
              </div>
              <label className="block">
                <span className="ef-eyebrow block mb-1.5">Message</span>
                <textarea
                  className="ef-input min-h-[5rem]"
                  value={broadcast.body}
                  onChange={(e) => setBroadcast({ ...broadcast, body: e.target.value })}
                  required
                />
              </label>
              <Button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send broadcast'}</Button>
            </form>
          </CardBody>
        </Card>

        <Card variant="solid">
          <CardHeader
            eyebrow="Inbox"
            title={`Your notifications`}
            subtitle={`${items.length} ${tab === 'unread' ? 'unread' : 'total'}`}
            right={
              <div className="flex gap-2 items-center">
                <div className="flex gap-1 p-1 bg-[var(--color-surface-muted)] rounded-lg text-xs">
                  {(['all', 'unread'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-3 py-1 rounded-md font-semibold capitalize transition-colors ${
                        tab === t ? 'bg-white shadow-sm text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <Button variant="outline" onClick={readAll}><Check className="h-4 w-4" /> Mark all read</Button>
              </div>
            }
          />
          <CardBody className="p-0">
            {items.length === 0 ? (
              <div className="p-10 text-center text-[var(--color-text-muted)] flex flex-col items-center gap-2">
                <Bell className="h-6 w-6" />
                <p>Nothing here.</p>
              </div>
            ) : (
              <ul>
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={`px-5 py-4 border-b last:border-0 border-[var(--color-border)] flex items-start gap-3 ${n.readAt ? '' : 'bg-[var(--color-brand-soft)]/40'}`}
                  >
                    <div className={`h-2 w-2 rounded-full mt-2 shrink-0`} style={{ background: n.readAt ? 'transparent' : ACCENT }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="ef-chip">{n.type.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-[var(--color-text-muted)]">{new Date(n.createdAt).toLocaleString()}</span>
                      </div>
                      <h4 className="font-medium mt-1">{n.title}</h4>
                      <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{n.body}</p>
                    </div>
                    {!n.readAt && (
                      <Button variant="ghost" onClick={() => readOne(n.id)}><Check className="h-4 w-4" /></Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
