import { Module } from '@nestjs/common';
import { GradingService } from './grading.service';
import { GradingController } from './grading.controller';
import { ConsentModule } from '../consent/consent.module';
import { SarvamVisionOcr, OCR_PORT } from './ocr.port';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [ConsentModule], // ConsentService for the DPDPA report consent gate
  controllers: [GradingController],
  providers: [
    GradingService,
    JwtAuthGuard,
    RolesGuard,
    { provide: OCR_PORT, useClass: SarvamVisionOcr },
  ],
  exports: [GradingService],
})
export class GradingModule {}
