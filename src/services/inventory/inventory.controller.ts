import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  CreateInventoryCategoryDto,
  CreateInventoryItemDto,
  CreateInventoryLocationDto,
  CreateInventoryTransactionDto,
} from './inventory.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('categories')
  listCategories(@Query('factory_id') factoryId?: string) {
    return this.inventoryService.listCategories(
      factoryId ? Number(factoryId) : undefined,
    );
  }

  @Post('categories')
  createCategory(@Body() dto: CreateInventoryCategoryDto) {
    return this.inventoryService.createCategory(dto);
  }

  @Get('locations')
  listLocations(@Query('factory_id') factoryId?: string) {
    return this.inventoryService.listLocations(
      factoryId ? Number(factoryId) : undefined,
    );
  }

  @Post('locations')
  createLocation(@Body() dto: CreateInventoryLocationDto) {
    return this.inventoryService.createLocation(dto);
  }

  @Get('items')
  listItems(@Query('factory_id') factoryId?: string) {
    return this.inventoryService.listItems(
      factoryId ? Number(factoryId) : undefined,
    );
  }

  @Get('items/:id')
  findItem(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.findItem(id);
  }

  @Post('items')
  createItem(@Body() dto: CreateInventoryItemDto) {
    return this.inventoryService.createItem(dto);
  }

  @Get('transactions')
  listTransactions(
    @Query('factory_id') factoryId?: string,
    @Query('inventory_item_id') itemId?: string,
  ) {
    return this.inventoryService.listTransactions(
      factoryId ? Number(factoryId) : undefined,
      itemId ? Number(itemId) : undefined,
    );
  }

  @Post('transactions')
  createTransaction(@Body() dto: CreateInventoryTransactionDto) {
    return this.inventoryService.createTransaction(dto);
  }
}
