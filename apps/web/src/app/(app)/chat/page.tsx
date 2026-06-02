'use client';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, CardHeader } from '@/components/ui/Card';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { api, session } from '@/lib/api';
import { Send, Hash, Lock } from 'lucide-react';

type Group = {
  id: string;
  name: string | null;
  scope: 'GROUP' | 'DIRECT';
  studentToStudent: boolean;
  section?: { class?: { label: string }, name: string } | null;
};
type Message = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; role: string };
};

const SOCKET_URL = (process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4001') + '/chat';

export default function ChatPage() {
  const me = session.user();
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // load groups
  useEffect(() => {
    api<Group[]>('/chat/groups', { token: session.token(), subdomain: session.subdomain() })
      .then((g) => { setGroups(g); if (g.length && !activeId) setActiveId(g[0].id); })
      .catch((e) => setErr(e.message));
  }, []);

  // connect socket once
  useEffect(() => {
    const s = io(SOCKET_URL, { auth: { token: session.token() } });
    socketRef.current = s;
    s.on('message', (msg: Message) => {
      setMessages((m) => [...m, msg]);
    });
    return () => { s.disconnect(); };
  }, []);

  // join group + load history
  useEffect(() => {
    if (!activeId || !socketRef.current) return;
    socketRef.current.emit('joinGroup', activeId);

    api<Message[]>(`/chat/groups/${activeId}/messages`, {
      token: session.token(), subdomain: session.subdomain(),
    })
      .then((m) => setMessages(m.reverse()))
      .catch((e) => setErr(e.message));

    return () => { socketRef.current?.emit('leaveGroup', activeId); };
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!draft.trim() || !activeId) return;
    socketRef.current?.emit('sendMessage', { groupId: activeId, body: draft.trim() });
    setDraft('');
  }

  const active = groups.find((g) => g.id === activeId);

  return (
    <>
      <TopBar title="Class chat" />
      <div className="flex-1 flex min-h-0">
        <aside className="w-72 border-r border-[var(--color-border)] bg-[var(--color-surface)] overflow-y-auto">
          <div className="px-4 py-3 text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)]">
            Groups
          </div>
          <ul>
            {groups.map((g) => {
              const active = g.id === activeId;
              return (
                <li key={g.id}>
                  <button
                    onClick={() => setActiveId(g.id)}
                    className={`w-full text-left px-4 py-2.5 flex items-start gap-2.5 transition-colors ${active ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]' : 'hover:bg-[var(--color-surface-muted)]'}`}
                  >
                    {g.scope === 'DIRECT'
                      ? <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                      : <Hash className="h-4 w-4 mt-0.5 shrink-0" />}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{g.name || 'Direct message'}</div>
                      {g.section && (
                        <div className="text-xs text-[var(--color-text-muted)] truncate">
                          {g.section.class?.label} · {g.section.name}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
            {groups.length === 0 && (
              <li className="px-4 py-6 text-sm text-[var(--color-text-muted)]">No groups yet.</li>
            )}
          </ul>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          {err && <div className="bg-[var(--color-danger-soft)] text-[var(--color-danger)] px-5 py-2 text-sm">{err}</div>}

          {active && (
            <div className="border-b border-[var(--color-border)] px-6 py-3 bg-[var(--color-surface)]">
              <div className="font-semibold">{active.name || 'Direct message'}</div>
              {active.section && (
                <div className="text-xs text-[var(--color-text-muted)]">
                  {active.section.class?.label} · Section {active.section.name}
                </div>
              )}
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-sm text-[var(--color-text-muted)] py-10">No messages yet.</div>
            ) : messages.map((m) => {
              const mine = m.author.id === me?.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-md px-3 py-2 rounded-2xl text-sm ${mine ? 'bg-[var(--color-brand)] text-white' : 'bg-white border border-[var(--color-border)]'}`}>
                    {!mine && <div className="text-xs font-medium opacity-80 mb-0.5">{m.author.name}</div>}
                    <div className="whitespace-pre-wrap">{m.body}</div>
                    <div className={`text-[10px] mt-1 ${mine ? 'opacity-80' : 'text-[var(--color-text-subtle)]'}`}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {activeId && (
            <form onSubmit={send} className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3 flex gap-2">
              <input
                className="ef-input flex-1"
                placeholder="Type a message…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <Button type="submit" disabled={!draft.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
