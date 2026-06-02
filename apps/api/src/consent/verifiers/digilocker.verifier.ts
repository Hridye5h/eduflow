import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConsentMethod } from '@prisma/client';
import { VerifiableConsentVerifier, VerifiedConsent, VerifyInput } from '../verifiable-consent.port';

/**
 * DigiLocker verifiable-consent adapter — the primary DPDPA path.
 *
 * STUB. The real implementation exchanges a DigiLocker OAuth code for a signed
 * "verified adult" assertion (Aadhaar-linked) and returns the issued token. It
 * is intentionally inert in production until wired, so the stub can never be
 * mistaken for a real verifier on a live deployment.
 */
@Injectable()
export class DigilockerVerifier implements VerifiableConsentVerifier {
  readonly method = ConsentMethod.DIGILOCKER;
  private readonly logger = new Logger(DigilockerVerifier.name);

  async verify(input: VerifyInput): Promise<VerifiedConsent> {
    const configured = !!process.env.DIGILOCKER_CLIENT_ID;
    if (!configured) {
      if (process.env.NODE_ENV === 'production') {
        throw new NotImplementedException('DigiLocker verifier is not configured');
      }
      // Dev/test stub: simulate a successful verified-adult assertion.
      this.logger.warn('DigiLocker verifier STUB in use — not for production');
      const code = (input.callbackPayload?.code as string) ?? 'dev-code';
      return {
        adultVerified: true,
        token: `digilocker-stub:${code}`,
        method: this.method,
      };
    }
    // TODO: real OAuth code exchange against api.digitallocker.gov.in
    throw new NotImplementedException('DigiLocker OAuth exchange not yet implemented');
  }
}
