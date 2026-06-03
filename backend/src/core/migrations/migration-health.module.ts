import { Module } from '@nestjs/common';
import { MigrationHealthController } from './migration-health.controller';
import { MigrationHealthService } from './migration-health.service';

@Module({
  controllers: [MigrationHealthController],
  providers: [MigrationHealthService],
  exports: [MigrationHealthService],
})
export class MigrationHealthModule {}
