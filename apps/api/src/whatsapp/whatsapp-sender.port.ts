import { Injectable, Logger, NotImplementedException } from '@nestjs/common';

/**
 * Outbound WhatsApp sender — a SWAPPABLE PORT (Gemini review #4). The default is
 * Meta Cloud API direct; a BSP adapter (Gupshup/AiSensy) can slot in behind the
 * same interface, so a number-quality crisis is a config flip, not a rewrite.
 */
export interface WhatsAppSendInput {
  toPhone: string;
  /** UTILITY-category template name + variables (preferred for proactive sends). */
  template?: { name: string; language: string; variables?: string[] };
  /** Free-form text — only valid inside the 24h customer service window. */
  text?: string;
}

export interface WhatsAppSendResult {
  providerMessageId?: string;
  provider: 'meta' | 'bsp' | 'noop';
}

export interface WhatsAppSender {
  send(schoolId: string, input: WhatsAppSendInput): Promise<WhatsAppSendResult>;
}

export const WHATSAPP_SENDER = Symbol('WHATSAPP_SENDER');

/**
 * Meta Cloud API sender — STUB. Inert in production until WHATSAPP_TOKEN is
 * configured, so the stub can never silently no-op a real send on a live deploy.
 */
@Injectable()
export class MetaCloudSender implements WhatsAppSender {
  private readonly logger = new Logger(MetaCloudSender.name);

  async send(schoolId: string, input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
    const configured = !!process.env.WHATSAPP_TOKEN;
    if (!configured) {
      if (process.env.NODE_ENV === 'production') {
        throw new NotImplementedException('Meta Cloud API sender not configured');
      }
      this.logger.warn(`WhatsApp send STUB → ${input.toPhone} (school ${schoolId})`);
      return { provider: 'noop' };
    }
    // TODO: POST to graph.facebook.com /{phoneNumberId}/messages with the template.
    throw new NotImplementedException('Meta Cloud API send not yet implemented');
  }
}
