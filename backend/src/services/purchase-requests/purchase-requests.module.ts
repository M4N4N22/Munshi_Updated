import { Module } from '@nestjs/common';
import { VendorModule } from 'src/services/vendors/vendors.module';
import { InventoryModule } from 'src/services/inventory/inventory.module';
import { PurchaseRequestController } from './purchase-requests.controller';
import { PurchaseRequestService } from './purchase-requests.service';
import { PurchaseRequestRepository } from './purchase-requests.repository';
import { PurchaseRequestValidationService } from './purchase-requests.validation';
import { PurchaseRequestSuggestionService } from './purchase-request-suggestion.service';
import { PurchaseRequestPrefillService } from './purchase-request-prefill.service';

@Module({
  imports: [VendorModule, InventoryModule],
  controllers: [PurchaseRequestController],
  providers: [
    PurchaseRequestService,
    PurchaseRequestRepository,
    PurchaseRequestValidationService,
    PurchaseRequestSuggestionService,
    PurchaseRequestPrefillService,
  ],
  exports: [
    PurchaseRequestService,
    PurchaseRequestRepository,
    PurchaseRequestSuggestionService,
    PurchaseRequestPrefillService,
  ],
})
export class PurchaseRequestModule {}
