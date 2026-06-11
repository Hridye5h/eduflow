import { applyRlsAsOwner } from '../test-utils/rls';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertStudentAccess } from './student-access';

/**
 * Proves the within-school IDOR guard: staff may read any student, a student
 * only themselves, a parent only their linked children — otherwise it throws.
 */
const hasDb = !!process.env.DATABASE_URL;
const d = hasDb ? describe : describe.skip;

d('assertStudentAccess (within-school IDOR guard)', () => {
  const prisma = new PrismaService();
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  let schoolId = '';
  let studentA = '';
  let studentB = '';
  let parentId = '';

  beforeAll(async () => {
    await prisma.onModuleInit();
    await applyRlsAsOwner();
    await prisma.runAsSystem(async () => {
      const s = await prisma.db.school.create({ data: { name: 'Access Coaching', subdomain: `acc-${suffix}` } });
      schoolId = s.id;
      const a = await prisma.db.user.create({ data: { schoolId, role: Role.STUDENT, name: 'Student A' } });
      const b = await prisma.db.user.create({ data: { schoolId, role: Role.STUDENT, name: 'Student B' } });
      const p = await prisma.db.user.create({ data: { schoolId, role: Role.PARENT, name: 'Parent of A' } });
      studentA = a.id;
      studentB = b.id;
      parentId = p.id;
      await prisma.db.parentLink.create({ data: { parentId: p.id, studentId: a.id } });
    });
  });

  afterAll(async () => {
    await prisma.runAsSystem(() => prisma.db.school.delete({ where: { id: schoolId } }));
    await prisma.onModuleDestroy();
  });

  it('staff may access any student', async () => {
    await expect(assertStudentAccess(prisma, { sub: 'staff', role: Role.SUPER_ADMIN }, studentB)).resolves.toBeUndefined();
    await expect(assertStudentAccess(prisma, { sub: 'staff', role: Role.TEACHER }, studentB)).resolves.toBeUndefined();
  });

  it('a student may access only themselves', async () => {
    await expect(assertStudentAccess(prisma, { sub: studentA, role: Role.STUDENT }, studentA)).resolves.toBeUndefined();
    await expect(assertStudentAccess(prisma, { sub: studentA, role: Role.STUDENT }, studentB)).rejects.toThrow();
  });

  it('a parent may access only linked children', async () => {
    await expect(assertStudentAccess(prisma, { sub: parentId, role: Role.PARENT }, studentA)).resolves.toBeUndefined();
    await expect(assertStudentAccess(prisma, { sub: parentId, role: Role.PARENT }, studentB)).rejects.toThrow();
  });
});
