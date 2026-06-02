import request from 'supertest';
import { bootstrapTestApp, registerSchool, resetDb } from './setup';

describe('Tenant isolation (e2e)', () => {
  let app: any, prisma: any, server: any;

  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); server = app.getHttpServer(); });
  afterAll(async () => { await prisma.$disconnect(); await app.close(); });
  beforeEach(async () => { await resetDb(prisma); });

  it('School A admin cannot see School B classes', async () => {
    const a = await registerSchool(app, { sub: 'alpha' });
    const b = await registerSchool(app, { sub: 'beta' });

    // Need an academic year for class creation. Use prisma to seed one.
    await prisma.academicYear.create({
      data: { schoolId: a.school.id, label: '2025-2026', startDate: new Date('2025-06-01'), endDate: new Date('2026-04-30'), isCurrent: true },
    });
    await prisma.academicYear.create({
      data: { schoolId: b.school.id, label: '2025-2026', startDate: new Date('2025-06-01'), endDate: new Date('2026-04-30'), isCurrent: true },
    });

    // alpha admin creates Grade 1
    const create = await request(server)
      .post('/classes')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ grade: 1, label: 'Grade 1 (alpha)' });
    expect(create.status).toBe(201);

    // alpha can read its class
    const listA = await request(server)
      .get('/classes')
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(listA.status).toBe(200);
    expect(listA.body.length).toBe(1);

    // beta admin lists — should not see alpha's class
    const listB = await request(server)
      .get('/classes')
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(listB.status).toBe(200);
    expect(listB.body.length).toBe(0);
  });

  it('Token from school A is rejected when subdomain header is school B', async () => {
    const a = await registerSchool(app, { sub: 'one' });
    await registerSchool(app, { sub: 'two' });

    const res = await request(server)
      .get('/school')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .set('x-school-subdomain', 'two');

    expect(res.status).toBe(401);
  });
});
