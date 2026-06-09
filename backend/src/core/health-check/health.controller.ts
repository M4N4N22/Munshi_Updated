// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheckService } from '@nestjs/terminus';
import { Public } from 'src/core/guards/public.decorator';
import { CustomHealthService } from './health.service';

@Public()
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private readonly customHealthService: CustomHealthService,
  ) {}

  @Get()
  check() {
    return this.health.check([
      () => this.customHealthService.checkSqlConnection(),
      // () => this.customHealthService.checkMongoConnection(),
    ]);
  }
}
