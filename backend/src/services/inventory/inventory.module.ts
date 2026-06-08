import { Module, forwardRef } from '@nestjs/common';
import { MessagingModule } from 'src/core/messaging/messaging.module';
import { DomainEventsModule } from 'src/services/domain-events/domain-events.module';
import { InventoryController } from './inventory.controller';
import { InventoryRepository } from './inventory.repository';
import { InventoryService } from './inventory.service';
import { InventoryTransactionService } from './inventory-transaction.service';
import { InventoryImportService } from './inventory-import.service';
import { InventoryImportUploadService } from './inventory-import-upload.service';
import { InventoryLowStockAlertHandler } from './inventory-low-stock-alert.handler';
import { LowStockAlertContextService } from './low-stock-alert-context.service';

@Module({
  imports: [MessagingModule, forwardRef(() => DomainEventsModule)],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventoryRepository,
    InventoryTransactionService,
    InventoryImportService,
    InventoryImportUploadService,
    InventoryLowStockAlertHandler,
    LowStockAlertContextService,
  ],
  exports: [
    InventoryService,
    InventoryTransactionService,
    InventoryRepository,
    InventoryImportService,
    InventoryImportUploadService,
    InventoryLowStockAlertHandler,
    LowStockAlertContextService,
  ],
})
export class InventoryModule {}
