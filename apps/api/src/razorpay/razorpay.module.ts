import { Module } from '@nestjs/common';
import { DunningModule } from '../dunning/dunning.module';
import { RazorpayController } from './razorpay.controller';
import { RazorpayService } from './razorpay.service';

@Module({
  imports: [DunningModule],
  controllers: [RazorpayController],
  providers: [RazorpayService],
})
export class RazorpayModule {}
