import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { TenantContext } from '../common/tenant-context';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * EduFlow Prisma service — row-level-security aware.
 *
 * `this` (the base client) keeps the original, un-extended delegates so existing
 * system paths keep working unchanged. `this.db` is the TENANT-AWARE client:
 * every model operation it runs is wrapped in a short transaction that first sets
 * the Postgres GUC `app.current_tenant_id` (transaction-scoped, so it is safe
 * under PgBouncer transaction pooling), which the RLS policies enforce against
 * each row's `schoolId`.
 *
 * Three execution modes, chosen from the AsyncLocalStorage TenantContext:
 *   • tenant set   → set_config(app.current_tenant_id) then run  (RLS enforced)
 *   • bypassRls    → set_config(app.bypass_rls='on') then run    (system/cron/seed)
 *   • neither      → run as-is; on an RLS table the unset GUC yields NULL, so the
 *                    policy matches zero rows — the query fails CLOSED.
 *
 * IMPORTANT (the rule Gemini's review surfaced): never hold a transaction open
 * across a network call. Each `db` operation is its own sub-second transaction.
 * For multi-statement writes use `runInTenantTx()` — and do ALL slow work
 * (LLM/OCR/HTTP) OUTSIDE it, opening the transaction only to persist the result.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  /** Tenant-aware client. Prefer this for all request-scoped data access. */
  readonly db = this.$extends(rlsExtension(this));

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Run several writes in ONE short, tenant-scoped transaction. The GUC is set
   * first so RLS applies to every statement.
   *
   * Do NOT await any network call (LLM, OCR, WhatsApp, Razorpay) inside `fn` —
   * that would pin a Postgres connection for the duration of the call and starve
   * the pool. Fetch/compute first, then call this to persist.
   */
  runInTenantTx<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const schoolId = TenantContext.schoolId();
    if (schoolId && !UUID_RE.test(schoolId)) {
      throw new Error(`TenantContext.schoolId is not a uuid: ${schoolId}`);
    }
    return this.$transaction(async (tx) => {
      if (schoolId) {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${schoolId}, true)`;
      }
      return fn(tx);
    });
  }

  /**
   * Run `fn` with RLS BYPASSED for its entire async scope. Reserved for
   * deliberate system work (seeding, cron jobs, cross-tenant analytics). The
   * tenant-aware `db` client will set `app.bypass_rls = 'on'` for each query made
   * inside. Never wrap request handlers in this.
   */
  runAsSystem<T>(fn: () => Promise<T>): Promise<T> {
    return TenantContext.runWith({ bypassRls: true }, fn);
  }
}

/**
 * Client extension that binds each operation to the RLS GUCs. Captures the base
 * client so the `set_config` and the user query run in the SAME transaction;
 * the base client is un-extended, so this never recurses.
 */
function rlsExtension(base: PrismaClient) {
  return Prisma.defineExtension((client) =>
    client.$extends({
      name: 'rls-tenant',
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            const ctx = TenantContext.get();

            // System / cross-tenant scope — explicitly opted in.
            if (ctx?.bypassRls) {
              const [, result] = await base.$transaction([
                base.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`,
                query(args),
              ]);
              return result;
            }

            // Tenant scope — enforce isolation via the GUC the RLS policy reads.
            const schoolId = ctx?.schoolId;
            if (schoolId) {
              if (!UUID_RE.test(schoolId)) {
                throw new Error(`TenantContext.schoolId is not a uuid: ${schoolId}`);
              }
              const [, result] = await base.$transaction([
                base.$executeRaw`SELECT set_config('app.current_tenant_id', ${schoolId}, true)`,
                query(args),
              ]);
              return result;
            }

            // No context: run as-is. On an RLS table the unset GUC makes the
            // policy match zero rows — fails CLOSED rather than leaking.
            return query(args);
          },
        },
      },
    }),
  );
}
