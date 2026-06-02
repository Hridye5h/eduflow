import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConsentMethod } from '@prisma/client';
import { VerifiableConsentVerifier, VerifiedConsent, VerifyInput } from '../verifiable-consent.port';

/**
 * Phone-OTP + Aadhaar-offline-KYC verifiable-consent adapter — the realistic
 * fallback where DigiLocker literacy is low (tier-2/3). The parent proves phone
 * possession via OTP and adult identity via Aadhaar offline e-KYC (XML/QR).
 *
 * STUB — inert in production until wired (see DigilockerVerifier note).
 */
@Injectable()
export class PhoneOtpVerifier implements VerifiableConsentVerifier {
  readonly method = ConsentMethod.PHONE_OTP_KYC;
  private readonly logger = new Logger(PhoneOtpVerifier.name);

  async verify(input: VerifyInput): Promise<VerifiedConsent> {
    if (!input.phone) {
      throw new NotImplementedException('phone is required for OTP+KYC verification');
    }
    const configured = !!process.env.OTP_KYC_PROVIDER;
    if (!configured) {
      if (process.env.NODE_ENV === 'production') {
        throw new NotImplementedException('OTP+KYC verifier is not configured');
      }
      this.logger.warn('Phone-OTP+KYC verifier STUB in use — not for production');
      return {
        adultVerified: true,
        token: `otp-kyc-stub:${input.phone}`,
        method: this.method,
      };
    }
    // TODO: verify OTP, then Aadhaar offline e-KYC, assert age >= 18.
    throw new NotImplementedException('OTP+KYC verification not yet implemented');
  }
}
