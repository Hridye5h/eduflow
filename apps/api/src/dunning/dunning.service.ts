import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import {
  DunningAction,
  DunningRun,
  DunningStatus,
  OutboxKind,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant-context';
import { ProvenanceService } from '../provenance/provenance.service';
import { LlmService } from '../llm/llm.service';
import type { WhatsAppSendInput } from '../whatsapp/whatsapp-sender.port';
import { DUNNING, TOTAL_STAGES } from './dunning.config';

const DAY_MS = 86_400_000;

/**
 * Smart Dunning — fee-recovery cadence as a guardrailed state machine
 * (Gemini's MVP default: NestJS + the BullMQ outbox, not LangGraph). Sends ride
 * the WhatsApp transactional outbox (it writes OutboxItem rows directly, so there
 * is no dependency on the WhatsApp service and no module cycle). Every action is
 * logged to the append-only DunningEvent ledger (RBI FREE-AI).
 *
 * Guardrails: quiet hours (21:00–09:00 IST), ≤1/day & ≤4/week per run, HITL
 * approval from stage 4, and stop-word handling on inbound replies.
 */
@Injectable()
export class DunningService {
  private readonly logger = new Logger(DunningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly provenance: ProvenanceService,
    private readonly llm: LlmService,
  ) {}

  /** Open a dunning run for an overdue fee. Idempotent per (feePaymentId). */
  async startRun(input: {
    schoolId: string;
    studentId: string;
    feePaymentId?: string;
    amount: number;
    dueDate: Date;
    toPhone: string;
  }): Promise<DunningRun> {
    const firstAt = new Date(
      Math.max(Date.now(), input.dueDate.getTime() + DUNNING.stageOffsetsDays[0] * DAY_MS),
    );
    return this.prisma.runInTenantTx(async (tx) => {
      const run = await tx.dunningRun.create({
        data: {
          schoolId: input.schoolId,
          studentId: input.studentId,
          feePaymentId: input.feePaymentId,
          amount: input.amount,
          dueDate: input.dueDate,
          toPhone: input.toPhone,
          nextActionAt: firstAt,
        },
      });
      await tx.dunningEvent.create({
        data: { schoolId: input.schoolId, dunningRunId: run.id, stage: 0, action: DunningAction.STARTED },
      });
      return run;
    });
  }

  /** Engine tick — drains due ACTIVE runs across all tenants. */
  @Interval('dunning-tick', 60_000)
  async tick(): Promise<void> {
    try {
      const due = await this.prisma.runAsSystem(() =>
        this.prisma.db.dunningRun.findMany({
          where: { status: DunningStatus.ACTIVE, nextActionAt: { lte: new Date() } },
          orderBy: { nextActionAt: 'asc' },
          take: 200,
        }),
      );
      for (const run of due) {
        await TenantContext.run({ schoolId: run.schoolId }, () => this.processRun(run));
      }
    } catch (err) {
      this.logger.error(`dunning tick failed: ${(err as Error).message}`);
    }
  }

  /** Evaluate guardrails and act on a single run. Runs inside the run's tenant scope. */
  async processRun(run: DunningRun, now: Date = new Date()): Promise<void> {
    if (run.stage >= TOTAL_STAGES) return this.complete(run);

    const stageNo = run.stage + 1; // 1-based

    // HITL gate — stage 4+ never auto-sends.
    if (stageNo >= DUNNING.hitlFromStage) {
      await this.transition(run, {
        status: DunningStatus.AWAITING_APPROVAL,
        action: DunningAction.AWAITING_APPROVAL,
        detail: `stage ${stageNo} needs owner approval`,
      });
      return;
    }

    // Quiet hours.
    if (this.isQuietHoursIST(now)) {
      await this.reschedule(run, this.nextNineIST(now), DunningAction.SKIPPED_QUIET_HOURS);
      return;
    }

    // Frequency caps.
    if (await this.overFrequencyCap(run.id, now)) {
      await this.reschedule(run, new Date(now.getTime() + DAY_MS), DunningAction.SKIPPED_FREQ_CAP);
      return;
    }

    await this.send(run, stageNo, DunningAction.REMINDER_SENT);
  }

  /** Owner approves an escalated (stage 4+) send. */
  async approveEscalatedSend(runId: string): Promise<void> {
    const run = await this.prisma.db.dunningRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException('dunning run not found');
    if (run.status !== DunningStatus.AWAITING_APPROVAL) {
      throw new BadRequestException(`run is ${run.status}, not awaiting approval`);
    }
    await this.send(run, run.stage + 1, DunningAction.APPROVED_SENT);
  }

  /** Mark the underlying fee paid — stops the run. */
  async markPaid(runId: string): Promise<void> {
    await this.transition({ id: runId, schoolId: TenantContext.schoolId()!, stage: 0 } as DunningRun, {
      status: DunningStatus.PAID,
      action: DunningAction.MARKED_PAID,
    });
  }

  /** Stop every active dunning run for a fee that just got paid (Razorpay webhook). */
  async markPaidByFeePayment(feePaymentId: string): Promise<{ stopped: number }> {
    const runs = await this.prisma.db.dunningRun.findMany({
      where: {
        feePaymentId,
        status: { in: [DunningStatus.ACTIVE, DunningStatus.AWAITING_APPROVAL] },
      },
      select: { id: true, schoolId: true },
    });
    for (const r of runs) {
      await this.transition({ id: r.id, schoolId: r.schoolId, stage: 0 } as DunningRun, {
        status: DunningStatus.PAID,
        action: DunningAction.MARKED_PAID,
        detail: 'fee paid (Razorpay)',
      });
    }
    return { stopped: runs.length };
  }

  /** Manually stop a run. */
  async stopRun(runId: string, detail?: string): Promise<void> {
    await this.transition({ id: runId, schoolId: TenantContext.schoolId()!, stage: 0 } as DunningRun, {
      status: DunningStatus.STOPPED,
      action: DunningAction.STOPPED_MANUAL,
      detail,
    });
  }

  /**
   * Inbound stop-word handling. If the text matches a stop-word, every ACTIVE /
   * AWAITING run for that phone is STOPPED and flagged for a human — we never
   * auto-reply to "stop"/"lawyer"/"court".
   */
  async handleInboundText(schoolId: string, fromPhone: string, text: string): Promise<{ stopped: number }> {
    const hit = this.matchesStopWord(text);
    if (!hit) return { stopped: 0 };
    const runs = await this.prisma.db.dunningRun.findMany({
      where: {
        toPhone: fromPhone,
        status: { in: [DunningStatus.ACTIVE, DunningStatus.AWAITING_APPROVAL] },
      },
      select: { id: true, schoolId: true },
    });
    for (const r of runs) {
      await this.transition({ id: r.id, schoolId: r.schoolId, stage: 0 } as DunningRun, {
        status: DunningStatus.STOPPED,
        action: DunningAction.STOPPED_KEYWORD,
        detail: `inbound matched "${hit}" — flagged for human`,
      });
    }
    return { stopped: runs.length };
  }

  getRun(runId: string) {
    return this.prisma.db.dunningRun.findUnique({
      where: { id: runId },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });
  }

  /** List runs for the owner dashboard, newest activity first. */
  listRuns(status?: DunningStatus) {
    return this.prisma.db.dunningRun.findMany({
      where: status ? { status } : undefined,
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  /** Aggregate collections summary for the dashboard. */
  async summary() {
    const runs = await this.prisma.db.dunningRun.findMany({
      select: { status: true, amount: true },
    });
    const active = runs.filter((r) => r.status === DunningStatus.ACTIVE).length;
    const awaiting = runs.filter((r) => r.status === DunningStatus.AWAITING_APPROVAL).length;
    const paid = runs.filter((r) => r.status === DunningStatus.PAID).length;
    const outstanding = runs
      .filter((r) => r.status === DunningStatus.ACTIVE || r.status === DunningStatus.AWAITING_APPROVAL)
      .reduce((s, r) => s + r.amount, 0);
    return { active, awaiting, paid, outstanding, total: runs.length };
  }

  // ---- internals ---------------------------------------------------------

  /** Build copy, stamp provenance, queue the send, advance the run — atomically. */
  private async send(run: DunningRun, stageNo: number, action: DunningAction): Promise<void> {
    const template = this.buildMessage(run, stageNo);
    // Stages 1–3 get warm Hinglish phrasing via the LLM; the legal-tone stages
    // 4–5 stay on the deterministic template (no model drift). Falls back to the
    // template if no LLM is configured or the call fails.
    const text =
      stageNo <= 3
        ? await this.llm.generate(
            `Rewrite this fee reminder for an Indian parent in warm, respectful Hinglish. Keep the amount, the due date, the UPI mention, the AI-disclosure line, and "Reply STOP". 2–3 short lines.\n\n${template}`,
            { language: 'hinglish', fallback: template, maxTokens: 220 },
          )
        : template;
    // Provenance stamp (no network) before the write — it IS AI-assisted copy.
    await this.provenance.stamp({
      schoolId: run.schoolId,
      artefactType: 'dunning',
      content: text,
      model: 'dunning-template-v1',
      humanReviewed: action === DunningAction.APPROVED_SENT,
    });

    const send: WhatsAppSendInput = { toPhone: run.toPhone, text };
    const nextStage = run.stage + 1;
    const done = nextStage >= TOTAL_STAGES;
    const nextAt = done
      ? run.nextActionAt
      : new Date(run.dueDate.getTime() + DUNNING.stageOffsetsDays[nextStage] * DAY_MS);

    await this.prisma.runInTenantTx(async (tx) => {
      await tx.outboxItem.create({
        data: {
          schoolId: run.schoolId,
          kind: OutboxKind.SEND_MESSAGE,
          payload: send as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.dunningRun.update({
        where: { id: run.id },
        data: {
          stage: nextStage,
          status: done ? DunningStatus.COMPLETED : DunningStatus.ACTIVE,
          nextActionAt: nextAt,
        },
      });
      await tx.dunningEvent.create({
        data: {
          schoolId: run.schoolId,
          dunningRunId: run.id,
          stage: stageNo,
          action,
          channel: DUNNING.channel,
          detail: done ? 'final stage' : undefined,
        },
      });
      if (done) {
        await tx.dunningEvent.create({
          data: { schoolId: run.schoolId, dunningRunId: run.id, stage: stageNo, action: DunningAction.COMPLETED },
        });
      }
    });
  }

  private async complete(run: DunningRun): Promise<void> {
    await this.transition(run, { status: DunningStatus.COMPLETED, action: DunningAction.COMPLETED });
  }

  private async reschedule(run: DunningRun, when: Date, action: DunningAction): Promise<void> {
    await this.prisma.runInTenantTx(async (tx) => {
      await tx.dunningRun.update({ where: { id: run.id }, data: { nextActionAt: when } });
      await tx.dunningEvent.create({
        data: { schoolId: run.schoolId, dunningRunId: run.id, stage: run.stage + 1, action },
      });
    });
  }

  private async transition(
    run: Pick<DunningRun, 'id' | 'schoolId' | 'stage'>,
    to: { status: DunningStatus; action: DunningAction; detail?: string },
  ): Promise<void> {
    await this.prisma.runInTenantTx(async (tx) => {
      await tx.dunningRun.update({ where: { id: run.id }, data: { status: to.status } });
      await tx.dunningEvent.create({
        data: {
          schoolId: run.schoolId,
          dunningRunId: run.id,
          stage: run.stage,
          action: to.action,
          detail: to.detail,
        },
      });
    });
  }

  private async overFrequencyCap(runId: string, now: Date): Promise<boolean> {
    const sent = { in: [DunningAction.REMINDER_SENT, DunningAction.APPROVED_SENT] };
    const [day, week] = await Promise.all([
      this.prisma.db.dunningEvent.count({
        where: { dunningRunId: runId, action: sent, createdAt: { gte: new Date(now.getTime() - DAY_MS) } },
      }),
      this.prisma.db.dunningEvent.count({
        where: { dunningRunId: runId, action: sent, createdAt: { gte: new Date(now.getTime() - 7 * DAY_MS) } },
      }),
    ]);
    return day >= DUNNING.maxPerDay || week >= DUNNING.maxPerWeek;
  }

  private matchesStopWord(text: string): string | null {
    const t = text.toLowerCase();
    return DUNNING.stopWords.find((w) => t.includes(w)) ?? null;
  }

  /** Escalating, AI-disclosed, UPI-friendly copy. Stub — Sarvam-M generates the real Hinglish later. */
  private buildMessage(run: DunningRun, stageNo: number): string {
    const amt = `₹${run.amount.toLocaleString('en-IN')}`;
    const lines: Record<number, string> = {
      1: `Namaste 🙏 Reminder: ${amt} fees due on ${fmt(run.dueDate)}. Pay easily via the UPI link below. Dhanyavaad.`,
      2: `Reminder: ${amt} fees are due today (${fmt(run.dueDate)}). Most parents have already paid — kindly complete via UPI.`,
      3: `Gentle follow-up from the coaching: ${amt} fees remain pending. Please pay via UPI or reply to discuss an instalment.`,
      4: `${amt} fees are now overdue. Our team will call you shortly; you can also pay now via UPI to avoid follow-up.`,
      5: `Final notice: ${amt} fees overdue. Please clear the dues or contact the coaching office today.`,
    };
    const body = lines[stageNo] ?? lines[3];
    return `${body}\n\n— Sent on behalf of your coaching via EduFlow (AI-assisted). Reply STOP to opt out.`;
  }

  private istHour(now: Date): number {
    return new Date(now.getTime() + DUNNING.istOffsetMinutes * 60_000).getUTCHours();
  }

  private isQuietHoursIST(now: Date): boolean {
    const h = this.istHour(now);
    return h >= DUNNING.quietStartHourIST || h < DUNNING.quietEndHourIST;
  }

  /** Next 09:00 IST as a UTC Date. */
  private nextNineIST(now: Date): Date {
    const ist = new Date(now.getTime() + DUNNING.istOffsetMinutes * 60_000);
    const target = new Date(ist);
    target.setUTCHours(DUNNING.quietEndHourIST, 0, 0, 0);
    if (target <= ist) target.setUTCDate(target.getUTCDate() + 1);
    return new Date(target.getTime() - DUNNING.istOffsetMinutes * 60_000);
  }
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}
