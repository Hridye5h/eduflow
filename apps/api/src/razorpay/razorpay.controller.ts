import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { RazorpayService } from './razorpay.service';

/**
 * Razorpay webhook. PUBLIC (Razorpay calls it) — authenticity is the HMAC
 * signature; the tenant is resolved from the payment notes. ACKs 200 fast.
 */
@Controller('webhooks/razorpay')
export class RazorpayController {
  constructor(private readonly svc: RazorpayService) {}

  @Post()
  @HttpCode(200)
  receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature?: string,
  ): Promise<{ handled: boolean; stoppedRuns?: number }> {
    const raw = req.rawBody;
    if (!raw) return Promise.resolve({ handled: false });
    return this.svc.handleWebhook(raw, signature);
  }
}
