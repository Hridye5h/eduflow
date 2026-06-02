'use client';
import { useEffect, useState } from 'react';
import { api, session } from './api';

export type Child = {
  parentLinkId: string;
  relation: string | null;
  student: {
    id: string;
    name: string;
    rollNumber: string | null;
    email: string | null;
    section: {
      id: string;
      name: string;
      class: { id: string; label: string; grade: number };
      classTeacher: { id: string; name: string; email: string | null } | null;
    } | null;
  };
};

/**
 * Parent-portal hook: loads linked children and exposes the currently-
 * active one. For pilot seed data every parent has exactly one child,
 * so default behaviour is "first child = active". The switcher state
 * is local — page-level (i.e. resets on navigation). Good enough until
 * we add a real layout-level store.
 */
export function useChildren() {
  const [children, setChildren] = useState<Child[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<Child[]>('/auth/me/children', {
      token: session.token(),
      subdomain: session.subdomain(),
    })
      .then((list) => {
        if (cancelled) return;
        setChildren(list);
        if (list.length) setActiveChildId(list[0].student.id);
        setLoading(false);
      })
      .catch((e) => { if (!cancelled) { setErr(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const activeChild = children.find((c) => c.student.id === activeChildId) ?? null;

  return { children, activeChild, activeChildId, setActiveChildId, loading, err };
}
