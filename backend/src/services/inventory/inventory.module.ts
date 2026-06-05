import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryRepository } from './inventory.repository';
import { InventoryService } from './inventory.service';
import { InventoryTransactionService } from './inventory-transaction.service';
import { InventoryImportService } from './inventory-import.service';
import { InventoryImportUploadService } from './inventory-import-upload.service';

@Module({
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventoryRepository,
    InventoryTransactionService,
    InventoryImportService,
    InventoryImportUploadService,
  ],
  exports: [
    InventoryService,
    InventoryTransactionService,
    InventoryRepository,
    InventoryImportService,
    InventoryImportUploadService,
  ],
})
export class InventoryModule {}
