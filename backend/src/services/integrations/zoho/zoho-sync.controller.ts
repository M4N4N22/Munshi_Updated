import { Controller, Post, Body, HttpCode, HttpStatus, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZohoPullSyncDto } from './zoho-pull-sync.dto';
import { ZohoPullSyncService } from './zoho-pull-sync.service';
import { ZohoPushRetryService } from './zoho-push-retry.service';
import { ZohoPushDeliveriesQueryDto } from './zoho-push-retry.dto';

@ApiTags('integrations')
@Controller('integrations/zoho/sync')
export class ZohoSyncController {
  constructor(
    private readonly pullSyncService: ZohoPullSyncService,
    private readonly pushRetryService: ZohoPushRetryService,
  ) {}

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

  @Get('push-deliveries')
  @ApiOperation({ summary: 'List Zoho stock push delivery records for a factory' })
  listPushDeliveries(@Query() query: ZohoPushDeliveriesQueryDto) {
    return this.pushRetryService.listPushDeliveriesForFactory(
      query.factory_id,
      query.user_id,
      query.connection_id,
    );
  }
}
