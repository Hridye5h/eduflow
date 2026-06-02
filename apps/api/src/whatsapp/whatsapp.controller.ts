import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { WhatsAppService } from './whatsapp.service';

/**
 * Meta WhatsApp Cloud API webhook. PUBLIC (Meta calls it) — no JWT/tenant guard;
 * authenticity is the HMAC signature, and the tenant is resolved from the
 * payload's phone_number_id. POST does only the fast atomic outbox write, then
 * ACKs 200 so we stay well under Meta's timeout.
 */
@Controller('webhooks/whatsapp')
export class WhatsAppController {
  constructor(private readonly svc: WhatsAppService) {}

  /** Meta verification handshake (GET). Echoes hub.challenge when the token matches. */
  @Get()
  verify(@Query() q: Record<string, string>): string {
    const mode = q['hub.mode'];
    const token = q['hub.verify_token'];
    const challenge = q['hub.challenge'];
    if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return challenge;
    }
    throw new ForbiddenException('verification failed');
  }

  @Post()
  @HttpCode(200)
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature?: string,
  ): Promise<{ accepted: number }> {
    const raw = req.rawBody;
    if (!raw) return { accepted: 0 };
    return this.svc.ingest(raw, signature);
  }
}
