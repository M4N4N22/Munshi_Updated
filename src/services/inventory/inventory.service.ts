import { Injectable } from '@nestjs/common';
import { NOT_IMPLEMENTED_RESPONSE } from 'src/core/constants/not-implemented.constants';
import {
  CreateInventoryCategoryDto,
  CreateInventoryItemDto,
  CreateInventoryLocationDto,
  CreateInventoryTransactionDto,
} from './inventory.dto';
import { InventoryRepository } from './inventory.repository';

@Injectable()
export class InventoryService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  listCategories(_factoryId?: number) {
    void this.inventoryRepository;
    return NOT_IMPLEMENTED_RESPONSE;
  }

  createCategory(_dto: CreateInventoryCategoryDto) {
    return NOT_IMPLEMENTED_RESPONSE;
  }

  listLocations(_factoryId?: number) {
    return NOT_IMPLEMENTED_RESPONSE;
  }

  createLocation(_dto: CreateInventoryLocationDto) {
    return NOT_IMPLEMENTED_RESPONSE;
  }

  listItems(_factoryId?: number) {
    return NOT_IMPLEMENTED_RESPONSE;
  }

  findItem(_id: number) {
    return NOT_IMPLEMENTED_RESPONSE;
  }

  createItem(_dto: CreateInventoryItemDto) {
    return NOT_IMPLEMENTED_RESPONSE;
  }

  listTransactions(_factoryId?: number, _itemId?: number) {
    return NOT_IMPLEMENTED_RESPONSE;
  }

  createTransaction(_dto: CreateInventoryTransactionDto) {
    return NOT_IMPLEMENTED_RESPONSE;
  }
}
