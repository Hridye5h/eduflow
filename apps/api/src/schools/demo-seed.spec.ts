import { Role } from '@prisma/client';
import { applyRlsAsOwner } from '../test-utils/rls';
import { TenantContext } from '../common/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import { DemoSeedService } from './demo-seed.service';

/**
 * Proves the one-click demo seed works end-to-end under RLS tenant context
 * (the same posture the live endpoint runs in), produces a coherent school,
 * and refuses to run twice.
 */
const hasDb = !!process.env.DATABASE_URL;
const d = hasDb ? describe : describe.skip;

d('DemoSeedService (one-click sample data)', () => {
  const prisma = new PrismaService();
  const service = new DemoSeedService(prisma);
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  let schoolId = '';
  let adminId = '';

  beforeAll(async () => {
    await prisma.onModuleInit();
    await applyRlsAsOwner();
    await prisma.runAsSystem(async () => {
      const school = await prisma.db.school.create({
        data: { name: 'Demo Seed School', subdomain: `seed-${suffix}` },
      });
      schoolId = school.id;
      await prisma.db.academicYear.create({
        data: {
          schoolId,
          label: '2026-2027',
          startDate: new Date(Date.UTC(2026, 3, 1)),
          endDate: new Date(Date.UTC(2027, 2, 31)),
          isCurrent: true,
        },
      });
      const admin = await prisma.db.user.create({
        data: { schoolId, role: Role.SUPER_ADMIN, name: 'Seed Admin' },
      });
      adminId = admin.id;
    });
  });

  afterAll(async () => {
    await prisma.runAsSystem(() => prisma.db.school.delete({ where: { id: schoolId } }));
    await prisma.onModuleDestroy();
  });

  it('seeds a coherent school inside the tenant context', async () => {
    const summary = await TenantContext.run({ schoolId }, () => service.seed(schoolId, adminId));

    expect(summary.students).toBe(44);
    expect(summary.teachers).toBe(5);
    expect(summary.classes).toBe(2);
    expect(summary.exams).toBe(6);
    expect(summary.attendanceRecords).toBeGreaterThan(900);
    expect(summary.feePayments).toBe(88);

    await TenantContext.run({ schoolId }, async () => {
      const [students, marks, payments, periods, posts, consent] = await Promise.all([
        prisma.db.user.count({ where: { schoolId, role: Role.STUDENT } }),
        prisma.db.examMark.count({ where: { schoolId } }),
        prisma.db.feePayment.count({ where: { schoolId } }),
        prisma.db.timetablePeriod.count({ where: { timetable: { schoolId } } }),
        prisma.db.post.count({ where: { schoolId } }),
        prisma.db.consentEvent.count({ where: { schoolId, status: 'GRANTED' } }),
      ]);
      expect(students).toBe(44);
      // 2 published full-coverage exams (22 each) + 1 draft at 60% (14) per class
      expect(marks).toBe(2 * (22 + 22 + 14));
      expect(payments).toBe(88);
      expect(periods).toBe(2 * 6 * 6);
      expect(posts).toBe(4); // 2 school-wide + 1 assignment per section
      expect(consent).toBe(6);
    });
  });

  it('refuses to seed a school that already has students', async () => {
    await expect(
      TenantContext.run({ schoolId }, () => service.seed(schoolId, adminId)),
    ).rejects.toThrow(/no students yet/i);
  });
});
