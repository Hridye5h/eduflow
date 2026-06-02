import { Module } from '@nestjs/common';
import { ConsentService } from './consent.service';
import { ConsentController } from './consent.controller';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { DigilockerVerifier } from './verifiers/digilocker.verifier';
import { PhoneOtpVerifier } from './verifiers/phone-otp.verifier';
import { DIGILOCKER_VERIFIER, PHONE_OTP_VERIFIER } from './verifiable-consent.port';

@Module({
  controllers: [ConsentController],
  providers: [
    ConsentService,
    JwtAuthGuard,
    RolesGuard,
    { provide: DIGILOCKER_VERIFIER, useClass: DigilockerVerifier },
    { provide: PHONE_OTP_VERIFIER, useClass: PhoneOtpVerifier },
  ],
  exports: [ConsentService],
})
export class ConsentModule {}
