import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZohoPullSyncDto } from './zoho-pull-sync.dto';
import { ZohoPullSyncService } from './zoho-pull-sync.service';

@ApiTags('integrations')
@Controller('integrations/zoho/sync')
export class ZohoSyncController {
  constructor(private readonly pullSyncService: ZohoPullSyncService) {}

  @Post('pull')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manual Zoho inventory pull sync (owner/manager only)' })
  pullSync(@Body() dto: ZohoPullSyncDto) {
    return this.pullSyncService.runPullSync(
      dto.connection_id,
      dto.factory_id,
      dto.user_id,
    );
  }
}
