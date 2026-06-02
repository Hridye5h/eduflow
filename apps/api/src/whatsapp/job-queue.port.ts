/**
 * Minimal job-queue seam so the outbox poller doesn't bind to BullMQ directly —
 * the BullMQ adapter implements this, and tests inject a fake. Production swaps
 * nothing; this just keeps Redis out of unit tests.
 */
export interface JobQueue {
  add(
    name: string,
    data: Record<string, unknown>,
    opts?: { delayMs?: number; jobId?: string },
  ): Promise<void>;
}

export const WA_JOB_QUEUE = Symbol('WA_JOB_QUEUE');
export const WA_QUEUE_NAME = 'whatsapp';
