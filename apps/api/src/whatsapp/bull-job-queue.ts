import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConnectionOptions, Queue } from 'bullmq';
import IORedis, { Redis } from 'ioredis';
import { JobQueue, WA_QUEUE_NAME } from './job-queue.port';

/**
 * BullMQ-backed job queue. Lazy-connects to Redis via REDIS_URL. When REDIS_URL
 * is unset (local dev without Redis) it degrades to a logged no-op so the API
 * still boots — the transactional outbox rows persist either way and drain once
 * Redis is available.
 */
@Injectable()
export class BullJobQueue implements JobQueue, OnModuleDestroy {
  private readonly logger = new Logger(BullJobQueue.name);
  private readonly connection?: Redis;
  private readonly queue?: Queue;

  constructor() {
    const url = process.env.REDIS_URL;
    if (url) {
      // maxRetriesPerRequest: null is required by BullMQ; lazyConnect avoids
      // connecting until the first enqueue.
      this.connection = new IORedis(url, { maxRetriesPerRequest: null, lazyConnect: true });
      this.queue = new Queue(WA_QUEUE_NAME, {
        connection: this.connection as unknown as ConnectionOptions,
      });
    } else {
      this.logger.warn('REDIS_URL not set — WhatsApp job queue is a no-op (dev mode)');
    }
  }

  async add(
    name: string,
    data: Record<string, unknown>,
    opts?: { delayMs?: number; jobId?: string },
  ): Promise<void> {
    if (!this.queue) {
      this.logger.debug(`queue noop: ${name}`);
      return;
    }
    await this.queue.add(name, data, {
      removeOnComplete: 1000,
      removeOnFail: 5000,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
      ...(opts?.jobId ? { jobId: opts.jobId } : {}),
      ...(opts?.delayMs ? { delay: opts.delayMs } : {}),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
    await this.connection?.quit();
  }
}
