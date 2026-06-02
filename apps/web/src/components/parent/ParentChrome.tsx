'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, AlertTriangle, X, ArrowRight } from 'lucide-react';
import { api, session } from '@/lib/api';
import { useChildren } from '@/lib/use-children';

const ACCENT = '#0d9488';

/**
 * Layout-level chrome for the parent portal:
 *  - Pending-fees banner pinned at the very top (dismissable per session)
 *  - "Message Class Teacher" floating action button (FAB) at bottom-right
 *
 * Rendered once from /parent/layout.tsx so every parent page gets both.
 */
export function ParentChrome() {
  const { activeChild } = useChildren();
  const router = useRouter();
  const pathname = usePathname();

  const [outstandingDue, setOutstandingDue] = useState<number>(0);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  const childId = activeChild?.student.id ?? null;
  const teacher = activeChild?.student.section?.classTeacher;

  useEffect(() => {
    // Honor a session-scoped dismiss for the banner
    if (typeof window !== 'undefined') {
      setBannerDismissed(sessionStorage.getItem('ef.parent.feesBannerDismissed') === '1');
    }
  }, []);

  // Refresh fee total whenever the active child changes
  useEffect(() => {
    if (!childId) { setOutstandingDue(0); return; }
    api<any[]>(`/fees/student/${childId}`, {
      token: session.token(),
      subdomain: session.subdomain(),
    })
      .then((fees) => {
        const total = fees
          .filter((f) => f.status !== 'PAID')
          .reduce((a, f) => a + (f.structure?.amount ?? 0) - (f.amountPaid ?? 0), 0);
        setOutstandingDue(total);
      })
      .catch(() => setOutstandingDue(0));
  }, [childId]);

  function dismissBanner() {
    setBannerDismissed(true);
    sessionStorage.setItem('ef.parent.feesBannerDismissed', '1');
  }

  async function openTeacherDm() {
    if (!teacher?.id) return;
    setBusy(true);
    try {
      const group = await api<{ id: string }>(`/chat/direct/${teacher.id}`, {
        method: 'POST',
        token: session.token(),
        subdomain: session.subdomain(),
      });
      // Land on /parent/chat — the chat page will pick up the new DM group
      router.push('/parent/chat');
    } catch (e) {
      // Fallback: just open the chat list
      router.push('/parent/chat');
    } finally {
      setBusy(false);
    }
  }

  const onChatPage = pathname?.startsWith('/parent/chat');
  const onFeesPage = pathname?.startsWith('/parent/fees');

  return (
    <>
      {/* Pending fees banner — non-dismissable for whole-app; per-session dismiss only */}
      {outstandingDue > 0 && !bannerDismissed && !onFeesPage && (
        <div
          className="border-b border-[var(--color-warn)]/30"
          style={{
            background: 'linear-gradient(90deg, rgba(217,119,6,0.10), rgba(220,38,38,0.10))',
          }}
        >
          <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center gap-3 text-sm">
            <span
              className="h-7 w-7 rounded-lg grid place-items-center shrink-0"
              style={{ background: 'rgba(217,119,6,0.15)', color: 'var(--color-warn)' }}
            >
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-[var(--color-text)]">
                Fees due — ₹{outstandingDue.toLocaleString()} outstanding
              </span>
              {activeChild?.student?.name && (
                <span className="text-[var(--color-text-muted)] ml-1.5">
                  for {activeChild.student.name.split(' ')[0]}
                </span>
              )}
            </div>
            <Link
              href="/parent/fees"
              className="ef-btn ef-btn-outline text-xs py-1.5 px-3"
            >
              View <ArrowRight className="h-3 w-3" />
            </Link>
            <button
              onClick={dismissBanner}
              className="h-7 w-7 grid place-items-center rounded-md hover:bg-white/60 text-[var(--color-text-muted)]"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Message-Class-Teacher FAB */}
      {!onChatPage && teacher?.id && (
        <button
          onClick={openTeacherDm}
          disabled={busy}
          className="fixed bottom-6 right-6 z-[80] group flex items-center gap-2.5 pl-3.5 pr-5 py-3 rounded-full font-semibold text-sm transition-all"
          style={{
            background: `linear-gradient(135deg, ${ACCENT}, #06b6d4)`,
            color: '#fff',
            boxShadow: `0 12px 30px ${ACCENT}55, 0 4px 10px rgba(15,23,42,0.12)`,
          }}
          title={`Message ${teacher.name}`}
        >
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">
            Message {teacher.name.split(' ')[0]}
          </span>
          <span className="sm:hidden">Teacher</span>
        </button>
      )}
    </>
  );
}
