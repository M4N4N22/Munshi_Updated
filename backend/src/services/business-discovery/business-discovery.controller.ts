import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessDiscoveryFactoryQueryDto } from './business-discovery.dto';
import { BusinessDiscoveryService } from './business-discovery.service';

@ApiTags('BusinessDiscovery')
@Controller('business-discovery')
export class BusinessDiscoveryController {
  constructor(private readonly discoveryService: BusinessDiscoveryService) {}

  @Get()
  @ApiOperation({ summary: 'Get or create business discovery profile for factory' })
  getProfile(@Query() query: BusinessDiscoveryFactoryQueryDto) {
    return this.discoveryService.getProfile(query.factory_id);
  }

  @Get('progress')
  @ApiOperation({ summary: 'Business readiness score and bucket progress' })
  getProgress(@Query() query: BusinessDiscoveryFactoryQueryDto) {
    return this.discoveryService.getProgress(query.factory_id);
  }

  @Get('buckets')
  @ApiOperation({ summary: 'Discovery bucket definitions' })
  listBuckets() {
    return this.discoveryService.listBuckets();
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Readiness score and bucket completion (Prompt 13)' })
  getReadiness(@Query() query: BusinessDiscoveryFactoryQueryDto) {
    return this.discoveryService.getReadiness(query.factory_id);
  }

  @Post('pause')
  @ApiOperation({ summary: 'Pause discovery reminders (workflow remains resumable)' })
  pause(@Query() query: BusinessDiscoveryFactoryQueryDto) {
    return this.discoveryService.pause(query.factory_id);
  }

  @Post('resume')
  @ApiOperation({ summary: 'Resume active discovery' })
  resume(@Query() query: BusinessDiscoveryFactoryQueryDto) {
    return this.discoveryService.resume(query.factory_id);
  }

  @Post('reminder')
  @ApiOperation({ summary: 'Process next reminder stage for factory (also used by cron)' })
  processReminder(@Query() query: BusinessDiscoveryFactoryQueryDto) {
    return this.discoveryService.processReminder(query.factory_id);
  }
}
