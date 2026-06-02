import request from 'supertest';
import { bootstrapTestApp, resetDb, registerSchool } from './setup';
import { TestOtpStore } from '../src/_test-helpers/test-otp.store';

describe('Auth (e2e)', () => {
  let app: any, prisma: any, server: any;

  beforeAll(async () => {
    process.env.ENABLE_TEST_HELPERS = 'true';
    ({ app, prisma } = await bootstrapTestApp());
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(prisma);
    TestOtpStore.clear();
  });

  it('registers a school and returns a token', async () => {
    const res = await request(server)
      .post('/auth/register-school')
      .send({
        schoolName: 'Springfield',
        subdomain: 'springfield',
        adminName: 'Skinner',
        adminEmail: 'skinner@springfield.test',
        adminPassword: 'admin123',
      });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.school.subdomain).toBe('springfield');
  });

  it('rejects duplicate subdomain', async () => {
    await registerSchool(app, { sub: 'dup' });
    const res = await request(server)
      .post('/auth/register-school')
      .send({
        schoolName: 'Other',
        subdomain: 'dup',
        adminName: 'X',
        adminEmail: 'x@dup.test',
        adminPassword: 'pw123456',
      });
    expect(res.status).toBe(400);
  });

  it('logs in with correct password and rejects wrong password', async () => {
    await registerSchool(app, { sub: 'login' });
    const ok = await request(server)
      .post('/auth/login')
      .send({ subdomain: 'login', email: 'admin@login.test', password: 'pw123456' });
    expect(ok.status).toBe(201);
    expect(ok.body.accessToken).toBeDefined();

    // LoginDto requires password length >= 6, so 'wrong' would 400 before
    // hitting the service. Use a long-enough wrong password.
    const bad = await request(server)
      .post('/auth/login')
      .send({ subdomain: 'login', email: 'admin@login.test', password: 'wrongpassword' });
    expect(bad.status).toBe(401);
  });

  it('completes the full OTP loop: request → fetch → verify → token', async () => {
    await registerSchool(app, { sub: 'otpschool' });
    const identifier = 'admin@otpschool.test';

    // 1. request the OTP
    await request(server)
      .post('/auth/otp/request')
      .send({ subdomain: 'otpschool', identifier })
      .expect(201);

    // 2. fetch the plaintext via the test helper endpoint
    const helper = await request(server)
      .get('/_test/last-otp')
      .query({ identifier });
    expect(helper.status).toBe(200);
    expect(helper.body.code).toMatch(/^\d{6}$/);
    const code: string = helper.body.code;

    // 3. verify the OTP — mints a token
    const verify = await request(server)
      .post('/auth/otp/verify')
      .send({ subdomain: 'otpschool', identifier, code });
    expect(verify.status).toBe(201);
    expect(verify.body.accessToken).toBeDefined();
    expect(verify.body.user.email).toBe(identifier);

    // 4. reusing the same OTP fails (marked used)
    const reuse = await request(server)
      .post('/auth/otp/verify')
      .send({ subdomain: 'otpschool', identifier, code });
    expect(reuse.status).toBe(401);

    // 5. wrong code fails
    const wrong = await request(server)
      .post('/auth/otp/verify')
      .send({ subdomain: 'otpschool', identifier, code: '000000' });
    expect(wrong.status).toBe(401);
  });

  it('test helper endpoint responds 403 when ENABLE_TEST_HELPERS is off', async () => {
    const prev = process.env.ENABLE_TEST_HELPERS;
    process.env.ENABLE_TEST_HELPERS = 'false';
    try {
      const res = await request(server).get('/_test/last-otp').query({ identifier: 'x' });
      expect(res.status).toBe(403);
    } finally {
      process.env.ENABLE_TEST_HELPERS = prev;
    }
  });
});
