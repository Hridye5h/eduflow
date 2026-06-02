import { Module } from '@nestjs/common';
import { TestHelpersController } from './test-helpers.controller';

@Module({
  controllers: [TestHelpersController],
})
export class TestHelpersModule {}
