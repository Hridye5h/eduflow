import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { OutboxStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JobQueue, WA_JOB_QUEUE } from './job-queue.port';

const BATCH = 50;

/**
 * Drains the transactional outbox to the job queue. Runs cross-tenant as a
 * system job. Each row is claimed with a conditional PENDING→DISPATCHED update
 * (so only one instance wins it), then enqueued with jobId = outboxId for
 * idempotency. If the enqueue fails the row is returned to PENDING with a
 * backoff, so nothing is lost.
 */
@Injectable()
export class OutboxPoller {
  private readonly logger = new Logger(OutboxPoller.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(WA_JOB_QUEUE) private readonly queue: JobQueue,
  ) {}

  @Interval('outbox-drain', 2000)
  async drain(): Promise<void> {
    if (this.running) return; // no overlapping runs
    this.running = true;
    try {
      await this.prisma.runAsSystem(async () => {
        const now = new Date();
        const pending = await this.prisma.db.outboxItem.findMany({
          where: { status: OutboxStatus.PENDING, availableAt: { lte: now } },
          orderBy: { availableAt: 'asc' },
          take: BATCH,
        });
        for (const item of pending) {
          await this.dispatch(item.id, item.schoolId, item.kind, item.refId, item.payload);
        }
      });
    } catch (err) {
      this.logger.error(`outbox drain failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  private async dispatch(
    id: string,
    schoolId: string,
    kind: string,
    refId: string | null,
    payload: unknown,
  ): Promise<void> {
    // Claim: only the instance that flips PENDING→DISPATCHED proceeds.
    const claim = await this.prisma.db.outboxItem.updateMany({
      where: { id, status: OutboxStatus.PENDING },
      data: { status: OutboxStatus.DISPATCHED, dispatchedAt: new Date() },
    });
    if (claim.count !== 1) return;

    try {
      await this.queue.add(kind, { outboxId: id, schoolId, kind, refId, payload }, { jobId: id });
    } catch (err) {
      // Return to PENDING with backoff so the next drain retries it.
      await this.prisma.db.outboxItem.update({
        where: { id },
        data: {
          status: OutboxStatus.PENDING,
          attempts: { increment: 1 },
          lastError: (err as Error).message.slice(0, 500),
          availableAt: new Date(Date.now() + 30_000),
        },
      });
    }
  }
}
