import { Injectable } from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import { WorkflowSession } from './workflow.schema';

@Injectable()
export class WorkflowSessionRepository {
  readonly model: typeof WorkflowSession;

  constructor(private readonly dbService: DbService) {
    this.model = this.dbService.sqlService.WorkflowSession;
  }
}
