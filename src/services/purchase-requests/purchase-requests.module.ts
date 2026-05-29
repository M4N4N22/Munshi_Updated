import { Module } from '@nestjs/common';
import {
  PurchaseRequestController,
  PurchaseRequestService,
} from './purchase-requests.service';
import { PurchaseRequestRepository } from './purchase-requests.repository';

@Module({
  controllers: [PurchaseRequestController],
  providers: [PurchaseRequestService, PurchaseRequestRepository],
  exports: [PurchaseRequestService, PurchaseRequestRepository],
})
export class PurchaseRequestModule {}
