import { applyRlsAsOwner } from '../test-utils/rls';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant-context';
import { ProvenanceService } from './provenance.service';

const hasDb = !!process.env.DATABASE_URL;
const d = hasDb ? describe : describe.skip;

d('ProvenanceService (IT Rules 2026 ledger)', () => {
  const prisma = new PrismaService();
  const service = new ProvenanceService(prisma);
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  let schoolId = '';
  const inTenant = <T>(fn: () => Promise<T>) => TenantContext.run({ schoolId }, fn);

  beforeAll(async () => {
    await prisma.onModuleInit();
    await applyRlsAsOwner();
    await prisma.runAsSystem(async () => {
      const school = await prisma.db.school.create({
        data: { name: 'Prov Coaching', subdomain: `prov-${suffix}` },
      });
      schoolId = school.id;
    });
  });

  afterAll(async () => {
    await prisma.runAsSystem(() => prisma.db.school.delete({ where: { id: schoolId } }));
    await prisma.onModuleDestroy();
  });

  it('stamp records a row and returns a deterministic hash + watermark', async () => {
    const stamp = await inTenant(() =>
      service.stamp({
        schoolId,
        artefactType: 'test_report',
        content: 'Aarav scored 18/20 in Algebra.',
        model: 'gemini-2.5-flash',
      }),
    );
    expect(stamp.artefactHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stamp.watermarkText).toContain('AI-generated');

    const found = await inTenant(() => service.getByHash(stamp.artefactHash));
    expect(found?.schoolId).toBe(schoolId);
    expect(found?.humanReviewed).toBe(false);
  });

  it('markReviewed flips the HITL flag (the one permitted mutation)', async () => {
    const stamp = await inTenant(() =>
      service.stamp({ schoolId, artefactType: 'dunning', content: 'reminder', model: 'sarvam-m' }),
    );
    const reviewed = await inTenant(() => service.markReviewed(stamp.id, 'teacher-1'));
    expect(reviewed.humanReviewed).toBe(true);
    expect(reviewed.reviewerId).toBe('teacher-1');
  });
});
