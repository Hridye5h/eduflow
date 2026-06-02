import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHmac } from 'node:crypto';
import { OutboxStatus, WaEventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';
import { OutboxPoller } from './outbox.poller';
import { JobQueue } from './job-queue.port';

const hasDb = !!process.env.DATABASE_URL;
const d = hasDb ? describe : describe.skip;

class FakeQueue implements JobQueue {
  jobs: Array<{ name: string; data: Record<string, unknown>; opts?: { jobId?: string } }> = [];
  async add(name: string, data: Record<string, unknown>, opts?: { jobId?: string }) {
    this.jobs.push({ name, data, opts });
  }
}

function sign(secret: string, body: Buffer): string {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
}

d('WhatsApp ingest (transactional outbox)', () => {
  const SECRET = 'test-app-secret';
  const prisma = new PrismaService();
  const svc = new WhatsAppService(prisma);
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const phoneNumberId = `pn-${suffix}`;
  const waMessageId = `wamid-${suffix}`;
  let schoolId = '';

  const payload = Buffer.from(
    JSON.stringify({
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: phoneNumberId },
                messages: [{ id: waMessageId, from: '919000000000', type: 'text' }],
              },
            },
          ],
        },
      ],
    }),
  );

  beforeAll(async () => {
    process.env.WHATSAPP_APP_SECRET = SECRET;
    await prisma.onModuleInit();
    await prisma.$executeRawUnsafe(
      fs.readFileSync(path.join(__dirname, '..', '..', 'prisma', 'rls.sql'), 'utf8').replace(/;\s*$/, ''),
    );
    await prisma.runAsSystem(async () => {
      const school = await prisma.db.school.create({
        data: { name: 'WA Coaching', subdomain: `wa-${suffix}`, whatsappPhoneNumberId: phoneNumberId },
      });
      schoolId = school.id;
    });
  });

  afterAll(async () => {
    await prisma.runAsSystem(() => prisma.db.school.delete({ where: { id: schoolId } }));
    await prisma.onModuleDestroy();
  });

  it('rejects a bad signature', async () => {
    await expect(svc.ingest(payload, 'sha256=deadbeef')).rejects.toThrow();
  });

  it('persists raw event + PENDING outbox row atomically', async () => {
    const res = await svc.ingest(payload, sign(SECRET, payload));
    expect(res.accepted).toBe(1);

    await prisma.runAsSystem(async () => {
      const event = await prisma.db.whatsAppInboundEvent.findUnique({ where: { waMessageId } });
      expect(event?.schoolId).toBe(schoolId);
      expect(event?.status).toBe(WaEventStatus.RECEIVED);
      const outbox = await prisma.db.outboxItem.findMany({ where: { schoolId, status: OutboxStatus.PENDING } });
      expect(outbox).toHaveLength(1);
      expect(outbox[0].refId).toBe(event?.id);
    });
  });

  it('dedupes a re-delivered message (same waMessageId)', async () => {
    const res = await svc.ingest(payload, sign(SECRET, payload));
    expect(res.accepted).toBe(0);
    await prisma.runAsSystem(async () => {
      const count = await prisma.db.whatsAppInboundEvent.count({ where: { waMessageId } });
      expect(count).toBe(1);
    });
  });

  it('poller claims the PENDING row and enqueues it (idempotent jobId)', async () => {
    const queue = new FakeQueue();
    const poller = new OutboxPoller(prisma, queue);
    await poller.drain();

    const ours = queue.jobs.find((j) => j.data.schoolId === schoolId);
    expect(ours).toBeDefined();
    expect(ours?.opts?.jobId).toBe(ours?.data.outboxId);

    await prisma.runAsSystem(async () => {
      const outbox = await prisma.db.outboxItem.findMany({ where: { schoolId } });
      expect(outbox.every((o) => o.status === OutboxStatus.DISPATCHED)).toBe(true);
    });
  });
});
