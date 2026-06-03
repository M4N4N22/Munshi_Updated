import {
  Body,
  Controller,
  Get,
  Injectable,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { NOT_IMPLEMENTED_RESPONSE } from 'src/core/constants/not-implemented.constants';
import {
  CreateApprovalRequestDto,
  UpdateApprovalRequestDto,
} from './approvals.dto';
import { ApprovalRepository } from './approvals.repository';

@Injectable()
export class ApprovalService {
  constructor(private readonly approvalRepository: ApprovalRepository) {}

  list(_factoryId?: number, _status?: string) {
    void this.approvalRepository;
    return NOT_IMPLEMENTED_RESPONSE;
  }

  findOne(_id: number) {
    return NOT_IMPLEMENTED_RESPONSE;
  }

  create(_dto: CreateApprovalRequestDto) {
    return NOT_IMPLEMENTED_RESPONSE;
  }

  update(_id: number, _dto: UpdateApprovalRequestDto) {
    return NOT_IMPLEMENTED_RESPONSE;
  }
}

@Controller('approvals')
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Get()
  list(
    @Query('factory_id') factoryId?: string,
    @Query('status') status?: string,
  ) {
    return this.approvalService.list(
      factoryId ? Number(factoryId) : undefined,
      status,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.approvalService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateApprovalRequestDto) {
    return this.approvalService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateApprovalRequestDto,
  ) {
    return this.approvalService.update(id, dto);
  }
}
