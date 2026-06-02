import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { FeeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant-context';
import { DunningService } from '../dunning/dunning.service';
import { verifyRazorpaySignature } from './razorpay-signature';

/** The slice of a Razorpay webhook we read. */
interface RzpEvent {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        amount?: number;
        notes?: Record<string, string>;
      };
    };
  };
}

/**
 * Razorpay webhook handler — closes the dunning loop. On payment.captured /
 * order.paid for a fee, it marks the FeePayment PAID and stops every active
 * dunning run for that fee. The tenant + fee are resolved from the payment
 * `notes` we attach when generating the payment link
 * (`{ schoolId, feePaymentId }`).
 */
@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dunning: DunningService,
  ) {}

  async handleWebhook(
    rawBody: Buffer,
    signature: string | undefined,
  ): Promise<{ handled: boolean; stoppedRuns?: number }> {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    if (!verifyRazorpaySignature(secret, rawBody, signature)) {
      throw new UnauthorizedException('invalid X-Razorpay-Signature');
    }

    const body = JSON.parse(rawBody.toString('utf8')) as RzpEvent;
    if (body.event !== 'payment.captured' && body.event !== 'order.paid') {
      return { handled: false };
    }

    const payment = body.payload?.payment?.entity;
    const notes = payment?.notes ?? {};
    const schoolId = notes.schoolId;
    const feePaymentId = notes.feePaymentId;
    if (!schoolId || !feePaymentId) {
      this.logger.warn('payment without schoolId/feePaymentId notes — skipped');
      return { handled: false };
    }

    return TenantContext.run({ schoolId }, async () => {
      await this.prisma.runInTenantTx((tx) =>
        tx.feePayment.update({
          where: { id: feePaymentId },
          data: { status: FeeStatus.PAID, paidAt: new Date(), txnRef: payment?.id },
        }),
      );
      const res = await this.dunning.markPaidByFeePayment(feePaymentId);
      return { handled: true, stoppedRuns: res.stopped };
    });
  }
}
