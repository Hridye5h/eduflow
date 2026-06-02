import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request tenant context, carried through the async call tree via
 * AsyncLocalStorage. The RLS-aware Prisma client reads `schoolId` from here at
 * query time and binds it to the Postgres GUC `app.current_tenant_id`, so a
 * forgotten `where: { schoolId }` can never leak across tenants (defense-in-depth
 * behind the row-level-security policies — see prisma/migrations/*_rls_tenancy).
 *
 * The store is a MUTABLE object: the TenantMiddleware seeds `schoolId` from the
 * subdomain, and TenantContextInterceptor later fills it in from the JWT
 * (`req.user.schoolId`) once auth has run — both mutate the same object, so any
 * code further down the request sees the final value.
 */
export interface TenantStore {
  /** The active tenant (School.id, a uuid). Undefined on public/auth-bootstrap routes. */
  schoolId?: string;
  /** The acting user id, when authenticated. */
  userId?: string;
  /**
   * When true, the Prisma client bypasses RLS for this async scope. Reserved for
   * deliberate system work — seeding, cron jobs, cross-tenant analytics. NEVER
   * set this from request-derived data.
   */
  bypassRls?: boolean;
}

const als = new AsyncLocalStorage<TenantStore>();

/**
 * Keep the AsyncLocalStorage store active until a (possibly LAZY) thenable has
 * actually executed. Prisma query builders return lazy promises that don't touch
 * the database until awaited; if `fn` returns one directly (e.g. a non-async
 * method `return this.prisma.db.x.findFirst(...)`, or a test's
 * `inTenant(() => prisma.db.x.findMany())`), the query would otherwise run AFTER
 * `als.run` has popped the store — so the RLS-aware client would see no tenant
 * context, set no GUC, and the row-level policies would (correctly, but
 * unhelpfully) hide every row. Re-awaiting from inside the active scope anchors
 * the query's execution — and thus the GUC — to this context.
 *
 * Synchronous results pass straight through, so sync callers (e.g. the request
 * middleware wrapping `next()`) keep their exact behaviour, thrown errors and all.
 */
function anchor<R>(out: R): R {
  if (out != null && typeof (out as { then?: unknown }).then === 'function') {
    return (async () => await (out as unknown as Promise<unknown>))() as unknown as R;
  }
  return out;
}

export const TenantContext = {
  /**
   * Run `fn` with a fresh tenant store. A returned promise (including a lazy
   * Prisma query) has its execution anchored to this scope so the RLS GUC is set
   * while it runs; synchronous returns pass through unchanged.
   */
  run<T>(store: TenantStore, fn: () => T): T {
    return als.run(store, () => anchor(fn()));
  },

  /**
   * Run `fn` inside a NEW scope derived from the current store, with `patch`
   * merged in. Used by runAsSystem() to flip bypassRls without mutating the
   * caller's store.
   */
  runWith<T>(patch: Partial<TenantStore>, fn: () => Promise<T>): Promise<T> {
    const next: TenantStore = { ...(als.getStore() ?? {}), ...patch };
    return als.run(next, () => anchor(fn()));
  },

  /** The current store, or undefined if we're outside any request scope. */
  get(): TenantStore | undefined {
    return als.getStore();
  },

  /** Merge values into the current store (no-op if outside a scope). */
  set(patch: Partial<TenantStore>): void {
    const store = als.getStore();
    if (store) Object.assign(store, patch);
  },

  /** Convenience accessor for the active tenant id. */
  schoolId(): string | undefined {
    return als.getStore()?.schoolId;
  },
};
