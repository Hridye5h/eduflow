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

const hasDb = !!process.env.DATABASE_URL;
const d = hasDb ? describe : describe.skip;

d('GradingService (consent-gated, provenance-stamped, HITL)', () => {
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
      const s = await prisma.db.school.create({ data: { name: 'Grade Coaching', subdomain: `grade-${suffix}` } });
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
  ];

  it('grades a sheet with deterministic totals', async () => {
    const sheet = await inTenant(() => svc.gradeSheet({ schoolId, testName: 'Weekly 1', studentId, items }));
    expect(sheet.totalAwarded).toBe(12);
    expect(sheet.totalMax).toBe(20);
    expect(sheet.percentage).toBe(60);
  });

  it('blocks report generation without granted consent (DPDPA)', async () => {
    const sheet = await inTenant(() => svc.gradeSheet({ schoolId, testName: 'Weekly 2', studentId, items }));
    await expect(inTenant(() => svc.generateReport(sheet.id))).rejects.toThrow();
  });

  it('generates a provenance-stamped report once consent is granted, then sends on approval', async () => {
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

    const sheet = await inTenant(() => svc.gradeSheet({ schoolId, testName: 'Weekly 3', studentId, items }));
    const report = await inTenant(() => svc.generateReport(sheet.id));
    expect(report.provenanceId).toBeTruthy();
    expect(report.humanReviewed).toBe(false);

    await inTenant(async () => {
      const stamped = await prisma.db.aiGeneration.count({ where: { artefactType: 'test_report' } });
      expect(stamped).toBeGreaterThanOrEqual(1);
    });

    // HITL approve → queues the parent send
    await inTenant(() => svc.approveAndSend(report.id, 'teacher-1', '9100000000'));
    await inTenant(async () => {
      const r = await prisma.db.testReport.findUnique({ where: { id: report.id } });
      expect(r?.humanReviewed).toBe(true);
      expect(r?.sentAt).toBeTruthy();
      const sends = await prisma.db.outboxItem.count({ where: { schoolId, kind: OutboxKind.SEND_MESSAGE } });
      expect(sends).toBeGreaterThanOrEqual(1);
    });
  });
});
