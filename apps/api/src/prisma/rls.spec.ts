import { applyRlsAsOwner } from '../test-utils/rls';
import { PrismaService } from './prisma.service';
import { TenantContext } from '../common/tenant-context';

/**
 * R3 — cross-tenant isolation gate (architecture §9.2 L3).
 *
 * Proves the row-level-security spine actually isolates tenants:
 *   1. tenant A context never sees tenant B's rows (and vice-versa);
 *   2. no tenant context  -> zero rows (fails CLOSED);
 *   3. WITH CHECK blocks writing a row into another tenant.
 *
 * DB-gated: requires DATABASE_URL and a schema already pushed (`prisma db push`).
 * It applies prisma/rls.sql itself, so it is self-contained in CI.
 */
const hasDb = !!process.env.DATABASE_URL;
const d = hasDb ? describe : describe.skip;

d('RLS cross-tenant isolation', () => {
  const prisma = new PrismaService();
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  let schoolA = '';
  let schoolB = '';

  beforeAll(async () => {
    await prisma.onModuleInit();

    // Apply the RLS policies (idempotent) via the owner connection.
    await applyRlsAsOwner();

    // Seed two tenants + one AcademicYear each, with RLS bypassed.
    await prisma.runAsSystem(async () => {
      const a = await prisma.db.school.create({
        data: { name: 'Alpha Coaching', subdomain: `alpha-${suffix}` },
      });
      const b = await prisma.db.school.create({
        data: { name: 'Beta Coaching', subdomain: `beta-${suffix}` },
      });
      schoolA = a.id;
      schoolB = b.id;
      await prisma.db.academicYear.create({
        data: { schoolId: a.id, label: 'AY-A', startDate: new Date(), endDate: new Date() },
      });
      await prisma.db.academicYear.create({
        data: { schoolId: b.id, label: 'AY-B', startDate: new Date(), endDate: new Date() },
      });
    });
  });

  afterAll(async () => {
    await prisma.runAsSystem(async () => {
      await prisma.db.school.deleteMany({ where: { id: { in: [schoolA, schoolB] } } });
    });
    await prisma.onModuleDestroy();
  });

  it('tenant A sees only its own academic years', async () => {
    const rows = await TenantContext.run({ schoolId: schoolA }, () =>
      prisma.db.academicYear.findMany(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe('AY-A');
    expect(rows.every((r) => r.schoolId === schoolA)).toBe(true);
  });

  it('tenant B sees only its own academic years', async () => {
    const rows = await TenantContext.run({ schoolId: schoolB }, () =>
      prisma.db.academicYear.findMany(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe('AY-B');
  });

  it('a compromised tenant id cannot read another tenant by filtering for it', async () => {
    // Even explicitly asking for B's rows while in A's context returns nothing.
    const rows = await TenantContext.run({ schoolId: schoolA }, () =>
      prisma.db.academicYear.findMany({ where: { schoolId: schoolB } }),
    );
    expect(rows).toHaveLength(0);
  });

  it('no tenant context returns zero rows (fails closed)', async () => {
    const rows = await prisma.db.academicYear.findMany();
    expect(rows).toHaveLength(0);
  });

  it('WITH CHECK blocks writing a row into another tenant', async () => {
    await expect(
      TenantContext.run({ schoolId: schoolA }, () =>
        prisma.db.academicYear.create({
          data: { schoolId: schoolB, label: 'X', startDate: new Date(), endDate: new Date() },
        }),
      ),
    ).rejects.toThrow();
  });
});
