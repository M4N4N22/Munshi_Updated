import { Injectable } from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import { PurchaseRequest } from './purchase-requests.schema';

@Injectable()
export class PurchaseRequestRepository {
  readonly model: typeof PurchaseRequest;

  constructor(private readonly dbService: DbService) {
    this.model = this.dbService.sqlService.PurchaseRequest;
  }
}
