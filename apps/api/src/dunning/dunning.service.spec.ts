import { applyRlsAsOwner } from '../test-utils/rls';
import { DunningAction, DunningStatus, OutboxKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant-context';
import { ProvenanceService } from '../provenance/provenance.service';
import { fakeLlm } from '../test-utils/llm';
import { DunningService } from './dunning.service';

const hasDb = !!process.env.DATABASE_URL;
const d = hasDb ? describe : describe.skip;

const NON_QUIET = new Date('2026-06-02T06:30:00.000Z'); // IST 12:00
const QUIET = new Date('2026-06-02T17:30:00.000Z'); // IST 23:00

d('DunningService (guardrailed state machine)', () => {
  const prisma = new PrismaService();
  const svc = new DunningService(prisma, new ProvenanceService(prisma), fakeLlm());
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  let schoolId = '';
  const inTenant = <T>(fn: () => Promise<T>) => TenantContext.run({ schoolId }, fn);

  const makeRun = (over: Partial<{ stage: number; status: DunningStatus; toPhone: string }> = {}) =>
    inTenant(() =>
      prisma.db.dunningRun.create({
        data: {
          schoolId,
          studentId: `stu-${Math.random()}`,
          amount: 2500,
          dueDate: NON_QUIET,
          toPhone: over.toPhone ?? `9199${Math.floor(Math.random() * 1e8)}`,
          stage: over.stage ?? 0,
          status: over.status ?? DunningStatus.ACTIVE,
          nextActionAt: NON_QUIET,
        },
      }),
    );

  const events = (runId: string) =>
    inTenant(() => prisma.db.dunningEvent.findMany({ where: { dunningRunId: runId } }));
  const reload = (runId: string) =>
    inTenant(() => prisma.db.dunningRun.findUnique({ where: { id: runId } }));

  beforeAll(async () => {
    await prisma.onModuleInit();
    await applyRlsAsOwner();
    await prisma.runAsSystem(async () => {
      const s = await prisma.db.school.create({ data: { name: 'Dun Coaching', subdomain: `dun-${suffix}` } });
      schoolId = s.id;
    });
  });

  afterAll(async () => {
    await prisma.runAsSystem(() => prisma.db.school.delete({ where: { id: schoolId } }));
    await prisma.onModuleDestroy();
  });

  it('auto-sends stage 1: queues an outbox SEND, stamps provenance, advances', async () => {
    const run = await makeRun();
    await inTenant(() => svc.processRun(run, NON_QUIET));

    const after = await reload(run.id);
    expect(after?.stage).toBe(1);
    expect(after?.status).toBe(DunningStatus.ACTIVE);

    await inTenant(async () => {
      const sends = await prisma.db.outboxItem.count({
        where: { schoolId, kind: OutboxKind.SEND_MESSAGE },
      });
      expect(sends).toBeGreaterThanOrEqual(1);
      const stamped = await prisma.db.aiGeneration.count({ where: { artefactType: 'dunning' } });
      expect(stamped).toBeGreaterThanOrEqual(1);
    });
    const evs = await events(run.id);
    expect(evs.some((e) => e.action === DunningAction.REMINDER_SENT)).toBe(true);
  });

  it('respects quiet hours (no send during 21:00–09:00 IST)', async () => {
    const run = await makeRun();
    await inTenant(() => svc.processRun(run, QUIET));
    const after = await reload(run.id);
    expect(after?.stage).toBe(0); // not advanced
    const evs = await events(run.id);
    expect(evs.some((e) => e.action === DunningAction.SKIPPED_QUIET_HOURS)).toBe(true);
  });

  it('respects the daily frequency cap', async () => {
    const run = await makeRun({ stage: 1 });
    // a reminder already sent within the last 24h
    await inTenant(() =>
      prisma.db.dunningEvent.create({
        data: {
          schoolId,
          dunningRunId: run.id,
          stage: 1,
          action: DunningAction.REMINDER_SENT,
          createdAt: NON_QUIET,
        },
      }),
    );
    await inTenant(() => svc.processRun(run, new Date(NON_QUIET.getTime() + 60_000)));
    const evs = await events(run.id);
    expect(evs.some((e) => e.action === DunningAction.SKIPPED_FREQ_CAP)).toBe(true);
  });

  it('HITL gate: stage 4 awaits owner approval, then approve sends', async () => {
    const run = await makeRun({ stage: 3 }); // next is stage 4
    await inTenant(() => svc.processRun(run, NON_QUIET));
    let after = await reload(run.id);
    expect(after?.status).toBe(DunningStatus.AWAITING_APPROVAL);
    expect(after?.stage).toBe(3); // not advanced without approval

    await inTenant(() => svc.approveEscalatedSend(run.id));
    after = await reload(run.id);
    expect(after?.stage).toBe(4);
    const evs = await events(run.id);
    expect(evs.some((e) => e.action === DunningAction.APPROVED_SENT)).toBe(true);
  });

  it('stop-word inbound halts the run and flags a human', async () => {
    const phone = `9198${Math.floor(Math.random() * 1e8)}`;
    const run = await makeRun({ toPhone: phone });
    const res = await inTenant(() => svc.handleInboundText(schoolId, phone, 'please STOP sending'));
    expect(res.stopped).toBe(1);
    const after = await reload(run.id);
    expect(after?.status).toBe(DunningStatus.STOPPED);
    const evs = await events(run.id);
    expect(evs.some((e) => e.action === DunningAction.STOPPED_KEYWORD)).toBe(true);
  });
});
