'use client';
import { useEffect, useRef, useState } from 'react';
import { pendingRequests, session, subscribeToRequests } from '@/lib/api';
import { portalForRole } from '@/lib/role-config';

/**
 * Slim 2-px top progress bar shown while any in-flight API request is
 * pending. Themed by the signed-in user's role accent.
 *
 * Behaviour:
 *  • Subscribes to the request tracker in lib/api.
 *  • Waits 300ms before becoming visible (so fast requests don't flash).
 *  • Animates width 0 → 80% over ~600 ms, then crawls slowly.
 *  • Snaps to 100% when all requests settle, then fades out.
 *  • Multiple parallel requests are tracked by a single counter, so
 *    parallel network activity keeps the bar visible until the last
 *    response lands.
 */
export function TopProgressBar() {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [accent, setAccent] = useState('#4f46e5');

  // Subscribe to in-flight tracker
  useEffect(() => {
    const unsub = subscribeToRequests(() => setCount(pendingRequests()));
    setCount(pendingRequests());
    return unsub;
  }, []);

  // Read role accent (default to brand indigo if not signed in)
  useEffect(() => {
    const u = session.user();
    if (u?.role) setAccent(portalForRole(u.role).accent);
  }, [count]); // re-evaluate when activity starts (covers login → role switch)

  // Threshold to avoid flashing on fast requests
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const crawlTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (count > 0) {
      // Pending — start the 300 ms threshold then animate progress.
      if (fadeTimer.current) { clearTimeout(fadeTimer.current); fadeTimer.current = null; }

      if (!visible && !showTimer.current) {
        showTimer.current = setTimeout(() => {
          showTimer.current = null;
          setVisible(true);
          setProgress(15);
          // Animate up to ~80% quickly, then crawl
          let p = 15;
          crawlTimer.current = setInterval(() => {
            p = p < 80 ? p + 6 : p < 95 ? p + 0.4 : 95;
            setProgress(p);
          }, 90);
        }, 300);
      }
    } else {
      // All requests settled.
      if (showTimer.current) {
        clearTimeout(showTimer.current);
        showTimer.current = null;
      }
      if (crawlTimer.current) { clearInterval(crawlTimer.current); crawlTimer.current = null; }
      if (visible) {
        setProgress(100);
        fadeTimer.current = setTimeout(() => {
          setVisible(false);
          setProgress(0);
        }, 280);
      }
    }
  }, [count, visible]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    if (crawlTimer.current) clearInterval(crawlTimer.current);
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
      style={{ height: '2px' }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${accent}00, ${accent} 30%, ${accent} 70%, ${accent}00)`,
          boxShadow: `0 0 10px ${accent}66, 0 0 4px ${accent}aa`,
          opacity: visible ? 1 : 0,
          transition: 'width 0.2s ease, opacity 0.28s ease',
        }}
      />
    </div>
  );
}

export default TopProgressBar;
