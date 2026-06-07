import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InternalCallGuard } from 'src/core/guards/guards';
import { ResolveTaskInventoryDto } from './task-inventory-resolution.dto';
import { TaskInventoryResolutionService } from './task-inventory-resolution.service';

/** Internal/testing endpoint — no WhatsApp wiring (Phase 4.3). */
@ApiTags('TaskInventoryResolution')
@Controller('resolve')
export class TaskInventoryResolutionController {
  constructor(
    private readonly resolutionService: TaskInventoryResolutionService,
  ) {}

  @Post('task-inventory')
  @UseGuards(InternalCallGuard)
  @ApiOperation({
    summary: 'Resolve ML task-inventory extraction to backend entities (testing)',
  })
  resolve(@Body() body: ResolveTaskInventoryDto) {
    return this.resolutionService.resolveIntent(
      body.factory_id,
      body.extraction,
    );
  }
}
