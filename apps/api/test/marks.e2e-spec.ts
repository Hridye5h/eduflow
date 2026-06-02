import request from 'supertest';
import { bootstrapTestApp, registerSchool, resetDb } from './setup';

describe('Marks flow (e2e)', () => {
  let app: any, prisma: any, server: any;

  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); server = app.getHttpServer(); });
  afterAll(async () => { await prisma.$disconnect(); await app.close(); });
  beforeEach(async () => { await resetDb(prisma); });

  it('create exam → enter marks → publish → report card includes marks', async () => {
    const reg = await registerSchool(app, { sub: 'marks' });
    const token = reg.accessToken;
    const schoolId = reg.school.id;

    const year = await prisma.academicYear.create({
      data: { schoolId, label: '2025-2026', startDate: new Date('2025-06-01'), endDate: new Date('2026-04-30'), isCurrent: true },
    });
    const cls = await prisma.class.create({ data: { schoolId, academicYearId: year.id, grade: 10, label: 'Grade 10' } });
    const sec = await prisma.section.create({ data: { schoolId, classId: cls.id, name: 'A' } });
    const stu = await prisma.user.create({ data: { schoolId, role: 'STUDENT', name: 'Lisa', sectionId: sec.id } });

    // create exam
    const created = await request(server)
      .post('/exams')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mid term', type: 'MID_TERM', classId: cls.id, maxMarks: 100 });
    expect(created.status).toBe(201);
    const examId = created.body.id;

    // enter marks
    await request(server)
      .post(`/exams/${examId}/marks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rows: [{ studentId: stu.id, marks: 82 }] })
      .expect(201);

    // before publish — report card should be empty
    const before = await request(server)
      .get(`/students/${stu.id}/report-card`)
      .set('Authorization', `Bearer ${token}`);
    expect(before.body.exams.length).toBe(0);

    // publish
    await request(server)
      .post(`/exams/${examId}/publish`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    // after publish — visible
    const after = await request(server)
      .get(`/students/${stu.id}/report-card`)
      .set('Authorization', `Bearer ${token}`);
    expect(after.body.exams.length).toBe(1);
    expect(after.body.cumulative.total).toBe(82);
    expect(after.body.cumulative.percentage).toBe(82);
  });

  it('rejects marks above max', async () => {
    const reg = await registerSchool(app, { sub: 'marksval' });
    const token = reg.accessToken;
    const schoolId = reg.school.id;

    const year = await prisma.academicYear.create({
      data: { schoolId, label: '2025-2026', startDate: new Date(), endDate: new Date(), isCurrent: true },
    });
    const cls = await prisma.class.create({ data: { schoolId, academicYearId: year.id, grade: 1, label: 'G1' } });
    const stu = await prisma.user.create({ data: { schoolId, role: 'STUDENT', name: 'Bart' } });
    const exam = await prisma.exam.create({
      data: { schoolId, academicYearId: year.id, name: 'X', type: 'UNIT_TEST', classId: cls.id, maxMarks: 50 },
    });

    const res = await request(server)
      .post(`/exams/${exam.id}/marks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rows: [{ studentId: stu.id, marks: 999 }] });
    expect(res.status).toBe(400);
  });
});
