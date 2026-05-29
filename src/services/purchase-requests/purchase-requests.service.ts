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
  CreatePurchaseRequestDto,
  UpdatePurchaseRequestDto,
} from './purchase-requests.dto';
import { PurchaseRequestRepository } from './purchase-requests.repository';

@Injectable()
export class PurchaseRequestService {
  constructor(
    private readonly purchaseRequestRepository: PurchaseRequestRepository,
  ) {}

  list(_factoryId?: number) {
    void this.purchaseRequestRepository;
    return NOT_IMPLEMENTED_RESPONSE;
  }

  findOne(_id: number) {
    return NOT_IMPLEMENTED_RESPONSE;
  }

  create(_dto: CreatePurchaseRequestDto) {
    return NOT_IMPLEMENTED_RESPONSE;
  }

  update(_id: number, _dto: UpdatePurchaseRequestDto) {
    return NOT_IMPLEMENTED_RESPONSE;
  }
}

@Controller('purchase-requests')
export class PurchaseRequestController {
  constructor(private readonly purchaseRequestService: PurchaseRequestService) {}

  @Get()
  list(@Query('factory_id') factoryId?: string) {
    return this.purchaseRequestService.list(
      factoryId ? Number(factoryId) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.purchaseRequestService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePurchaseRequestDto) {
    return this.purchaseRequestService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePurchaseRequestDto,
  ) {
    return this.purchaseRequestService.update(id, dto);
  }
}
