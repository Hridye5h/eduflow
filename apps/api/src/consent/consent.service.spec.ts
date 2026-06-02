import { applyRlsAsOwner } from '../test-utils/rls';
import { ConsentMethod, ConsentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant-context';
import { ConsentService, ConsentPurpose } from './consent.service';
import { DigilockerVerifier } from './verifiers/digilocker.verifier';
import { PhoneOtpVerifier } from './verifiers/phone-otp.verifier';

const hasDb = !!process.env.DATABASE_URL;
const d = hasDb ? describe : describe.skip;

d('ConsentService (append-only, verifiable-only grants)', () => {
  const prisma = new PrismaService();
  const service = new ConsentService(prisma, new DigilockerVerifier(), new PhoneOtpVerifier());
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  let schoolId = '';
  let studentId = '';
  const inTenant = <T>(fn: () => Promise<T>) => TenantContext.run({ schoolId }, fn);

  beforeAll(async () => {
    await prisma.onModuleInit();
    await applyRlsAsOwner();
    await prisma.runAsSystem(async () => {
      const school = await prisma.db.school.create({
        data: { name: 'Consent Coaching', subdomain: `consent-${suffix}` },
      });
      schoolId = school.id;
      const student = await prisma.db.user.create({
        data: { schoolId, role: 'STUDENT', name: 'Aarav', dateOfBirth: new Date('2010-01-01') },
      });
      studentId = student.id;
    });
  });

  afterAll(async () => {
    await prisma.runAsSystem(() => prisma.db.school.delete({ where: { id: schoolId } }));
    await prisma.onModuleDestroy();
  });

  it('request -> REQUESTED', async () => {
    await inTenant(() =>
      service.request({ schoolId, studentId, purpose: ConsentPurpose.CORE }),
    );
    expect(await inTenant(() => service.getState(studentId, ConsentPurpose.CORE))).toBe(
      ConsentStatus.REQUESTED,
    );
  });

  it('verifiable grant (DigiLocker) -> GRANTED, assertGranted passes', async () => {
    await inTenant(() =>
      service.grantViaVerifier({
        schoolId,
        studentId,
        guardianId: 'guardian-1',
        purpose: ConsentPurpose.CORE,
        method: ConsentMethod.DIGILOCKER,
        verify: { callbackPayload: { code: 'abc' } },
      }),
    );
    expect(await inTenant(() => service.getState(studentId, ConsentPurpose.CORE))).toBe(
      ConsentStatus.GRANTED,
    );
    await expect(inTenant(() => service.assertGranted(studentId, ConsentPurpose.CORE))).resolves.toBeUndefined();
  });

  it('paper record is supplementary only — does NOT change state', async () => {
    await inTenant(() =>
      service.attachSupplementaryPaper({ schoolId, studentId, purpose: ConsentPurpose.CORE }),
    );
    expect(await inTenant(() => service.getState(studentId, ConsentPurpose.CORE))).toBe(
      ConsentStatus.GRANTED, // carried forward, not downgraded
    );
  });

  it('paper cannot be used as a verifier to grant', async () => {
    await expect(
      inTenant(() =>
        service.grantViaVerifier({
          schoolId,
          studentId,
          guardianId: 'g',
          purpose: ConsentPurpose.AI_TEST_REPORTS,
          method: ConsentMethod.PAPER_SUPPLEMENTARY,
          verify: {},
        }),
      ),
    ).rejects.toThrow();
  });

  it('withdraw -> WITHDRAWN, assertGranted now throws', async () => {
    await inTenant(() => service.withdraw({ schoolId, studentId, purpose: ConsentPurpose.CORE }));
    expect(await inTenant(() => service.getState(studentId, ConsentPurpose.CORE))).toBe(
      ConsentStatus.WITHDRAWN,
    );
    await expect(inTenant(() => service.assertGranted(studentId, ConsentPurpose.CORE))).rejects.toThrow();
  });
});
