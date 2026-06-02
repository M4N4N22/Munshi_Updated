import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DemoModeService } from './demo-mode.service';
import { ALL_DEMO_PHRASES } from './demo-mode.constants';

@ApiTags('demo-mode')
@Controller('demo-mode')
export class DemoModeController {
  constructor(private readonly demoModeService: DemoModeService) {}

  @Get('status')
  @ApiOperation({ summary: 'Demo mode status (validation only)' })
  status() {
    return {
      enabled: this.demoModeService.isEnabled(),
      phrase_count: ALL_DEMO_PHRASES.size,
    };
  }
}
