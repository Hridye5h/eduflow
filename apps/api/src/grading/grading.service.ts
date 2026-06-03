import { Injectable, NotFoundException } from '@nestjs/common';
import { OutboxKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProvenanceService } from '../provenance/provenance.service';
import { ConsentService, ConsentPurpose } from '../consent/consent.service';
import { LlmService } from '../llm/llm.service';
import type { WhatsAppSendInput } from '../whatsapp/whatsapp-sender.port';
import { ScoreItem, SheetScore, scoreSheet } from './scoring';

/**
 * AI Test & Grading. The split that makes this defensible:
 *   • scores are DETERMINISTIC compute (scoreSheet) — never an LLM;
 *   • the model only phrases the narrative around those numbers;
 *   • the report is provenance-stamped, consent-gated (DPDPA), and never
 *     released to a parent until a teacher approves (HITL), after which it is
 *     queued to the WhatsApp outbox.
 */
@Injectable()
export class GradingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provenance: ProvenanceService,
    private readonly consent: ConsentService,
    private readonly llm: LlmService,
  ) {}

  /** Persist a graded sheet. Scores computed deterministically; bad input throws. */
  async gradeSheet(input: {
    schoolId: string;
    testName: string;
    studentId: string;
    items: ScoreItem[];
  }) {
    const score = scoreSheet(input.items);
    return this.prisma.db.gradedSheet.create({
      data: {
        schoolId: input.schoolId,
        testName: input.testName,
        studentId: input.studentId,
        items: input.items as unknown as Prisma.InputJsonValue,
        totalAwarded: score.totalAwarded,
        totalMax: score.totalMax,
        percentage: score.percentage,
      },
    });
  }

  /**
   * Generate a parent-facing report from a graded sheet. Requires GRANTED
   * consent for AI test reports (DPDPA). Numbers are recomputed deterministically
   * from the stored items; the body is watermarked + provenance-logged.
   */
  async generateReport(gradedSheetId: string) {
    const sheet = await this.prisma.db.gradedSheet.findUnique({ where: { id: gradedSheetId } });
    if (!sheet) throw new NotFoundException('graded sheet not found');

    await this.consent.assertGranted(sheet.studentId, ConsentPurpose.AI_TEST_REPORTS);

    const score = scoreSheet(sheet.items as unknown as ScoreItem[]);
    const template = this.buildReportBody(sheet.testName, score);
    // The LLM only phrases the narrative; the deterministic numbers are passed in
    // and must not change (the teacher's HITL approval is the safety net). Falls
    // back to the exact template if no LLM is configured.
    const gen = await this.llm.generateWithMeta(
      `Rewrite the parent note below in simple, warm English + Hindi (Hinglish). Use EXACTLY the numbers given — never change a score. Add one encouraging line and one concrete focus tip. Keep the final AI-assisted disclosure line.\n\n${template}`,
      {
        language: 'hinglish',
        fallback: template,
        maxTokens: 320,
        // Chat-tuned models otherwise add preamble + markdown "options"; force a
        // single clean, send-ready note.
        system:
          'You write a single parent-facing test-report note. Output ONLY the final note text — no preamble, no greeting to the operator, no alternative versions or options, no markdown, no surrounding quotes.',
      },
    );
    const body = gen.text;
    const stamp = await this.provenance.stamp({
      schoolId: sheet.schoolId,
      artefactType: 'test_report',
      content: body,
      // Record the real model when the LLM phrased the note; keep the template
      // tag on fallback. Honest provenance for the IT-Rules ledger.
      model: gen.model === 'template-fallback' ? 'report-template-v1' : gen.model,
    });

    return this.prisma.db.testReport.create({
      data: {
        schoolId: sheet.schoolId,
        gradedSheetId: sheet.id,
        studentId: sheet.studentId,
        body,
        provenanceId: stamp.id,
      },
    });
  }

  /**
   * HITL: a teacher approves the report; only then is it marked reviewed and
   * queued to the parent via the WhatsApp outbox.
   */
  async approveAndSend(reportId: string, reviewerId: string, toPhone: string) {
    const report = await this.prisma.db.testReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('report not found');

    if (report.provenanceId) await this.provenance.markReviewed(report.provenanceId, reviewerId);

    const send: WhatsAppSendInput = { toPhone, text: report.body };
    await this.prisma.runInTenantTx(async (tx) => {
      await tx.testReport.update({
        where: { id: reportId },
        data: { humanReviewed: true, reviewerId, sentAt: new Date() },
      });
      await tx.outboxItem.create({
        data: {
          schoolId: report.schoolId,
          kind: OutboxKind.SEND_MESSAGE,
          payload: send as unknown as Prisma.InputJsonValue,
        },
      });
    });
    return { ok: true };
  }

  getSheet(id: string) {
    return this.prisma.db.gradedSheet.findUnique({ where: { id }, include: { reports: true } });
  }

  getReport(id: string) {
    return this.prisma.db.testReport.findUnique({ where: { id } });
  }

  /** Deterministic numbers + weak-topic guidance + AI disclosure. Sarvam-M will phrase the Hinglish later. */
  private buildReportBody(testName: string, score: SheetScore): string {
    const topics = score.perTopic
      .map((t) => `• ${t.topic}: ${t.awarded}/${t.max} (${t.percentage}%)`)
      .join('\n');
    const weak = score.weakTopics.length
      ? `Focus areas: ${score.weakTopics.join(', ')}.`
      : 'No weak areas — well done!';
    return [
      `Report — ${testName}`,
      `Score: ${score.totalAwarded}/${score.totalMax} (${score.percentage}%)`,
      '',
      topics,
      '',
      weak,
      '',
      '— AI-assisted report via EduFlow. Reviewed by your teacher before sending.',
    ].join('\n');
  }
}
