import { applyRlsAsOwner } from '../test-utils/rls';
import { ConsentMethod, OutboxKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant-context';
import { ProvenanceService } from '../provenance/provenance.service';
import { ConsentService, ConsentPurpose } from '../consent/consent.service';
import { DigilockerVerifier } from '../consent/verifiers/digilocker.verifier';
import { PhoneOtpVerifier } from '../consent/verifiers/phone-otp.verifier';
import { LlmService } from '../llm/llm.service';
import { GradingService } from './grading.service';

/**
 * LIVE demo (opt-in): the AI Test & Grading vertical on REAL Gemini, showing the
 * defensible split — deterministic scores (never the LLM) → DPDPA consent gate →
 * Gemini phrases the narrative → provenance stamp → teacher HITL → parent send.
 *
 * Run:  set -a; . ./.env; set +a; RUN_LIVE_DEMO=1 jest src/grading/grading.live-demo.spec.ts
 */
const live =
  !!process.env.DATABASE_URL && !!process.env.GEMINI_API_KEY && process.env.RUN_LIVE_DEMO === '1';
const d = live ? describe : describe.skip;

d('AI Test & Grading — LIVE on Gemini', () => {
  const prisma = new PrismaService();
  const consent = new ConsentService(prisma, new DigilockerVerifier(), new PhoneOtpVerifier());
  const svc = new GradingService(prisma, new ProvenanceService(prisma), consent, new LlmService());
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  let schoolId = '';
  let studentId = '';
  const inTenant = <T>(fn: () => Promise<T>) => TenantContext.run({ schoolId }, fn);

  beforeAll(async () => {
    await prisma.onModuleInit();
    await applyRlsAsOwner();
    await prisma.runAsSystem(async () => {
      const s = await prisma.db.school.create({
        data: { name: 'Grade Live Coaching', subdomain: `gradelive-${suffix}` },
      });
      schoolId = s.id;
      const student = await prisma.db.user.create({ data: { schoolId, role: 'STUDENT', name: 'Meera' } });
      studentId = student.id;
    });
  });

  afterAll(async () => {
    await prisma.runAsSystem(() => prisma.db.school.delete({ where: { id: schoolId } }));
    await prisma.onModuleDestroy();
  });

  const items = [
    { topic: 'Algebra', awarded: 9, max: 10 },
    { topic: 'Geometry', awarded: 3, max: 10 },
    { topic: 'Trigonometry', awarded: 7, max: 10 },
  ];

  it('deterministic score → consent gate → Gemini note → provenance → HITL send', async () => {
    const sheet = await inTenant(() => svc.gradeSheet({ schoolId, testName: 'Weekly Test 4', studentId, items }));

    // DPDPA gate: no granted consent yet → report generation must be refused.
    let blocked = false;
    try {
      await inTenant(() => svc.generateReport(sheet.id));
    } catch {
      blocked = true;
    }

    // Grant verifiable parental consent (DigiLocker), then generate.
    await inTenant(() =>
      consent.grantViaVerifier({
        schoolId,
        studentId,
        guardianId: 'g1',
        purpose: ConsentPurpose.AI_TEST_REPORTS,
        method: ConsentMethod.DIGILOCKER,
        verify: { callbackPayload: { code: 'x' } },
      }),
    );
    const report = await inTenant(() => svc.generateReport(sheet.id));
    const prov = await inTenant(() =>
      prisma.db.aiGeneration.findUnique({ where: { id: report.provenanceId as string } }),
    );

    // HITL: teacher approves → queued to the parent via the outbox.
    await inTenant(() => svc.approveAndSend(report.id, 'teacher-1', '9100000000'));
    const sent = await inTenant(() => prisma.db.testReport.findUnique({ where: { id: report.id } }));
    const outbox = await inTenant(() =>
      prisma.db.outboxItem.findFirst({ where: { kind: OutboxKind.SEND_MESSAGE }, orderBy: { createdAt: 'desc' } }),
    );

    // eslint-disable-next-line no-console
    console.log(
      [
        '',
        '────────────────────────────────────────────────────────────',
        '  AI TEST & GRADING — report phrased live by Gemini',
        '────────────────────────────────────────────────────────────',
        `  deterministic score : ${sheet.totalAwarded}/${sheet.totalMax} (${sheet.percentage}%)  [computed, never the LLM]`,
        `  consent gate (none yet) : ${blocked ? 'BLOCKED ✔ (DPDPA)' : 'NOT blocked ✗'}`,
        '  ── Gemini parent note ────────────────────────────────────',
        ...(report.body ?? '').split('\n').map((l) => `  | ${l}`),
        '  ── IT-Rules provenance stamp ─────────────────────────────',
        `  model         : ${prov?.model}`,
        `  artefactHash  : ${prov?.artefactHash}`,
        `  watermark     : ${prov?.watermarkText}`,
        `  HITL reviewed : ${sent?.humanReviewed} by ${sent?.reviewerId}; sentAt set: ${!!sent?.sentAt}`,
        `  queued to parent (outbox): ${!!outbox}`,
        '────────────────────────────────────────────────────────────',
        '',
      ].join('\n'),
    );

    expect(sheet.totalAwarded).toBe(19);
    expect(sheet.totalMax).toBe(30);
    expect(blocked).toBe(true);
    expect((report.body ?? '').length).toBeGreaterThan(0);
    expect(prov?.artefactHash).toMatch(/^[0-9a-f]{64}$/);
    expect(prov?.model).toBe('gemini-2.5-flash');
    expect(sent?.humanReviewed).toBe(true);
    expect(!!outbox).toBe(true);
  });
});
