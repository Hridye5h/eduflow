import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verify Meta's `X-Hub-Signature-256` over the RAW request body.
 * `sha256=HMAC(appSecret, rawBytes)`. Verifying the re-serialized JSON fails on
 * key-ordering/whitespace, so the caller must pass the unparsed buffer
 * (enabled via `rawBody: true` in NestFactory.create).
 */
export function verifyMetaSignature(
  appSecret: string,
  rawBody: Buffer,
  signatureHeader: string | undefined,
): boolean {
  if (!appSecret || !rawBody || !signatureHeader?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const got = signatureHeader.slice('sha256='.length);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(got, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
