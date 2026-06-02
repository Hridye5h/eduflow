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
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      if (process.env.NODE_ENV === 'production') {
        throw new NotImplementedException('Meta Cloud API sender not configured');
      }
      this.logger.warn(`WhatsApp send STUB → ${input.toPhone} (school ${schoolId})`);
      return { provider: 'noop' };
    }

    const body = input.template
      ? {
          messaging_product: 'whatsapp',
          to: input.toPhone,
          type: 'template',
          template: {
            name: input.template.name,
            language: { code: input.template.language },
            components: input.template.variables?.length
              ? [{ type: 'body', parameters: input.template.variables.map((v) => ({ type: 'text', text: v })) }]
              : [],
          },
        }
      : { messaging_product: 'whatsapp', to: input.toPhone, type: 'text', text: { body: input.text ?? '' } };

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20_000);
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`meta ${res.status}: ${await res.text()}`);
      const json = (await res.json()) as { messages?: Array<{ id?: string }> };
      return { provider: 'meta', providerMessageId: json.messages?.[0]?.id };
    } finally {
      clearTimeout(t);
    }
  }
}
