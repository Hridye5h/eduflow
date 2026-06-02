import request from 'supertest';
import { bootstrapTestApp, registerSchool, resetDb } from './setup';

describe('Attendance flow (e2e)', () => {
  let app: any, prisma: any, server: any;

  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); server = app.getHttpServer(); });
  afterAll(async () => { await prisma.$disconnect(); await app.close(); });
  beforeEach(async () => { await resetDb(prisma); });

  it('admin can mark and read attendance for a section', async () => {
    const reg = await registerSchool(app, { sub: 'attschool' });
    const token = reg.accessToken;
    const schoolId = reg.school.id;

    const year = await prisma.academicYear.create({
      data: { schoolId, label: '2025-2026', startDate: new Date('2025-06-01'), endDate: new Date('2026-04-30'), isCurrent: true },
    });
    const cls = await prisma.class.create({ data: { schoolId, academicYearId: year.id, grade: 10, label: 'Grade 10' } });
    const sec = await prisma.section.create({ data: { schoolId, classId: cls.id, name: 'A' } });
    const s1 = await prisma.user.create({ data: { schoolId, role: 'STUDENT', name: 'Alice', sectionId: sec.id } });
    const s2 = await prisma.user.create({ data: { schoolId, role: 'STUDENT', name: 'Bob', sectionId: sec.id } });

    // mark
    const mark = await request(server)
      .post(`/attendance/section/${sec.id}/mark`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: '2026-05-13',
        rows: [
          { studentId: s1.id, status: 'PRESENT' },
          { studentId: s2.id, status: 'ABSENT' },
        ],
      });
    expect(mark.status).toBe(201);
    expect(mark.body.saved).toBe(2);

    // read
    const read = await request(server)
      .get(`/attendance/section/${sec.id}?date=2026-05-13`)
      .set('Authorization', `Bearer ${token}`);
    expect(read.status).toBe(200);
    const byId: any = Object.fromEntries(read.body.map((r: any) => [r.id, r]));
    expect(byId[s1.id].status).toBe('PRESENT');
    expect(byId[s2.id].status).toBe('ABSENT');
  });

  it('idempotent — re-marking same date overwrites status', async () => {
    const reg = await registerSchool(app, { sub: 'idemp' });
    const token = reg.accessToken;
    const schoolId = reg.school.id;

    const year = await prisma.academicYear.create({
      data: { schoolId, label: '2025-2026', startDate: new Date('2025-06-01'), endDate: new Date('2026-04-30'), isCurrent: true },
    });
    const cls = await prisma.class.create({ data: { schoolId, academicYearId: year.id, grade: 1, label: 'G1' } });
    const sec = await prisma.section.create({ data: { schoolId, classId: cls.id, name: 'A' } });
    const s = await prisma.user.create({ data: { schoolId, role: 'STUDENT', name: 'Eve', sectionId: sec.id } });

    await request(server)
      .post(`/attendance/section/${sec.id}/mark`)
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-05-13', rows: [{ studentId: s.id, status: 'ABSENT' }] })
      .expect(201);

    await request(server)
      .post(`/attendance/section/${sec.id}/mark`)
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-05-13', rows: [{ studentId: s.id, status: 'PRESENT' }] })
      .expect(201);

    const count = await prisma.attendanceRecord.count({ where: { studentId: s.id } });
    expect(count).toBe(1);
    const rec = await prisma.attendanceRecord.findFirst({ where: { studentId: s.id } });
    expect(rec.status).toBe('PRESENT');
  });
});
