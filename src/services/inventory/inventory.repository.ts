import { Injectable } from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import {
  InventoryCategory,
  InventoryItem,
  InventoryLocation,
  InventoryTransaction,
} from './inventory.schema';

@Injectable()
export class InventoryRepository {
  readonly categoryModel: typeof InventoryCategory;
  readonly locationModel: typeof InventoryLocation;
  readonly itemModel: typeof InventoryItem;
  readonly transactionModel: typeof InventoryTransaction;

  constructor(private readonly dbService: DbService) {
    this.categoryModel = this.dbService.sqlService.InventoryCategory;
    this.locationModel = this.dbService.sqlService.InventoryLocation;
    this.itemModel = this.dbService.sqlService.InventoryItem;
    this.transactionModel = this.dbService.sqlService.InventoryTransaction;
  }
}
