import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ArtefactType = 'test_report' | 'dunning' | 'digest' | 'ocr';

export interface StampInput {
  schoolId: string;
  artefactType: ArtefactType;
  /** The rendered artefact bytes/text that will be delivered. */
  content: string | Buffer;
  model: string;
  promptHash?: string;
  langfuseTrace?: string;
  /** True once a human (teacher/owner) has approved the artefact. */
  humanReviewed?: boolean;
}

export interface Stamp {
  id: string;
  artefactHash: string;
  watermarkText: string;
}

/**
 * IT Rules 2026 provenance ledger (architecture §7.3).
 *
 * Every AI-generated artefact is stamped at the write-boundary BEFORE delivery:
 * we record a row keyed by the content's sha256, which gives an O(1) reverse
 * lookup from any flagged content to its origin for the 3-hour takedown SLA. The
 * visible watermark string is returned for the renderer to embed.
 *
 * Because WhatsApp strips file metadata, the ledger row — not embedded metadata —
 * is the authoritative provenance record.
 */
@Injectable()
export class ProvenanceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Visible label embedded into every AI artefact. */
  watermarkText(artefactType: ArtefactType, at: Date = new Date()): string {
    return `AI-generated • EduFlow • ${artefactType} • ${at.toISOString().slice(0, 10)} • verify before action`;
  }

  /** Record provenance for an artefact and return its hash + watermark. */
  async stamp(input: StampInput): Promise<Stamp> {
    const artefactHash = sha256(input.content);
    const watermarkText = this.watermarkText(input.artefactType);
    const row = await this.prisma.db.aiGeneration.create({
      data: {
        schoolId: input.schoolId,
        artefactType: input.artefactType,
        artefactHash,
        model: input.model,
        promptHash: input.promptHash,
        langfuseTrace: input.langfuseTrace,
        watermarkText,
        humanReviewed: input.humanReviewed ?? false,
      },
      select: { id: true, artefactHash: true, watermarkText: true },
    });
    return row;
  }

  /** Reverse-lookup for the 3-hour takedown SLA: content hash -> origin. */
  getByHash(artefactHash: string) {
    return this.prisma.db.aiGeneration.findFirst({ where: { artefactHash } });
  }

  /** The single permitted mutation — flip the HITL review flag after approval. */
  markReviewed(id: string, reviewerId: string) {
    return this.prisma.db.aiGeneration.update({
      where: { id },
      data: { humanReviewed: true, reviewerId },
    });
  }
}

function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}
