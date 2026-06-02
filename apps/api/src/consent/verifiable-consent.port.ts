import { ConsentMethod } from '@prisma/client';

/**
 * A verifiable-consent mechanism. Under DPDPA Rule 10, consent for a child's
 * data is only valid if the platform verifies the consenter is an **adult**
 * (and the parent/guardian). DigiLocker (Aadhaar-linked) and phone-OTP +
 * Aadhaar-offline-KYC qualify. A photographed paper form does NOT — it is a
 * supplementary record only, never a verifier (see ConsentService).
 */
export interface VerifiedConsent {
  /** True only if the mechanism actually verified the consenter is an adult. */
  adultVerified: boolean;
  /** Opaque verifier token. Only its hash is ever persisted. */
  token: string;
  method: ConsentMethod;
}

export interface VerifiableConsentVerifier {
  readonly method: ConsentMethod;
  /**
   * Verify the guardian's identity/age and return a token. Throws if identity
   * cannot be verified — callers must treat a throw as "no valid consent".
   */
  verify(input: VerifyInput): Promise<VerifiedConsent>;
}

export interface VerifyInput {
  guardianId?: string;
  phone?: string;
  /** Provider callback payload (e.g. DigiLocker OAuth code / OTP). */
  callbackPayload?: Record<string, unknown>;
}

export const DIGILOCKER_VERIFIER = Symbol('DIGILOCKER_VERIFIER');
export const PHONE_OTP_VERIFIER = Symbol('PHONE_OTP_VERIFIER');
