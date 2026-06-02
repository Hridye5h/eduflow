import { Module } from '@nestjs/common';
import { DunningService } from './dunning.service';
import { DunningController } from './dunning.controller';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';

/**
 * No import of WhatsAppModule — DunningService queues sends by writing OutboxItem
 * rows directly, so the WhatsApp worker can depend on DunningService (for inbound
 * stop-words) without a circular module dependency.
 */
@Module({
  controllers: [DunningController],
  providers: [DunningService, JwtAuthGuard, RolesGuard],
  exports: [DunningService],
})
export class DunningModule {}
