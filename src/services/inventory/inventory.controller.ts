import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateInventoryCategoryDto,
  CreateInventoryItemDto,
  CreateInventoryLocationDto,
  RecordInventoryTransactionDto,
  UpdateInventoryCategoryDto,
  UpdateInventoryItemDto,
  UpdateInventoryLocationDto,
} from './inventory.dto';
import { InventoryService } from './inventory.service';
import { InventoryTransactionService } from './inventory-transaction.service';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly transactionService: InventoryTransactionService,
  ) {}

  @Get('categories')
  listCategories(
    @Query('factory_id', ParseIntPipe) factoryId: number,
    @Query('active_only') activeOnly?: string,
  ) {
    return this.inventoryService.listCategories(
      factoryId,
      activeOnly === 'true',
    );
  }

  @Post('categories')
  createCategory(@Body() dto: CreateInventoryCategoryDto) {
    return this.inventoryService.createCategory(dto);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Query('factory_id', ParseIntPipe) factoryId: number,
    @Body() dto: UpdateInventoryCategoryDto,
  ) {
    return this.inventoryService.updateCategory(id, factoryId, dto);
  }

  @Patch('categories/:id/deactivate')
  deactivateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Query('factory_id', ParseIntPipe) factoryId: number,
  ) {
    return this.inventoryService.deactivateCategory(id, factoryId);
  }

  @Get('locations')
  listLocations(
    @Query('factory_id', ParseIntPipe) factoryId: number,
    @Query('active_only') activeOnly?: string,
  ) {
    return this.inventoryService.listLocations(
      factoryId,
      activeOnly === 'true',
    );
  }

  @Post('locations')
  createLocation(@Body() dto: CreateInventoryLocationDto) {
    return this.inventoryService.createLocation(dto);
  }

  @Patch('locations/:id')
  updateLocation(
    @Param('id', ParseIntPipe) id: number,
    @Query('factory_id', ParseIntPipe) factoryId: number,
    @Body() dto: UpdateInventoryLocationDto,
  ) {
    return this.inventoryService.updateLocation(id, factoryId, dto);
  }

  @Patch('locations/:id/deactivate')
  deactivateLocation(
    @Param('id', ParseIntPipe) id: number,
    @Query('factory_id', ParseIntPipe) factoryId: number,
  ) {
    return this.inventoryService.deactivateLocation(id, factoryId);
  }

  @Get('items')
  listItems(
    @Query('factory_id', ParseIntPipe) factoryId: number,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
    @Query('active_only') activeOnly?: string,
  ) {
    return this.inventoryService.listItems(factoryId, {
      page: page ? Number(page) : undefined,
      page_size: pageSize ? Number(pageSize) : undefined,
      activeOnly: activeOnly === 'true',
    });
  }

  @Get('items/low-stock')
  listLowStock(@Query('factory_id', ParseIntPipe) factoryId: number) {
    return this.inventoryService.listLowStockItems(factoryId);
  }

  @Get('items/by-sku')
  findBySku(
    @Query('factory_id', ParseIntPipe) factoryId: number,
    @Query('sku') sku: string,
  ) {
    return this.inventoryService.findItemBySku(factoryId, sku);
  }

  @Get('items/:id')
  findItem(
    @Param('id', ParseIntPipe) id: number,
    @Query('factory_id', ParseIntPipe) factoryId: number,
  ) {
    return this.inventoryService.findItem(id, factoryId);
  }

  @Get('items/:id/status')
  getItemStatus(
    @Param('id', ParseIntPipe) id: number,
    @Query('factory_id', ParseIntPipe) factoryId: number,
  ) {
    return this.inventoryService.getInventoryStatus(id, factoryId);
  }

  @Get('items/:id/quantity')
  getItemQuantity(
    @Param('id', ParseIntPipe) id: number,
    @Query('factory_id', ParseIntPipe) factoryId: number,
  ) {
    return this.inventoryService.getCurrentQuantity(id, factoryId);
  }

  @Post('items')
  createItem(@Body() dto: CreateInventoryItemDto) {
    return this.inventoryService.createItem(dto);
  }

  @Patch('items/:id')
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Query('factory_id', ParseIntPipe) factoryId: number,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.inventoryService.updateItem(id, factoryId, dto);
  }

  @Patch('items/:id/deactivate')
  deactivateItem(
    @Param('id', ParseIntPipe) id: number,
    @Query('factory_id', ParseIntPipe) factoryId: number,
  ) {
    return this.inventoryService.deactivateItem(id, factoryId);
  }

  @Get('transactions')
  listTransactions(
    @Query('factory_id', ParseIntPipe) factoryId: number,
    @Query('inventory_item_id') itemId?: string,
  ) {
    return this.inventoryService.listTransactions(
      factoryId,
      itemId ? Number(itemId) : undefined,
    );
  }

  @Post('transactions/stock-in')
  recordStockIn(@Body() dto: RecordInventoryTransactionDto) {
    return this.transactionService.recordStockIn(dto);
  }

  @Post('transactions/stock-out')
  recordStockOut(@Body() dto: RecordInventoryTransactionDto) {
    return this.transactionService.recordStockOut(dto);
  }

  @Post('transactions/adjustment')
  recordAdjustment(@Body() dto: RecordInventoryTransactionDto) {
    return this.transactionService.recordAdjustment(dto);
  }
}
