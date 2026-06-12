const PORTAL_PREFIXES = ['/principal', '/teacher', '/student', '/parent'] as const;

/**
 * The role-portal prefix for the current path, or '' for the legacy (app) shell.
 *
 * Several list pages (marks, assignments) are re-exported into more than one
 * portal (e.g. /teacher/marks re-exports the (app) marks page). A bare detail
 * link like `/marks/${id}` would eject the user out of their portal and into the
 * legacy shell. Prefixing with the current portal keeps navigation in-shell.
 */
export function portalPrefix(pathname: string | null | undefined): string {
  if (!pathname) return '';
  return PORTAL_PREFIXES.find((p) => pathname === p || pathname.startsWith(p + '/')) ?? '';
}
