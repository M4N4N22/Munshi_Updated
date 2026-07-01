import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IntentObservabilityFilterDto,
  ReviewQueueQueryDto,
} from './intent-observability.dto';
import { IntentObservabilityService } from './intent-observability.service';

@ApiTags('intent-observability')
@Controller('intent-observability')
export class IntentObservabilityController {
  constructor(private readonly service: IntentObservabilityService) {}

  @Get('kpis')
  @ApiOperation({
    summary:
      'Aggregated intent KPI rates (general_chat, LLM usage, retry, role_block, workflow_failure)',
  })
  getKpis(@Query() query: IntentObservabilityFilterDto) {
    return this.service.getKpiRates(query);
  }

  @Get('review-queue')
  @ApiOperation({
    summary: 'Misclassification review queue (misclass_score >= 50, unreviewed)',
  })
  getReviewQueue(@Query() query: ReviewQueueQueryDto) {
    return this.service.getReviewQueue(query);
  }

  @Post('review-queue/:eventId/reviewed')
  @ApiOperation({ summary: 'Mark a review-queue event as reviewed' })
  markReviewed(@Param('eventId') eventId: string) {
    return this.service.markReviewed(eventId);
  }
}
