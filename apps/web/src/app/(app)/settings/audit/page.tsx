'use client';
import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { TopBar } from '@/components/layout/TopBar';
import { api, session } from '@/lib/api';

type Entry = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  diffJson: any;
  ip: string | null;
  createdAt: string;
  actor: { id: string; name: string; role: string } | null;
};

export default function AuditPage() {
  const [items, setItems] = useState<Entry[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<Entry[]>('/admin/audit?limit=200', {
      token: session.token(), subdomain: session.subdomain(),
    }).then(setItems).catch((e) => setErr(e.message));
  }, []);

  return (
    <>
      <TopBar title="Audit log" />
      <div className="flex-1 p-6 max-w-4xl space-y-5">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        <Card>
          <CardHeader title={`${items.length} recent events`} subtitle="Append-only — every meaningful change is recorded" />
          <CardBody className="p-0">
            {items.length === 0 ? (
              <div className="p-10 text-center text-[var(--color-text-muted)]">No activity yet.</div>
            ) : (
              <ul>
                {items.map((e) => (
                  <li key={e.id} className="px-5 py-3 border-b last:border-0 border-[var(--color-border)] flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{e.action}</span>
                        <span className="ef-chip">{e.entity}</span>
                        <span className="text-xs text-[var(--color-text-muted)]">{new Date(e.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="text-sm text-[var(--color-text-muted)] mt-1">
                        {e.actor ? `${e.actor.name} (${e.actor.role})` : 'System'}
                        {e.entityId && <> · <code className="text-xs">{e.entityId.slice(0, 8)}</code></>}
                        {e.ip && <> · {e.ip}</>}
                      </div>
                    </div>
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
