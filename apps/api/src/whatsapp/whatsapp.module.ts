import { Module } from '@nestjs/common';
import { DunningModule } from '../dunning/dunning.module';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { OutboxPoller } from './outbox.poller';
import { WhatsAppWorker } from './whatsapp.worker';
import { BullJobQueue } from './bull-job-queue';
import { WA_JOB_QUEUE } from './job-queue.port';
import { MetaCloudSender, WHATSAPP_SENDER } from './whatsapp-sender.port';

@Module({
  imports: [DunningModule],
  controllers: [WhatsAppController],
  providers: [
    WhatsAppService,
    OutboxPoller,
    WhatsAppWorker,
    { provide: WA_JOB_QUEUE, useClass: BullJobQueue },
    { provide: WHATSAPP_SENDER, useClass: MetaCloudSender },
  ],
  exports: [WhatsAppService, WHATSAPP_SENDER],
})
export class WhatsAppModule {}
