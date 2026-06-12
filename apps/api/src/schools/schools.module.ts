import { Module } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { DemoSeedService } from './demo-seed.service';
import { SchoolsController } from './schools.controller';

@Module({
  controllers: [SchoolsController],
  providers: [SchoolsService, DemoSeedService],
  exports: [SchoolsService],
})
export class SchoolsModule {}
