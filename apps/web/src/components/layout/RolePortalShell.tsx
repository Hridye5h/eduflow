'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronRight, Menu, X } from 'lucide-react';
import { api, session } from '@/lib/api';
import { portalForRole, type Role, type RolePortal } from '@/lib/role-config';
import { PremiumLoader } from '@/components/common/PremiumLoader';
import { PageTransition } from '@/components/layout/PageTransition';

/**
 * Role-aware portal shell.
 *
 *   <RolePortalShell role="SUPER_ADMIN">
 *     {children}
 *   </RolePortalShell>
 *
 * - Verifies the logged-in user matches the required role; otherwise either
 *   redirects to their own portal or to /login.
 * - Renders the role-coded sidebar (desktop) or top-bar + drawer (mobile) plus
 *   the content area. The notification poll is owned here so the desktop nav and
 *   the mobile drawer share a single source of truth.
 */
export function RolePortalShell({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const token = session.token();
    if (!token) {
      router.replace('/login');
      return;
    }
    const u = session.user();
    if (!u) {
      router.replace('/login');
      return;
    }
    if (u.role !== role) {
      // Send the user to their correct portal — not a hard rejection.
      const correct = portalForRole(u.role);
      router.replace(correct.defaultRoute);
      return;
    }
    setUser(u);
    setReady(true);
  }, [role, router]);

  useEffect(() => {
    if (!ready) return;
    function poll() {
      api<{ count: number }>('/notifications/unread-count', {
        token: session.token(),
        subdomain: session.subdomain(),
      })
        .then((r) => setUnread(r.count))
        .catch(() => {});
    }
    poll();
    const t = setInterval(poll, 30_000);
    return () => clearInterval(t);
  }, [ready]);

  if (!ready || !user) return <PremiumLoader />;

  const portal = portalForRole(role);
  const schoolName = session.subdomain() ?? undefined;

  return (
    <div className="min-h-screen flex">
      <PortalSidebar portal={portal} schoolName={schoolName} unread={unread} />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileNav portal={portal} schoolName={schoolName} unread={unread} />
        <PageTransition>{children}</PageTransition>
      </div>
    </div>
  );
}

// =====================================================================
// Shared nav links — rendered identically in the desktop sidebar and the
// mobile drawer so the two can never drift.
// =====================================================================
function NavLinks({
  portal,
  unread,
  onNavigate,
}: {
  portal: RolePortal;
  unread: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <>
      {portal.nav.map(({ href, label, icon: Icon, badge }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all
              ${active
                ? 'text-[var(--color-text)] font-semibold'
                : 'text-[var(--color-text-muted)] hover:bg-white/70 hover:text-[var(--color-text)]'}`}
            style={
              active
                ? {
                    background: `linear-gradient(90deg, ${portal.accent}18 0%, transparent 100%)`,
                    boxShadow: `inset 3px 0 0 ${portal.accent}`,
                  }
                : undefined
            }
          >
            <Icon
              className="h-[18px] w-[18px]"
              strokeWidth={active ? 2.4 : 2}
              style={active ? { color: portal.accent } : undefined}
            />
            <span className="flex-1">{label}</span>
            {badge === 'notifications' && unread > 0 && (
              <span
                className="text-[10px] font-bold text-white rounded-full min-w-[18px] h-[18px] grid place-items-center px-1"
                style={{ background: portal.accent }}
              >
                {unread > 99 ? '99+' : unread}
              </span>
            )}
            {active && <ChevronRight className="h-3.5 w-3.5" style={{ color: portal.accent }} />}
          </Link>
        );
      })}
    </>
  );
}

// =====================================================================
// Brand mark — shared between the two shells
// =====================================================================
function BrandMark({ portal, size = 'lg' }: { portal: RolePortal; size?: 'sm' | 'lg' }) {
  const box = size === 'sm' ? 'h-8 w-8 rounded-lg text-sm' : 'h-10 w-10 rounded-xl';
  return (
    <div
      className={`${box} grid place-items-center text-white font-bold tracking-tight shrink-0`}
      style={{
        background: `linear-gradient(135deg, ${portal.accent} 0%, ${portal.accentGradientTo} 100%)`,
        boxShadow: `0 6px 20px ${portal.accent}55`,
      }}
    >
      E
    </div>
  );
}

// =====================================================================
// Desktop sidebar — role-aware (lg and up)
// =====================================================================
function PortalSidebar({
  portal,
  schoolName,
  unread,
}: {
  portal: RolePortal;
  schoolName?: string;
  unread: number;
}) {
  return (
    <aside
      className="hidden lg:flex w-64 shrink-0 flex-col
        bg-white/70 backdrop-blur-xl border-r border-[var(--color-border)]
        shadow-[2px_0_24px_rgba(15,23,42,0.04)]"
    >
      {/* Brand mark — role-accented gradient */}
      <div className="px-5 py-5 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5">
          <BrandMark portal={portal} />
          <div className="min-w-0 flex-1">
            <div className="font-bold text-[var(--color-text)] leading-tight tracking-tight">EduFlow</div>
            <div className={`ef-chip ${portal.chipClass} mt-0.5`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.5rem' }}>
              {portal.label} portal
            </div>
          </div>
        </div>
        {schoolName && (
          <div className="ef-eyebrow mt-3 truncate" style={{ letterSpacing: '0.18em' }}>
            {schoolName}
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
        <NavLinks portal={portal} unread={unread} />
      </nav>
    </aside>
  );
}

// =====================================================================
// Mobile top bar + slide-out drawer (below lg) — without this the app had
// no navigation at all on phones.
// =====================================================================
function MobileNav({
  portal,
  schoolName,
  unread,
}: {
  portal: RolePortal;
  schoolName?: string;
  unread: number;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      {/* Sticky top bar — hamburger on the left. The global account button is
          fixed at the top-right (z-100), so we keep that corner clear with the
          right padding and place the menu trigger opposite it. */}
      <header
        className="lg:hidden sticky top-0 z-30 flex items-center gap-2.5 pl-3 pr-16 h-14
          bg-white/80 backdrop-blur-xl border-b border-[var(--color-border)]"
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={open}
          className="relative h-10 w-10 grid place-items-center rounded-xl text-[var(--color-text)] hover:bg-black/5 active:scale-95 transition shrink-0"
        >
          <Menu className="h-5 w-5" strokeWidth={2.2} />
          {unread > 0 && (
            <span
              className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full ring-2 ring-white"
              style={{ background: portal.accent }}
            />
          )}
        </button>
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandMark portal={portal} size="sm" />
          <div className="min-w-0">
            <div className="font-bold text-[var(--color-text)] leading-none text-sm truncate">EduFlow</div>
            <div className="ef-eyebrow truncate" style={{ fontSize: '0.55rem', letterSpacing: '0.16em' }}>
              {schoolName ?? `${portal.label} portal`}
            </div>
          </div>
        </div>
      </header>

      {/* Drawer + backdrop overlay (always mounted so it can animate). z above
          the global account button (z-100) so an open drawer is a true modal. */}
      <div
        className={`lg:hidden fixed inset-0 z-[120] ${open ? '' : 'pointer-events-none'}`}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={`${portal.label} navigation`}
          className={`absolute left-0 top-0 h-full w-72 max-w-[82vw] flex flex-col bg-white shadow-2xl
            transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <BrandMark portal={portal} />
              <div className="min-w-0">
                <div className="font-bold text-[var(--color-text)] leading-tight tracking-tight">EduFlow</div>
                <div
                  className={`ef-chip ${portal.chipClass} mt-0.5`}
                  style={{ fontSize: '0.6rem', padding: '0.1rem 0.5rem' }}
                >
                  {portal.label} portal
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation menu"
              className="h-9 w-9 grid place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-black/5 shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {schoolName && (
            <div className="px-5 pt-3 ef-eyebrow truncate" style={{ letterSpacing: '0.18em' }}>
              {schoolName}
            </div>
          )}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
            <NavLinks portal={portal} unread={unread} onNavigate={() => setOpen(false)} />
          </nav>
        </aside>
      </div>
    </>
  );
}
