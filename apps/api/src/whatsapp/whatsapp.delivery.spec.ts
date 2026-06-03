import { applyRlsAsOwner } from '../test-utils/rls';
import { OutboxKind, OutboxStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxPoller } from './outbox.poller';
import { InProcessJobQueue } from './in-process-job-queue';
import { WhatsAppWorker } from './whatsapp.worker';
import { WhatsAppService } from './whatsapp.service';
import { DunningService } from '../dunning/dunning.service';
import { WhatsAppSender, WhatsAppSendInput, WhatsAppSendResult } from './whatsapp-sender.port';

/**
 * Proves the no-Redis delivery path: a PENDING outbox row drains through the
 * OutboxPoller → InProcessJobQueue → WhatsAppWorker → sender, and is marked
 * DISPATCHED. Uses a spy sender, so it stays offline and deterministic.
 */
const hasDb = !!process.env.DATABASE_URL;
const d = hasDb ? describe : describe.skip;

d('Outbox → in-process WhatsApp delivery (no Redis)', () => {
  const prisma = new PrismaService();
  const sent: Array<{ schoolId: string; input: WhatsAppSendInput }> = [];
  const spySender: WhatsAppSender = {
    async send(schoolId: string, input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
      sent.push({ schoolId, input });
      return { provider: 'noop' };
    },
  };
  // SEND_MESSAGE dispatch only touches the sender; whatsapp/dunning are unused here.
  const worker = new WhatsAppWorker(
    undefined as unknown as WhatsAppService,
    undefined as unknown as DunningService,
    spySender,
  );
  const poller = new OutboxPoller(prisma, new InProcessJobQueue(worker));
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  let schoolId = '';

  beforeAll(async () => {
    await prisma.onModuleInit();
    await applyRlsAsOwner();
    await prisma.runAsSystem(async () => {
      const s = await prisma.db.school.create({ data: { name: 'WA Coaching', subdomain: `wa-${suffix}` } });
      schoolId = s.id;
    });
  });

  afterAll(async () => {
    await prisma.runAsSystem(() => prisma.db.school.delete({ where: { id: schoolId } }));
    await prisma.onModuleDestroy();
  });

  it('drains a PENDING SEND_MESSAGE to the sender and marks it DISPATCHED', async () => {
    const item = await prisma.runAsSystem(() =>
      prisma.db.outboxItem.create({
        data: {
          schoolId,
          kind: OutboxKind.SEND_MESSAGE,
          payload: { toPhone: '919900000000', text: 'Namaste — fees reminder' } as unknown as Prisma.InputJsonValue,
        },
      }),
    );

    await poller.drain();

    expect(sent).toHaveLength(1);
    expect(sent[0].schoolId).toBe(schoolId);
    expect(sent[0].input.toPhone).toBe('919900000000');

    const after = await prisma.runAsSystem(() =>
      prisma.db.outboxItem.findUnique({ where: { id: item.id } }),
    );
    expect(after?.status).toBe(OutboxStatus.DISPATCHED);
  });
});
