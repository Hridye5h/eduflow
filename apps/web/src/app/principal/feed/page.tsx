'use client';
import { useEffect, useState } from 'react';
import { Megaphone, Pin, ThumbsUp, MessageCircle, FileText } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { api, session } from '@/lib/api';
import { FileUpload, type Attachment } from '@/components/ui/FileUpload';

const ACCENT = '#dc2626';

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

const POST_TYPES = ['ANNOUNCEMENT', 'NOTICE', 'EVENT'] as const;

const TYPE_TONE: Record<string, string> = {
  ANNOUNCEMENT: 'ef-chip-info',
  NOTICE: 'ef-chip-warn',
  EVENT: 'ef-chip-success',
};

export default function PrincipalFeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState({ type: 'ANNOUNCEMENT', title: '', body: '', pin: false });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [posting, setPosting] = useState(false);

  async function load() {
    try {
      const p = await api<Post[]>('/feed', { token: session.token(), subdomain: session.subdomain() });
      // Principal-only view: focus on school-wide posts (still show class posts further down)
      setPosts(p);
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPosting(true);
    try {
      await api('/feed', {
        method: 'POST',
        token: session.token(), subdomain: session.subdomain(),
        body: JSON.stringify({
          type: draft.type,
          scope: 'SCHOOL',
          sectionId: null,
          title: draft.title,
          body: draft.body,
          pin: draft.pin,
          attachments,
        }),
      });
      setDraft({ ...draft, title: '', body: '' });
      setAttachments([]);
      await load();
    } catch (e: any) { setErr(e.message); }
    finally { setPosting(false); }
  }

  async function togglePin(p: Post) {
    try {
      await api(`/feed/${p.id}/pin`, {
        method: 'PATCH',
        token: session.token(), subdomain: session.subdomain(),
        body: JSON.stringify({ pin: !p.isPinned }),
      });
      await load();
    } catch {}
  }

  const schoolPosts = posts.filter((p) => p.scope === 'SCHOOL');
  const classPosts = posts.filter((p) => p.scope === 'CLASS');

  return (
    <>
      <TopBar title="School announcements" eyebrow="Principal portal" />
      <div className="flex-1 p-6 space-y-5 max-w-3xl">
        {err && <Card className="p-4 text-sm text-[var(--color-danger)]">{err}</Card>}

        <Card variant="solid">
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                <Megaphone className="h-4 w-4" style={{ color: ACCENT }} /> Broadcast to the whole school
              </span>
            }
            subtitle="Posts go to every teacher, student, and parent."
          />
          <CardBody>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid sm:grid-cols-3 gap-3">
                <Select label="Type" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                  {POST_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </Select>
                <div className="sm:col-span-2">
                  <Input
                    label="Title"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    required
                    placeholder="e.g. Parent-Teacher Meet — June 2"
                  />
                </div>
              </div>
              <label className="block">
                <span className="ef-eyebrow block mb-1.5">Message</span>
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
                <Button type="submit" disabled={posting}>
                  {posting ? 'Posting…' : 'Publish announcement'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <FeedList title="School-wide posts" posts={schoolPosts} onPin={togglePin} />
        <FeedList title="Class-level posts (read-only)" posts={classPosts} onPin={togglePin} />
      </div>
    </>
  );
}

function FeedList({ title, posts, onPin }: { title: string; posts: Post[]; onPin: (p: Post) => void }) {
  return (
    <Card variant="solid">
      <CardHeader eyebrow="Feed" title={title} subtitle={`${posts.length} post${posts.length === 1 ? '' : 's'}`} />
      <CardBody className="p-0">
        {posts.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">Empty.</div>
        ) : (
          <ul>
            {posts.map((p) => (
              <li key={p.id} className="px-5 py-4 border-b last:border-0 border-[var(--color-border)]">
                <div className="flex items-start gap-3">
                  <div
                    className="h-9 w-9 rounded-full grid place-items-center font-semibold text-sm shrink-0"
                    style={{ background: `${ACCENT}10`, color: ACCENT }}
                  >
                    {p.author.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{p.author.name}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">· {new Date(p.createdAt).toLocaleString()}</span>
                      <span className={`ef-chip ${TYPE_TONE[p.type] ?? ''}`}>{p.type.replace('_', ' ')}</span>
                      {p.scope === 'SCHOOL' && <span className="ef-chip ef-chip-info">School-wide</span>}
                      {p.isPinned && <span className="ef-chip" style={{ background: `${ACCENT}10`, color: ACCENT, borderColor: 'transparent' }}><Pin className="h-3 w-3" /> Pinned</span>}
                    </div>
                    <h4 className="mt-1 font-semibold">{p.title}</h4>
                    <p className="text-sm text-[var(--color-text-muted)] whitespace-pre-wrap mt-1">{p.body}</p>
                    {p.attachmentsJson?.length ? (
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {p.attachmentsJson.map((a, i) => (
                          <li key={i}>
                            <a href={a.url} target="_blank" rel="noreferrer" className="ef-chip hover:bg-[var(--color-brand-soft)]">
                              <FileText className="h-3 w-3" /> {a.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="flex items-center gap-4 mt-3 text-sm text-[var(--color-text-muted)]">
                      <span className="inline-flex items-center gap-1.5"><ThumbsUp className="h-4 w-4" /> {p._count.reactions}</span>
                      <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /> {p._count.comments}</span>
                      <button onClick={() => onPin(p)} className="ml-auto inline-flex items-center gap-1 hover:text-[var(--color-text)]">
                        <Pin className="h-4 w-4" /> {p.isPinned ? 'Unpin' : 'Pin'}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
