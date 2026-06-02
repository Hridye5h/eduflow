import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConnectionOptions, Job, Worker } from 'bullmq';
import IORedis, { Redis } from 'ioredis';
import { TenantContext } from '../common/tenant-context';
import { WhatsAppService } from './whatsapp.service';
import { DunningService } from '../dunning/dunning.service';
import { WA_QUEUE_NAME } from './job-queue.port';
import { WHATSAPP_SENDER, WhatsAppSender, WhatsAppSendInput } from './whatsapp-sender.port';

interface DispatchedJob {
  outboxId: string;
  schoolId: string;
  kind: 'PROCESS_INBOUND' | 'SEND_MESSAGE';
  refId: string | null;
  payload: unknown;
}

/**
 * BullMQ consumer for the WhatsApp queue. Each job runs inside a tenant scope
 * derived from the job data, so all DB writes stay RLS-correct. Only starts when
 * REDIS_URL is set, so the API boots in dev without Redis.
 *
 * Inbound handling is a stub for now (mark processed) — the Smart Dunning and
 * Test Report agents hook in here next.
 */
@Injectable()
export class WhatsAppWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppWorker.name);
  private worker?: Worker;
  private connection?: Redis;

  constructor(
    private readonly whatsapp: WhatsAppService,
    private readonly dunning: DunningService,
    @Inject(WHATSAPP_SENDER) private readonly sender: WhatsAppSender,
  ) {}

  onModuleInit(): void {
    const url = process.env.REDIS_URL;
    if (!url) {
      this.logger.warn('REDIS_URL not set — WhatsApp worker not started (dev mode)');
      return;
    }
    this.connection = new IORedis(url, { maxRetriesPerRequest: null });
    this.worker = new Worker(WA_QUEUE_NAME, (job: Job) => this.handle(job.data as DispatchedJob), {
      connection: this.connection as unknown as ConnectionOptions,
      concurrency: 5,
    });
    this.worker.on('failed', (job, err) =>
      this.logger.error(`job ${job?.id} failed: ${err.message}`),
    );
  }

  private async handle(data: DispatchedJob): Promise<void> {
    await TenantContext.run({ schoolId: data.schoolId }, async () => {
      if (data.kind === 'PROCESS_INBOUND' && data.refId) {
        // Stop-word guardrail: a parent's "STOP"/"lawyer"/"court" halts dunning
        // and flags a human — we never auto-reply to it.
        const inbound = await this.whatsapp.extractInboundText(data.refId);
        if (inbound?.text) {
          await this.dunning.handleInboundText(data.schoolId, inbound.fromPhone, inbound.text);
        }
        await this.whatsapp.markInboundProcessed(data.refId);
        return;
      }
      if (data.kind === 'SEND_MESSAGE') {
        await this.sender.send(data.schoolId, data.payload as WhatsAppSendInput);
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.connection?.quit();
  }
}
