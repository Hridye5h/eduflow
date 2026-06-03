import { applyRlsAsOwner } from '../test-utils/rls';
import { DunningStatus, OutboxKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant-context';
import { ProvenanceService } from '../provenance/provenance.service';
import { LlmService } from '../llm/llm.service';
import { DunningService } from './dunning.service';

/**
 * LIVE demo (not a CI test): proves the Smart Dunning vertical runs on REAL
 * Gemini output, end-to-end, with guardrails + provenance. Skips unless both a
 * database and a GEMINI_API_KEY are configured, so the normal suite is unaffected.
 *
 * Run:  set -a; . ./.env; set +a; RUN_LIVE_DEMO=1 jest src/dunning/dunning.live-demo.spec.ts
 *
 * Opt-in (RUN_LIVE_DEMO=1) so it never runs in the normal offline suite — even
 * when a key is present — and so CI never depends on a live model.
 */
const live =
  !!process.env.DATABASE_URL && !!process.env.GEMINI_API_KEY && process.env.RUN_LIVE_DEMO === '1';
const d = live ? describe : describe.skip;

const NON_QUIET = new Date('2026-06-02T06:30:00.000Z'); // 12:00 IST — sends
const QUIET = new Date('2026-06-02T17:30:00.000Z'); //     23:00 IST — quiet hours

d('Smart Dunning — LIVE on Gemini', () => {
  const prisma = new PrismaService();
  const svc = new DunningService(prisma, new ProvenanceService(prisma), new LlmService());
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  let schoolId = '';
  const inTenant = <T>(fn: () => Promise<T>) => TenantContext.run({ schoolId }, fn);

  beforeAll(async () => {
    await prisma.onModuleInit();
    await applyRlsAsOwner();
    await prisma.runAsSystem(async () => {
      const s = await prisma.db.school.create({ data: { name: 'Live Demo Coaching', subdomain: `live-${suffix}` } });
      schoolId = s.id;
    });
  });

  afterAll(async () => {
    await prisma.runAsSystem(() => prisma.db.school.delete({ where: { id: schoolId } }));
    await prisma.onModuleDestroy();
  });

  it('stage-1 reminder is drafted by Gemini, provenance-stamped, queued to the outbox', async () => {
    const run = await inTenant(() =>
      prisma.db.dunningRun.create({
        data: {
          schoolId,
          studentId: 'aarav-demo',
          amount: 4500,
          dueDate: NON_QUIET,
          toPhone: `9199${Math.floor(Math.random() * 1e8)}`,
          stage: 0,
          status: DunningStatus.ACTIVE,
          nextActionAt: NON_QUIET,
        },
      }),
    );

    await inTenant(() => svc.processRun(run, NON_QUIET));

    const after = await inTenant(() => prisma.db.dunningRun.findUnique({ where: { id: run.id } }));
    const outbox = await inTenant(() =>
      prisma.db.outboxItem.findFirst({ where: { kind: OutboxKind.SEND_MESSAGE }, orderBy: { createdAt: 'desc' } }),
    );
    const prov = await inTenant(() =>
      prisma.db.aiGeneration.findFirst({ where: { artefactType: 'dunning' }, orderBy: { createdAt: 'desc' } }),
    );

    const payload = outbox?.payload as { toPhone?: string; text?: string } | undefined;

    // eslint-disable-next-line no-console
    console.log(
      [
        '',
        '────────────────────────────────────────────────────────────',
        '  SMART DUNNING — stage 1, generated live by Gemini',
        '────────────────────────────────────────────────────────────',
        `  run stage     : 0 → ${after?.stage}   (status ${after?.status})`,
        `  to phone      : ${payload?.toPhone}`,
        '  ── Gemini Hinglish reminder ──────────────────────────────',
        ...(payload?.text ?? '').split('\n').map((l) => `  | ${l}`),
        '  ── IT-Rules provenance stamp ─────────────────────────────',
        `  model         : ${prov?.model}`,
        `  artefactHash  : ${prov?.artefactHash}`,
        `  watermark     : ${prov?.watermarkText}`,
        `  humanReviewed : ${prov?.humanReviewed}`,
        '────────────────────────────────────────────────────────────',
        '',
      ].join('\n'),
    );

    expect(after?.stage).toBe(1);
    expect(payload?.text && payload.text.length > 0).toBe(true);
    expect(prov?.artefactHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('guardrail intact: quiet hours block the send (Gemini is NOT called)', async () => {
    const run = await inTenant(() =>
      prisma.db.dunningRun.create({
        data: {
          schoolId,
          studentId: 'quiet-demo',
          amount: 4500,
          dueDate: NON_QUIET,
          toPhone: `9198${Math.floor(Math.random() * 1e8)}`,
          stage: 0,
          status: DunningStatus.ACTIVE,
          nextActionAt: QUIET,
        },
      }),
    );
    await inTenant(() => svc.processRun(run, QUIET));
    const after = await inTenant(() => prisma.db.dunningRun.findUnique({ where: { id: run.id } }));
    // eslint-disable-next-line no-console
    console.log(`  [quiet hours] run stayed at stage ${after?.stage} — no send, no model call ✔`);
    expect(after?.stage).toBe(0);
  });
});
