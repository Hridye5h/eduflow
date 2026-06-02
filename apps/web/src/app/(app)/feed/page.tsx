'use client';
import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { api, session } from '@/lib/api';
import { Pin, ThumbsUp, MessageCircle, Megaphone, FileText } from 'lucide-react';
import { FileUpload, type Attachment } from '@/components/ui/FileUpload';

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

type SectionLite = { id: string; name: string };
type ClassRow = { id: string; label: string; sections: SectionLite[] };

const POST_TYPES = ['ANNOUNCEMENT', 'HOMEWORK', 'NOTICE', 'EVENT', 'TEST_REMINDER', 'ASSIGNMENT'] as const;

const TYPE_TONE: Record<string, string> = {
  ANNOUNCEMENT: 'ef-chip-info',
  HOMEWORK: 'ef-chip-brand',
  NOTICE: 'ef-chip-warn',
  EVENT: 'ef-chip-success',
  TEST_REMINDER: 'ef-chip-warn',
  ASSIGNMENT: 'ef-chip-brand',
};

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [draft, setDraft] = useState({
    type: 'ANNOUNCEMENT',
    scope: 'SCHOOL' as 'CLASS' | 'SCHOOL',
    sectionId: '',
    title: '',
    body: '',
    pin: false,
  });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [posting, setPosting] = useState(false);

  async function load() {
    try {
      const [p, c] = await Promise.all([
        api<Post[]>('/feed', { token: session.token(), subdomain: session.subdomain() }),
        api<ClassRow[]>('/classes', { token: session.token(), subdomain: session.subdomain() }),
      ]);
      setPosts(p);
      setClasses(c);
    } catch (e: any) {
      setErr(e.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPosting(true);
    try {
      await api('/feed', {
        method: 'POST',
        token: session.token(),
        subdomain: session.subdomain(),
        body: JSON.stringify({
          type: draft.type,
          scope: draft.scope,
          sectionId: draft.scope === 'CLASS' ? draft.sectionId : null,
          title: draft.title,
          body: draft.body,
          pin: draft.pin,
          attachments,
        }),
      });
      setDraft({ ...draft, title: '', body: '' });
      setAttachments([]);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setPosting(false);
    }
  }

  async function react(postId: string) {
    try {
      await api(`/feed/${postId}/react`, {
        method: 'POST',
        token: session.token(),
        subdomain: session.subdomain(),
        body: JSON.stringify({}),
      });
      await load();
    } catch {}
  }

  async function togglePin(p: Post) {
    try {
      await api(`/feed/${p.id}/pin`, {
        method: 'PATCH',
        token: session.token(),
        subdomain: session.subdomain(),
        body: JSON.stringify({ pin: !p.isPinned }),
      });
      await load();
    } catch {}
  }

  return (
    <>
      <TopBar title="Class wall" />
      <div className="flex-1 p-6 space-y-5 max-w-3xl">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        <Card>
          <CardHeader
            title={<span className="inline-flex items-center gap-2"><Megaphone className="h-4 w-4 text-[var(--color-brand)]" /> Post an update</span>}
            subtitle="Announcements, homework, notices, events…"
          />
          <CardBody>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid sm:grid-cols-3 gap-3">
                <Select label="Type" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                  {POST_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace('_', ' ')}</option>
                  ))}
                </Select>
                <Select label="Scope" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as any })}>
                  <option value="SCHOOL">School-wide</option>
                  <option value="CLASS">Single section</option>
                </Select>
                {draft.scope === 'CLASS' && (
                  <Select label="Section" value={draft.sectionId} onChange={(e) => setDraft({ ...draft, sectionId: e.target.value })}>
                    <option value="">Select…</option>
                    {classes.flatMap((c) => c.sections.map((s) => (
                      <option key={s.id} value={s.id}>{c.label} · {s.name}</option>
                    )))}
                  </Select>
                )}
              </div>
              <Input
                label="Title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                required
                placeholder="e.g. Math homework — Chapter 7"
              />
              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)] mb-1.5">Body</span>
                <textarea
                  className="ef-input min-h-[6rem] resize-y"
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  required
                />
              </label>
              <FileUpload value={attachments} onChange={setAttachments} label="Attachments" />
              <div className="flex items-center justify-between">
                <label className="text-sm text-[var(--color-text-muted)] inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.pin}
                    onChange={(e) => setDraft({ ...draft, pin: e.target.checked })}
                  />
                  Pin to top
                </label>
                <Button type="submit" disabled={posting}>{posting ? 'Posting…' : 'Publish'}</Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <div className="space-y-3">
          {posts.length === 0 && (
            <Card className="p-8 text-center text-[var(--color-text-muted)]">
              The wall is quiet. Be the first to post.
            </Card>
          )}
          {posts.map((p) => (
            <Card key={p.id}>
              <CardBody>
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-[var(--color-brand-soft)] grid place-items-center text-[var(--color-brand)] font-semibold text-sm shrink-0">
                    {p.author.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-[var(--color-text)]">{p.author.name}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">· {new Date(p.createdAt).toLocaleString()}</span>
                      <span className={`ef-chip ${TYPE_TONE[p.type] ?? ''}`}>{p.type.replace('_', ' ')}</span>
                      {p.scope === 'SCHOOL' && <span className="ef-chip ef-chip-info">School-wide</span>}
                      {p.isPinned && <span className="ef-chip ef-chip-brand"><Pin className="h-3 w-3" /> Pinned</span>}
                    </div>
                    <h4 className="mt-1 font-semibold text-[var(--color-text)]">{p.title}</h4>
                    <p className="text-sm text-[var(--color-text-muted)] whitespace-pre-wrap mt-1">{p.body}</p>

                    {p.attachmentsJson && p.attachmentsJson.length > 0 && (
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
                    )}

                    <div className="flex items-center gap-4 mt-3 text-sm text-[var(--color-text-muted)]">
                      <button onClick={() => react(p.id)} className="inline-flex items-center gap-1.5 hover:text-[var(--color-brand)]">
                        <ThumbsUp className="h-4 w-4" />
                        {p._count.reactions}
                      </button>
                      <span className="inline-flex items-center gap-1.5">
                        <MessageCircle className="h-4 w-4" />
                        {p._count.comments}
                      </span>
                      <button onClick={() => togglePin(p)} className="ml-auto inline-flex items-center gap-1 hover:text-[var(--color-text)]">
                        <Pin className="h-4 w-4" /> {p.isPinned ? 'Unpin' : 'Pin'}
                      </button>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
