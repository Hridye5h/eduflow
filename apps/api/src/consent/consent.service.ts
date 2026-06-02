import { createHash } from 'node:crypto';
import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConsentMethod, ConsentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DIGILOCKER_VERIFIER,
  PHONE_OTP_VERIFIER,
  VerifiableConsentVerifier,
  VerifyInput,
} from './verifiable-consent.port';

/** Stable purpose identifiers for consent scoping. */
export const ConsentPurpose = {
  CORE: 'core_processing',
  AI_TEST_REPORTS: 'ai_test_reports',
  PARENT_COMMS: 'parent_comms',
} as const;
export type ConsentPurpose = (typeof ConsentPurpose)[keyof typeof ConsentPurpose];

const VERIFIABLE_METHODS: ConsentMethod[] = [
  ConsentMethod.DIGILOCKER,
  ConsentMethod.PHONE_OTP_KYC,
];

/**
 * Verifiable parental consent — append-only state machine (architecture §7.2).
 *
 * Every transition is a NEW `ConsentEvent` row; the latest row for
 * (studentId, purpose) is the current state. Rows are never updated or deleted.
 * All reads/writes go through the tenant-aware `prisma.db`, so RLS scopes them
 * to the active school automatically.
 *
 * DPDPA Rule 10 is enforced in code: only a *verifiable* method
 * (DigiLocker / phone-OTP+KYC) that confirms the consenter is an adult can move
 * consent to GRANTED. A photographed paper form is recorded as a SUPPLEMENTARY
 * artefact only — it never grants.
 */
@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(DIGILOCKER_VERIFIER) private readonly digilocker: VerifiableConsentVerifier,
    @Inject(PHONE_OTP_VERIFIER) private readonly phoneOtp: VerifiableConsentVerifier,
  ) {}

  /** Open a consent request (status REQUESTED). */
  request(input: {
    schoolId: string;
    studentId: string;
    guardianId?: string;
    purpose: string;
    scope?: string;
  }) {
    return this.prisma.db.consentEvent.create({
      data: {
        schoolId: input.schoolId,
        studentId: input.studentId,
        guardianId: input.guardianId,
        purpose: input.purpose,
        scope: input.scope,
        status: ConsentStatus.REQUESTED,
      },
    });
  }

  /**
   * Grant consent via a verifiable mechanism. Runs the verifier (a network call)
   * OUTSIDE any transaction, then persists the GRANTED row. Throws if the method
   * is not verifiable or the consenter could not be confirmed as an adult.
   */
  async grantViaVerifier(input: {
    schoolId: string;
    studentId: string;
    guardianId: string;
    purpose: string;
    scope?: string;
    method: ConsentMethod;
    verify: VerifyInput;
  }) {
    if (!VERIFIABLE_METHODS.includes(input.method)) {
      throw new ForbiddenException(
        `${input.method} is not a verifiable consent method; cannot grant`,
      );
    }
    const verifier = input.method === ConsentMethod.DIGILOCKER ? this.digilocker : this.phoneOtp;

    // Verifier is a network call — deliberately not inside a DB transaction.
    const result = await verifier.verify(input.verify);
    if (!result.adultVerified) {
      throw new ForbiddenException('parental identity could not be verified as an adult');
    }

    return this.prisma.db.consentEvent.create({
      data: {
        schoolId: input.schoolId,
        studentId: input.studentId,
        guardianId: input.guardianId,
        purpose: input.purpose,
        scope: input.scope,
        status: ConsentStatus.GRANTED,
        method: input.method,
        verifierRef: hashToken(result.token),
      },
    });
  }

  /** Withdraw consent (status WITHDRAWN). Triggers downstream data-processing halt. */
  withdraw(input: { schoolId: string; studentId: string; purpose: string; guardianId?: string; note?: string }) {
    return this.prisma.db.consentEvent.create({
      data: {
        schoolId: input.schoolId,
        studentId: input.studentId,
        guardianId: input.guardianId,
        purpose: input.purpose,
        status: ConsentStatus.WITHDRAWN,
        note: input.note,
      },
    });
  }

  /**
   * Record a photographed signed paper form as a SUPPLEMENTARY artefact. This
   * never changes consent state — it carries the current status forward so the
   * "latest row = state" invariant holds. Paper is not a DPDPA verifier.
   */
  async attachSupplementaryPaper(input: {
    schoolId: string;
    studentId: string;
    purpose: string;
    note?: string;
  }) {
    const current = (await this.getState(input.studentId, input.purpose)) ?? ConsentStatus.REQUESTED;
    this.logger.warn(
      `Paper consent recorded for student ${input.studentId} as supplementary only (not a verifier)`,
    );
    return this.prisma.db.consentEvent.create({
      data: {
        schoolId: input.schoolId,
        studentId: input.studentId,
        purpose: input.purpose,
        status: current,
        method: ConsentMethod.PAPER_SUPPLEMENTARY,
        note: input.note ?? 'supplementary paper record — not a verifier',
      },
    });
  }

  /** Current consent status for (studentId, purpose), or null if none recorded. */
  async getState(studentId: string, purpose: string): Promise<ConsentStatus | null> {
    const latest = await this.prisma.db.consentEvent.findFirst({
      where: { studentId, purpose },
      orderBy: { createdAt: 'desc' },
      select: { status: true },
    });
    return latest?.status ?? null;
  }

  /** Throw unless consent for (studentId, purpose) is currently GRANTED. */
  async assertGranted(studentId: string, purpose: string): Promise<void> {
    const state = await this.getState(studentId, purpose);
    if (state !== ConsentStatus.GRANTED) {
      throw new ForbiddenException(
        `no granted parental consent for purpose "${purpose}" (state: ${state ?? 'none'})`,
      );
    }
  }

  /** Full append-only history for a student (audit / rights requests). */
  history(studentId: string) {
    return this.prisma.db.consentEvent.findMany({
      where: { studentId },
      orderBy: { createdAt: 'asc' },
    });
  }
}

/** sha256 hex of a verifier token — we persist this, never the raw token. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
