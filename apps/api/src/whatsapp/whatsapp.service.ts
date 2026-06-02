import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { OutboxKind, Prisma, WaEventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant-context';
import { verifyMetaSignature } from './meta-signature';
import { WhatsAppSendInput } from './whatsapp-sender.port';

/** The slice of Meta's webhook payload we read. */
interface WaWebhookBody {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        messages?: Array<{ id: string; from?: string; type?: string }>;
      };
    }>;
  }>;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Resolve the tenant from a webhook's phone_number_id (School is not RLS-bound). */
  private async resolveSchoolId(phoneNumberId?: string): Promise<string | null> {
    if (!phoneNumberId) return null;
    const school = await this.prisma.school.findUnique({
      where: { whatsappPhoneNumberId: phoneNumberId },
      select: { id: true, isActive: true },
    });
    return school?.isActive ? school.id : null;
  }

  /**
   * Ingest a verified webhook. Verifies the HMAC, then — per message — writes the
   * raw event AND a PROCESS_INBOUND outbox row in ONE short transaction (Gemini's
   * transactional-outbox pattern). Returns fast so the controller can ACK < 200ms;
   * the poller drains the outbox to BullMQ. Deduped on waMessageId.
   */
  async ingest(rawBody: Buffer, signature: string | undefined): Promise<{ accepted: number }> {
    const appSecret = process.env.WHATSAPP_APP_SECRET || '';
    if (!verifyMetaSignature(appSecret, rawBody, signature)) {
      throw new UnauthorizedException('invalid X-Hub-Signature-256');
    }

    const body = JSON.parse(rawBody.toString('utf8')) as WaWebhookBody;
    let accepted = 0;

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        const schoolId = await this.resolveSchoolId(value?.metadata?.phone_number_id);
        if (!schoolId) {
          this.logger.warn('inbound for unknown phone_number_id — skipped');
          continue;
        }
        for (const msg of value?.messages ?? []) {
          const ok = await this.persistInbound(schoolId, msg, value);
          if (ok) accepted += 1;
        }
      }
    }
    return { accepted };
  }

  private persistInbound(
    schoolId: string,
    msg: { id: string; from?: string; type?: string },
    value: unknown,
  ): Promise<boolean> {
    return TenantContext.run({ schoolId }, async () => {
      try {
        return await this.prisma.runInTenantTx(async (tx) => {
          const exists = await tx.whatsAppInboundEvent.findUnique({
            where: { waMessageId: msg.id },
            select: { id: true },
          });
          if (exists) return false; // dedupe — Meta re-delivers

          const event = await tx.whatsAppInboundEvent.create({
            data: {
              schoolId,
              waMessageId: msg.id,
              fromPhone: msg.from,
              type: msg.type,
              payload: value as Prisma.InputJsonValue,
              status: WaEventStatus.RECEIVED,
            },
            select: { id: true },
          });
          await tx.outboxItem.create({
            data: {
              schoolId,
              kind: OutboxKind.PROCESS_INBOUND,
              refId: event.id,
              payload: { eventId: event.id } as Prisma.InputJsonValue,
            },
          });
          return true;
        });
      } catch (err) {
        // Concurrent duplicate delivery — the unique waMessageId caught it.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return false;
        throw err;
      }
    });
  }

  /** Pull the sender + text body from a stored inbound event (for stop-word checks). */
  async extractInboundText(eventId: string): Promise<{ fromPhone: string; text: string } | null> {
    const ev = await this.prisma.db.whatsAppInboundEvent.findUnique({
      where: { id: eventId },
      select: { fromPhone: true, payload: true },
    });
    if (!ev?.fromPhone) return null;
    const value = ev.payload as { messages?: Array<{ text?: { body?: string } }> };
    return { fromPhone: ev.fromPhone, text: value?.messages?.[0]?.text?.body ?? '' };
  }

  /** Mark an inbound event processed (called by the worker after handling). */
  markInboundProcessed(eventId: string) {
    return this.prisma.db.whatsAppInboundEvent.update({
      where: { id: eventId },
      data: { status: WaEventStatus.PROCESSED, processedAt: new Date() },
    });
  }

  /**
   * Queue an outbound send via the outbox (used by Smart Dunning, digests, etc).
   * The poller picks it up; `availableAt` supports scheduled/trickle sends. Must
   * be called inside a tenant context.
   */
  enqueueSend(input: { schoolId: string; send: WhatsAppSendInput; availableAt?: Date }) {
    return this.prisma.db.outboxItem.create({
      data: {
        schoolId: input.schoolId,
        kind: OutboxKind.SEND_MESSAGE,
        payload: input.send as unknown as Prisma.InputJsonValue,
        availableAt: input.availableAt ?? new Date(),
      },
    });
  }
}
