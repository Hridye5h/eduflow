'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, session } from '@/lib/api';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  MessageSquare,
  GraduationCap,
  Wallet,
  Bell,
  Settings,
  BookOpenCheck,
  FileText,
  MessagesSquare,
  ClipboardList,
  BarChart3,
} from 'lucide-react';

const ITEMS = [
  { href: '/dashboard',     label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/classes',       label: 'Classes',      icon: Users },
  { href: '/attendance',    label: 'Attendance',   icon: CalendarCheck },
  { href: '/feed',          label: 'Class Wall',   icon: MessageSquare },
  { href: '/chat',          label: 'Chat',         icon: MessagesSquare },
  { href: '/assignments',   label: 'Assignments',  icon: ClipboardList },
  { href: '/marks',         label: 'Marks',        icon: BookOpenCheck },
  { href: '/report-cards',  label: 'Report cards', icon: FileText },
  { href: '/timetable',     label: 'Timetable',    icon: GraduationCap },
  { href: '/reports',       label: 'Reports',      icon: BarChart3 },
  { href: '/fees',          label: 'Fees',         icon: Wallet },
  { href: '/notifications', label: 'Inbox',        icon: Bell, badge: true },
];

export function Sidebar({ schoolName }: { schoolName?: string }) {
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

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col
      bg-white/70 backdrop-blur-xl border-r border-[var(--color-border)]
      shadow-[2px_0_24px_rgba(15,23,42,0.04)]">
      <div className="px-5 py-5 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5">
          <div
            className="h-10 w-10 rounded-xl grid place-items-center text-white font-bold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #14b8a6 100%)',
              boxShadow: '0 6px 20px rgba(79,70,229,0.35)',
            }}
          >
            E
          </div>
          <div className="min-w-0">
            <div className="font-bold text-[var(--color-text)] leading-tight tracking-tight">EduFlow</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-subtle)] truncate max-w-[10rem] mt-0.5">
              {schoolName || 'School portal'}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
        {ITEMS.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all
                ${active
                  ? 'bg-gradient-to-r from-[var(--color-brand-soft)] to-transparent text-[var(--color-brand)] font-semibold shadow-[inset_2px_0_0_var(--color-brand)]'
                  : 'text-[var(--color-text-muted)] hover:bg-white/70 hover:text-[var(--color-text)]'}`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 2} />
              <span className="flex-1">{label}</span>
              {badge && unread > 0 && (
                <span className="text-[10px] font-bold bg-[var(--color-danger)] text-white rounded-full min-w-[18px] h-[18px] grid place-items-center px-1">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--color-border)] p-3">
        <Link
          href="/settings"
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${
            pathname.startsWith('/settings')
              ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-semibold'
              : 'text-[var(--color-text-muted)] hover:bg-white/70 hover:text-[var(--color-text)]'
          }`}
        >
          <Settings className="h-[18px] w-[18px]" strokeWidth={2} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
