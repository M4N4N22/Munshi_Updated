import { Injectable } from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import { ApprovalRequest } from './approvals.schema';

@Injectable()
export class ApprovalRepository {
  readonly model: typeof ApprovalRequest;

  constructor(private readonly dbService: DbService) {
    this.model = this.dbService.sqlService.ApprovalRequest;
  }
}
