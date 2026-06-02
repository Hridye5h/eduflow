'use client';
import { Search } from 'lucide-react';

/**
 * Slim top header. The user profile + sign-out now live in the floating
 * <UserProfile/> pill mounted in the root layout (CivicLoop pattern).
 */
export function TopBar({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)]
      bg-white/65 backdrop-blur-xl">
      <div className="flex items-center gap-4 px-6 h-14">
        <div className="min-w-0">
          {eyebrow && <div className="ef-eyebrow leading-none mb-0.5">{eyebrow}</div>}
          <h1 className="text-[15px] font-semibold text-[var(--color-text)] truncate">{title}</h1>
        </div>

        <div className="ml-auto hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full
          bg-white/80 border border-[var(--color-border)] text-sm w-72
          shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <Search className="h-4 w-4 text-[var(--color-text-muted)]" />
          <input
            placeholder="Search students, classes, posts…"
            className="bg-transparent outline-none flex-1 placeholder:text-[var(--color-text-subtle)]"
          />
        </div>
      </div>
    </header>
  );
}
