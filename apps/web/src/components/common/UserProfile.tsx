'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  User as UserIcon,
  LogOut,
  Shield,
  ShieldAlert,
  CheckCircle2,
  Users as ParentIcon,
  ChevronDown,
} from 'lucide-react';
import { session } from '@/lib/api';

const HIDDEN_PATHS = ['/', '/login', '/register'];

type Role = 'SUPER_ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';

const ROLE_STYLE: Record<Role, { className: string; icon: any; label: string }> = {
  SUPER_ADMIN: { className: 'ef-role-admin',   icon: ShieldAlert,  label: 'Admin'   },
  TEACHER:     { className: 'ef-role-teacher', icon: Shield,       label: 'Teacher' },
  STUDENT:     { className: 'ef-role-student', icon: CheckCircle2, label: 'Student' },
  PARENT:      { className: 'ef-role-parent',  icon: ParentIcon,   label: 'Parent'  },
};

export function UserProfile() {
  const pathname = usePathname();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    setUser(session.user());
  }, [mounted, pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!mounted) return null;
  if (HIDDEN_PATHS.includes(pathname)) return null;
  if (!user) return null;

  const role: Role = (user.role as Role) ?? 'STUDENT';
  const style = ROLE_STYLE[role] ?? ROLE_STYLE.STUDENT;
  const RoleIcon = style.icon;

  function signOut() {
    session.clear();
    setOpen(false);
    router.push('/login');
  }

  return (
    <div className="fixed top-4 right-4 md:top-5 md:right-6 z-[100]" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative flex items-center gap-0 md:gap-3 p-1 md:pl-1 md:pr-4 md:py-1 rounded-full
          bg-white/85 backdrop-blur-xl border border-[var(--color-border)]
          shadow-[0_8px_30px_rgba(15,23,42,0.10)]
          transition-all duration-200 hover:bg-white
          ${open ? 'ring-2 ring-[var(--color-brand)]/30' : ''}`}
      >
        <div className={`w-9 h-9 rounded-full grid place-items-center border shrink-0 ${style.className}`}>
          <UserIcon size={16} />
        </div>
        <div className="hidden md:flex flex-col items-start text-left mr-1">
          <span className="text-xs font-bold text-[var(--color-text)] leading-tight truncate max-w-[120px]">
            {user.name || 'User'}
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            <RoleIcon size={10} className={style.className.includes('admin') ? 'text-[var(--color-role-admin)]'
              : style.className.includes('teacher') ? 'text-[var(--color-role-teacher)]'
              : style.className.includes('student') ? 'text-[var(--color-role-student)]'
              : 'text-[var(--color-role-parent)]'}
            />
            <span className={`text-[9px] font-bold uppercase tracking-[0.12em] ${
              role === 'SUPER_ADMIN' ? 'text-[var(--color-role-admin)]'
              : role === 'TEACHER'   ? 'text-[var(--color-role-teacher)]'
              : role === 'STUDENT'   ? 'text-[var(--color-role-student)]'
              :                        'text-[var(--color-role-parent)]'
            }`}>
              {style.label}
            </span>
          </div>
        </div>
        <ChevronDown size={14} className={`hidden md:block text-[var(--color-text-subtle)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-60 rounded-2xl
          bg-white/95 backdrop-blur-xl border border-[var(--color-border)]
          shadow-[0_20px_50px_rgba(15,23,42,0.18)] p-1.5">
          <div className="px-3 py-2.5 border-b border-[var(--color-border)] mb-1">
            <p className="ef-eyebrow">Signed in as</p>
            <p className="text-sm font-medium text-[var(--color-text)] truncate mt-1">
              {user.email || user.phone || user.name}
            </p>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger)]/8 rounded-xl transition-colors text-left"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default UserProfile;
