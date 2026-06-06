import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AssignVendorDto,
  CreateFromSuggestionDto,
  CreatePurchaseRequestDto,
  ListPurchaseRequestsQueryDto,
  PurchaseRequestActionDto,
  PurchaseRequestAuditResponseDto,
  PurchaseRequestFactoryQueryDto,
  PurchaseRequestListResponseDto,
  PurchaseRequestPrefillQueryDto,
  PurchaseRequestPrefillResponseDto,
  PurchaseRequestResponseDto,
  PurchaseRequestSuggestionResponseDto,
  UpdatePurchaseRequestDto,
} from './purchase-requests.dto';
import { PurchaseRequestService } from './purchase-requests.service';
import { PurchaseRequestSuggestionService } from './purchase-request-suggestion.service';
import { PurchaseRequestPrefillService } from './purchase-request-prefill.service';
import { buildPurchaseRequestCreateCommand } from './purchase-request-prefill.helper';

@ApiTags('PurchaseRequest')
@Controller('purchase-requests')
export class PurchaseRequestController {
  constructor(
    private readonly purchaseRequestService: PurchaseRequestService,
    private readonly suggestionService: PurchaseRequestSuggestionService,
    private readonly prefillService: PurchaseRequestPrefillService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List purchase requests for a factory' })
  @ApiResponse({ status: 200, type: PurchaseRequestListResponseDto })
  list(@Query() query: ListPurchaseRequestsQueryDto) {
    return this.purchaseRequestService.listPurchaseRequests(query.factory_id, {
      page: query.page,
      limit: query.limit,
      status: query.status as any,
    });
  }

  @Get('suggestions/low-stock')
  @ApiOperation({ summary: 'Low-stock inventory suggestions for purchase requests' })
  @ApiResponse({ status: 200, type: [PurchaseRequestSuggestionResponseDto] })
  listLowStockSuggestions(@Query() query: PurchaseRequestFactoryQueryDto) {
    return this.suggestionService.generateLowStockSuggestions(query.factory_id);
  }

  @Get('prefill/low-stock')
  @ApiOperation({
    summary: 'Read-only prefill payload for purchase request from low-stock item',
  })
  @ApiResponse({ status: 200, type: PurchaseRequestPrefillResponseDto })
  async getLowStockPrefill(@Query() query: PurchaseRequestPrefillQueryDto) {
    const prefill = await this.prefillService.buildLowStockPrefill(
      query.factory_id,
      query.inventory_item_id,
    );
    if (!prefill) {
      throw new NotFoundException(
        `Inventory item #${query.inventory_item_id} not found in factory #${query.factory_id}`,
      );
    }
    return {
      ...prefill,
      workflow_command: buildPurchaseRequestCreateCommand(
        prefill.inventory_item_id,
      ),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase request by id' })
  @ApiResponse({ status: 200, type: PurchaseRequestResponseDto })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PurchaseRequestFactoryQueryDto,
  ) {
    return this.purchaseRequestService.getPurchaseRequest(id, query.factory_id);
  }

  @Get(':id/audit')
  @ApiOperation({ summary: 'Audit trail for a purchase request' })
  @ApiResponse({ status: 200, type: [PurchaseRequestAuditResponseDto] })
  audit(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PurchaseRequestFactoryQueryDto,
  ) {
    return this.purchaseRequestService.listAudit(id, query.factory_id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a purchase request' })
  @ApiResponse({ status: 201, type: PurchaseRequestResponseDto })
  create(@Body() dto: CreatePurchaseRequestDto) {
    return this.purchaseRequestService.createPurchaseRequest({
      factory_id: dto.factory_id,
      requested_by: dto.requested_by,
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      notes: dto.notes,
      items: dto.items,
      submit: dto.submit,
    });
  }

  @Post('from-suggestion')
  @ApiOperation({ summary: 'Create purchase request from low-stock suggestion' })
  @ApiResponse({ status: 201, type: PurchaseRequestResponseDto })
  createFromSuggestion(@Body() dto: CreateFromSuggestionDto) {
    return this.suggestionService.createFromSuggestion(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft or pending purchase request' })
  @ApiResponse({ status: 200, type: PurchaseRequestResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePurchaseRequestDto,
  ) {
    return this.purchaseRequestService.updatePurchaseRequest(id, dto);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a pending purchase request (owner/manager)' })
  @ApiResponse({ status: 200, type: PurchaseRequestResponseDto })
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PurchaseRequestActionDto,
  ) {
    return this.purchaseRequestService.approvePurchaseRequest(
      id,
      dto.factory_id,
      dto.performed_by,
      dto.remarks,
    );
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a pending purchase request (owner/manager)' })
  @ApiResponse({ status: 200, type: PurchaseRequestResponseDto })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PurchaseRequestActionDto,
  ) {
    return this.purchaseRequestService.rejectPurchaseRequest(
      id,
      dto.factory_id,
      dto.performed_by,
      dto.remarks,
    );
  }

  @Post(':id/assign-vendor')
  @ApiOperation({ summary: 'Assign or change vendor on approved request' })
  @ApiResponse({ status: 200, type: PurchaseRequestResponseDto })
  assignVendor(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignVendorDto,
  ) {
    return this.purchaseRequestService.assignVendor(
      id,
      dto.factory_id,
      dto.vendor_id,
      dto.performed_by,
    );
  }

  @Post(':id/remove-vendor')
  @ApiOperation({ summary: 'Remove assigned vendor from purchase request' })
  @ApiResponse({ status: 200, type: PurchaseRequestResponseDto })
  removeVendor(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PurchaseRequestActionDto,
  ) {
    return this.purchaseRequestService.removeVendor(
      id,
      dto.factory_id,
      dto.performed_by,
    );
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close an assigned purchase request' })
  @ApiResponse({ status: 200, type: PurchaseRequestResponseDto })
  close(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PurchaseRequestActionDto,
  ) {
    return this.purchaseRequestService.closePurchaseRequest(
      id,
      dto.factory_id,
      dto.performed_by,
    );
  }
}
