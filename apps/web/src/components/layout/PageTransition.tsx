'use client';
import { usePathname } from 'next/navigation';

/**
 * Keyed by pathname so React remounts on every navigation; the CSS
 * `page-enter` keyframe then plays. Children get a staggered fade-up
 * via globals.css (`.page-enter > *:nth-child(n)` delays).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
