import { Injectable } from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import { Vendor } from './vendors.schema';

@Injectable()
export class VendorRepository {
  readonly model: typeof Vendor;

  constructor(private readonly dbService: DbService) {
    this.model = this.dbService.sqlService.Vendor;
  }
}
