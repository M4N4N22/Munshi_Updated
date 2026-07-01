import { Module } from '@nestjs/common';
import { IntentObservabilityController } from './intent-observability.controller';
import { IntentObservabilityRepository } from './intent-observability.repository';
import { IntentObservabilityService } from './intent-observability.service';

@Module({
  controllers: [IntentObservabilityController],
  providers: [IntentObservabilityService, IntentObservabilityRepository],
  exports: [IntentObservabilityService, IntentObservabilityRepository],
})
export class IntentObservabilityModule {}
