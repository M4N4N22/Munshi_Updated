import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { InternalCallGuard } from 'src/core/guards/guards';
import { AdminOpsService } from './admin-ops.service';

@Controller('admin')
export class AdminOpsController {
  constructor(private readonly adminOpsService: AdminOpsService) {}

  /** Internal ops dashboard — requires x-secret (proxied from web admin API). */
  @Get('clients')
  @UseGuards(InternalCallGuard)
  getClientsOverview() {
    return this.adminOpsService.getClientsOverview();
  }

  @Get('clients/:factoryId')
  @UseGuards(InternalCallGuard)
  getClientDetail(@Param('factoryId', ParseIntPipe) factoryId: number) {
    return this.adminOpsService.getClientDetail(factoryId);
  }
}
