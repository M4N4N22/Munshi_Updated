import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MigrationHealthService } from './migration-health.service';

@ApiTags('Health')
@Controller('health/migrations')
export class MigrationHealthController {
  constructor(private readonly migrationHealthService: MigrationHealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Migration schema status',
    description:
      'Returns applied/pending SQL migrations tracked in schema_migrations.',
  })
  async status() {
    const status = await this.migrationHealthService.getStatus();
    return {
      status: status.up_to_date ? 'ok' : 'pending',
      ...status,
    };
  }
}
