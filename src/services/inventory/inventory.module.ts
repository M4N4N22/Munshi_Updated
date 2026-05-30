import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryRepository } from './inventory.repository';
import { InventoryService } from './inventory.service';
import { InventoryTransactionService } from './inventory-transaction.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, InventoryRepository, InventoryTransactionService],
  exports: [InventoryService, InventoryTransactionService, InventoryRepository],
})
export class InventoryModule {}
