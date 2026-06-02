'use client';
import { useEffect, useState } from 'react';
import { Pin, ThumbsUp, MessageCircle, FileText, MessageSquare } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api, session } from '@/lib/api';
import type { Attachment } from '@/components/ui/FileUpload';

const ACCENT = '#2563eb';

type Post = {
  id: string;
  type: string;
  scope: 'CLASS' | 'SCHOOL';
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: string;
  attachmentsJson: Attachment[] | null;
  author: { id: string; name: string; role: string };
  _count: { comments: number; reactions: number };
};

const TYPE_TONE: Record<string, string> = {
  ANNOUNCEMENT: 'ef-chip-info',
  HOMEWORK: 'ef-chip-brand',
  NOTICE: 'ef-chip-warn',
  EVENT: 'ef-chip-success',
  TEST_REMINDER: 'ef-chip-warn',
  ASSIGNMENT: 'ef-chip-brand',
};

export default function StudentFeedPage() {
  const me = session.user();
  const [posts, setPosts] = useState<Post[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [reactingId, setReactingId] = useState<string | null>(null);

  async function load() {
    try {
      const list = await api<Post[]>('/feed', { token: session.token(), subdomain: session.subdomain() });
      setPosts(list);
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function react(id: string) {
    setReactingId(id);
    try {
      await api(`/feed/${id}/react`, {
        method: 'POST',
        token: session.token(), subdomain: session.subdomain(),
        body: JSON.stringify({}),
      });
      await load();
    } catch {}
    finally { setReactingId(null); }
  }

  return (
    <>
      <TopBar title="Class wall" eyebrow="Student portal" />
      <div className="flex-1 p-6 space-y-3 max-w-3xl">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        {posts.length === 0 && (
          <Card variant="solid" className="p-10 text-center text-[var(--color-text-muted)] flex flex-col items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            <p>The wall is quiet right now.</p>
          </Card>
        )}

        {posts.map((p) => (
          <Card variant="solid" key={p.id}>
            <CardBody>
              <div className="flex items-start gap-3">
                <div
                  className="h-9 w-9 rounded-full grid place-items-center font-semibold text-sm shrink-0"
                  style={{ background: `${ACCENT}10`, color: ACCENT }}
                >
                  {p.author.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[var(--color-text)]">{p.author.name}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">· {new Date(p.createdAt).toLocaleString()}</span>
                    <span className={`ef-chip ${TYPE_TONE[p.type] ?? ''}`}>{p.type.replace('_', ' ')}</span>
                    {p.scope === 'SCHOOL' && <span className="ef-chip ef-chip-info">School-wide</span>}
                    {p.isPinned && (
                      <span className="ef-chip" style={{ background: `${ACCENT}10`, color: ACCENT, borderColor: 'transparent' }}>
                        <Pin className="h-3 w-3" /> Pinned
                      </span>
                    )}
                  </div>
                  <h4 className="mt-1 font-semibold">{p.title}</h4>
                  <p className="text-sm text-[var(--color-text-muted)] whitespace-pre-wrap mt-1">{p.body}</p>

                  {p.attachmentsJson?.length ? (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {p.attachmentsJson.map((a, i) => (
                        <li key={i}>
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="ef-chip hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand)]"
                          >
                            <FileText className="h-3 w-3" /> {a.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="flex items-center gap-4 mt-3 text-sm text-[var(--color-text-muted)]">
                    <button
                      onClick={() => react(p.id)}
                      disabled={reactingId === p.id}
                      className="inline-flex items-center gap-1.5 hover:text-[var(--color-text)] transition-colors"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      {p._count.reactions}
                    </button>
                    <span className="inline-flex items-center gap-1.5">
                      <MessageCircle className="h-4 w-4" />
                      {p._count.comments}
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
