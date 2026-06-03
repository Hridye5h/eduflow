import { Injectable } from '@nestjs/common';
import { JobQueue } from './job-queue.port';
import { WhatsAppWorker, DispatchedJob } from './whatsapp.worker';

/**
 * In-process JobQueue — used when REDIS_URL is unset (single-instance dev /
 * small deploy). Instead of enqueuing to BullMQ, it dispatches the job
 * synchronously in the same process via the WhatsApp worker. If dispatch throws,
 * the error propagates to the OutboxPoller, which returns the row to PENDING
 * with backoff — so delivery still retries and nothing is lost.
 *
 * Without this, a blank REDIS_URL meant the poller claimed each outbox row and
 * the BullMQ no-op dropped it: messages were never delivered. Set REDIS_URL to
 * switch to the durable BullMQ queue + worker for multi-instance / high volume.
 */
@Injectable()
export class InProcessJobQueue implements JobQueue {
  constructor(private readonly worker: WhatsAppWorker) {}

  async add(_name: string, data: Record<string, unknown>): Promise<void> {
    await this.worker.dispatch(data as unknown as DispatchedJob);
  }
}
