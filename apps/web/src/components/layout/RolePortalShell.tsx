'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Settings, ChevronRight } from 'lucide-react';
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
 * - Renders the role-coded sidebar + content area.
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

  if (!ready || !user) return <PremiumLoader />;

  const portal = portalForRole(role);

  return (
    <div className="min-h-screen flex">
      <PortalSidebar portal={portal} schoolName={session.subdomain() ?? undefined} />
      <div className="flex-1 flex flex-col min-w-0">
        <PageTransition>{children}</PageTransition>
      </div>
    </div>
  );
}

// =====================================================================
// Sidebar — role-aware
// =====================================================================
function PortalSidebar({ portal, schoolName }: { portal: RolePortal; schoolName?: string }) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
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
  }, []);

  // Settings is principal-only and lives at the bottom anchor for that role.
  const hasSettings = portal.path === '/principal';

  return (
    <aside
      className="hidden lg:flex w-64 shrink-0 flex-col
        bg-white/70 backdrop-blur-xl border-r border-[var(--color-border)]
        shadow-[2px_0_24px_rgba(15,23,42,0.04)]"
    >
      {/* Brand mark — role-accented gradient */}
      <div className="px-5 py-5 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5">
          <div
            className="h-10 w-10 rounded-xl grid place-items-center text-white font-bold tracking-tight"
            style={{
              background: `linear-gradient(135deg, ${portal.accent} 0%, ${portal.accentGradientTo} 100%)`,
              boxShadow: `0 6px 20px ${portal.accent}55`,
            }}
          >
            E
          </div>
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
        {portal.nav.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
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
              {active && (
                <ChevronRight className="h-3.5 w-3.5" style={{ color: portal.accent }} />
              )}
            </Link>
          );
        })}
      </nav>

      {hasSettings && (
        <div className="border-t border-[var(--color-border)] p-3">
          <Link
            href={`${portal.path}/settings`}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-[var(--color-text-muted)] hover:bg-white/70 hover:text-[var(--color-text)] transition-colors"
          >
            <Settings className="h-[18px] w-[18px]" strokeWidth={2} />
            Settings
          </Link>
        </div>
      )}
    </aside>
  );
}
