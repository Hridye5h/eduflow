import { Global, Module } from '@nestjs/common';
import { LlmService } from './llm.service';

/** Global so any agent/feature can route a prompt without re-importing. */
@Global()
@Module({
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
