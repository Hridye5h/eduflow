# Row-Level Security (multi-tenant isolation)

EduFlow is multi-tenant on a single Postgres. Every business row carries
`schoolId`. Until now isolation was **application-level only** — each service
added `where: { schoolId }` by hand, so one forgotten filter = a cross-tenant
leak = a DPDPA breach (risk **R3** in the architecture plan).

This module adds **database-enforced** isolation as defense-in-depth: Postgres
Row-Level Security policies that the app physically cannot bypass by forgetting a
filter.

## How it works

```
request ─► TenantMiddleware ─► (auth guard) ─► TenantContextInterceptor ─► controller ─► service
             │ sets ALS store.schoolId            │ tops up store.schoolId            │
             │ from subdomain                      │ from req.user (JWT)               ▼
             └──────────────── AsyncLocalStorage (TenantContext) ──────────► PrismaService.db
                                                                              sets GUC app.current_tenant_id
                                                                              per operation; RLS enforces it
```

1. **`TenantContext`** (`src/common/tenant-context.ts`) — an `AsyncLocalStorage`
   store `{ schoolId?, userId?, bypassRls? }` carried through the whole request.
2. **`TenantMiddleware`** seeds `schoolId` from the subdomain and runs the rest of
   the request inside the store.
3. **`TenantContextInterceptor`** tops it up from the JWT (`req.user.schoolId`)
   after auth, for token-derived tenancy.
4. **`PrismaService.db`** — the tenant-aware client. Each model operation is
   wrapped in a short transaction that first runs
   `set_config('app.current_tenant_id', <schoolId>, true)`. The `true` makes it
   **transaction-scoped**, so it is safe under PgBouncer transaction pooling.
5. **`prisma/rls.sql`** — `ENABLE` + `FORCE ROW LEVEL SECURITY` + a
   `tenant_isolation` policy on the 23 tenant tables. The policy matches
   `"schoolId" = current_setting('app.current_tenant_id', true)::uuid`.

**Fails closed.** If no tenant is in context, the GUC is unset,
`current_setting(..., true)` returns `NULL`, the predicate is `NULL`, and the
query returns **zero rows** instead of leaking.

## The one rule you must not break

> **Never hold a Postgres transaction open across a network call.**

A transaction pins a connection. An LLM/OCR/WhatsApp/Razorpay call can take many
seconds; holding a transaction across it starves the connection pool under load
(this was the highest-value catch from the external review).

- Every `PrismaService.db` operation is its own sub-second transaction — fine.
- For multi-statement writes use **`runInTenantTx(fn)`**, and do **all** slow work
  *before* it:

```ts
// ✗ WRONG — transaction pinned during a 15s OCR call
await prisma.runInTenantTx(async (tx) => {
  const text = await sarvam.ocr(image);          // network call inside txn!
  await tx.gradedSheet.create({ data: { text } });
});

// ✓ RIGHT — slow work first, transaction only to persist
const text = await sarvam.ocr(image);            // outside any txn
await prisma.runInTenantTx(async (tx) => {
  await tx.gradedSheet.create({ data: { text } });
});
```

## Applying the policies

```bash
# after the schema is in the DB (prisma db push)
pnpm --filter api db:rls          # node applier, idempotent
# or push + apply together
pnpm --filter api db:sync
# or with psql
psql "$DATABASE_URL" -f apps/api/prisma/rls.sql
```

Run it again after any schema change — it is idempotent.

## System / cross-tenant work

Seeds, cron jobs, and cross-tenant analytics must opt out of RLS explicitly:

```ts
await prisma.runAsSystem(async () => {
  // app.bypass_rls = 'on' for every query in this scope
  await prisma.db.school.findMany();
});
```

`bypassRls` is **never** set from request data. In production, migrate this to a
dedicated `BYPASSRLS` Postgres role for the analytics/worker connection (the GUC
bypass is the bootstrap form).

## Verifying

```bash
DATABASE_URL=postgres://... pnpm --filter api test src/prisma/rls.spec.ts
```

`rls.spec.ts` seeds two tenants and asserts: A never sees B, explicit
cross-tenant filters return nothing, no-context returns zero rows, and `WITH
CHECK` blocks writing into another tenant. This test is the CI gate for R3.

## Service cutover (done — pending staging verification)

The 12 domain service modules (admin, assignments, attendance, chat, classes,
feed, fees, marks, notifications, reports, schools, timetable) now use the
tenant client `this.prisma.db.*`, and their multi-statement writes use
`runInTenantTx`. The **auth module runs under `runAsSystem`** — it is the trusted
tenant *resolver* (it runs before a context exists and scopes every query by an
explicit `schoolId`). `tenant.middleware` (subdomain lookup) and `health`
(DB ping) stay on the base client by design.

**This is safe to ship as-is:** `prisma.db` with a tenant context is a no-op
until `rls.sql` is applied (it just sets an unused GUC), and the existing
app-level `where: { schoolId }` filters are still in place. Enforcement only
turns on when you apply the policies.

**Before enabling in production:**

1. Apply policies in **staging**: `pnpm --filter api db:rls`.
2. Run the leak test: `DATABASE_URL=… pnpm --filter api test src/prisma/rls.spec.ts`.
3. Smoke-test the critical flows — **login, OTP, signup, a CRUD read/write in
   each module** — to confirm nothing fails closed (the one runtime risk a
   typecheck can't catch).
4. Then apply `rls.sql` in production.

The leak test + smoke test are the gate. Roll back by simply not applying
`rls.sql` (the app keeps working on the app-level filters).

## Not yet covered (tracked follow-up)

Child/join tables without their own `schoolId` — `Term`, `ParentLink`,
`RefreshToken`, `Assignment`, `ChatMember`, `TimetablePeriod`,
`TimetableSubstitution`, `NotificationPreference` — are reachable only via their
tenant-scoped parents and are still protected at the app layer. Add
subquery-based RLS policies (joining to the parent's `schoolId`) in a follow-up.
