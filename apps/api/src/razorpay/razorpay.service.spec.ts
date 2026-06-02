import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHmac } from 'node:crypto';
import { DunningStatus, FeeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant-context';
import { ProvenanceService } from '../provenance/provenance.service';
import { DunningService } from '../dunning/dunning.service';
import { RazorpayService } from './razorpay.service';

const hasDb = !!process.env.DATABASE_URL;
const d = hasDb ? describe : describe.skip;

function sign(secret: string, body: Buffer): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

d('RazorpayService (closes the dunning loop)', () => {
  const SECRET = 'rzp-webhook-secret';
  const prisma = new PrismaService();
  const dunning = new DunningService(prisma, new ProvenanceService(prisma));
  const svc = new RazorpayService(prisma, dunning);
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  let schoolId = '';
  let feePaymentId = '';
  let runId = '';
  const inTenant = <T>(fn: () => Promise<T>) => TenantContext.run({ schoolId }, fn);

  beforeAll(async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
    await prisma.onModuleInit();
    await prisma.$executeRawUnsafe(
      fs.readFileSync(path.join(__dirname, '..', '..', 'prisma', 'rls.sql'), 'utf8').replace(/;\s*$/, ''),
    );
    await prisma.runAsSystem(async () => {
      const s = await prisma.db.school.create({ data: { name: 'Rzp Coaching', subdomain: `rzp-${suffix}` } });
      schoolId = s.id;
      const student = await prisma.db.user.create({ data: { schoolId, role: 'STUDENT', name: 'Ravi' } });
      const structure = await prisma.db.feeStructure.create({
        data: { schoolId, classId: 'c1', name: 'Term 1', amount: 2500 },
      });
      const fp = await prisma.db.feePayment.create({
        data: { schoolId, structureId: structure.id, studentId: student.id, amountPaid: 0, status: FeeStatus.PENDING },
      });
      feePaymentId = fp.id;
      const run = await prisma.db.dunningRun.create({
        data: { schoolId, studentId: student.id, feePaymentId, amount: 2500, dueDate: new Date(), toPhone: '9100000000' },
      });
      runId = run.id;
    });
  });

  afterAll(async () => {
    await prisma.runAsSystem(() => prisma.db.school.delete({ where: { id: schoolId } }));
    await prisma.onModuleDestroy();
  });

  const webhook = (event: string) =>
    Buffer.from(
      JSON.stringify({
        event,
        payload: { payment: { entity: { id: `pay_${suffix}`, amount: 250000, notes: { schoolId, feePaymentId } } } },
      }),
    );

  it('rejects a bad signature', async () => {
    await expect(svc.handleWebhook(webhook('payment.captured'), 'bad')).rejects.toThrow();
  });

  it('payment.captured marks the fee PAID and stops the dunning run', async () => {
    const body = webhook('payment.captured');
    const res = await svc.handleWebhook(body, sign(SECRET, body));
    expect(res.handled).toBe(true);
    expect(res.stoppedRuns).toBe(1);

    await inTenant(async () => {
      const fp = await prisma.db.feePayment.findUnique({ where: { id: feePaymentId } });
      expect(fp?.status).toBe(FeeStatus.PAID);
      expect(fp?.txnRef).toBe(`pay_${suffix}`);
      const run = await prisma.db.dunningRun.findUnique({ where: { id: runId } });
      expect(run?.status).toBe(DunningStatus.PAID);
    });
  });

  it('ignores unrelated events', async () => {
    const body = webhook('payment.failed');
    const res = await svc.handleWebhook(body, sign(SECRET, body));
    expect(res.handled).toBe(false);
  });
});
