import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verify Razorpay's `X-Razorpay-Signature` = hex HMAC-SHA256(rawBody, webhookSecret).
 * Verify over the RAW body, not re-serialized JSON.
 */
export function verifyRazorpaySignature(
  secret: string,
  rawBody: Buffer,
  signature: string | undefined,
): boolean {
  if (!secret || !rawBody || !signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
