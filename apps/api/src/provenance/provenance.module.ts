import { Global, Module } from '@nestjs/common';
import { ProvenanceService } from './provenance.service';

/**
 * Global so any agent/feature that produces AI output can stamp it before
 * delivery without re-importing the module.
 */
@Global()
@Module({
  providers: [ProvenanceService],
  exports: [ProvenanceService],
})
export class ProvenanceModule {}
