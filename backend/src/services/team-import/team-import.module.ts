import { Module } from '@nestjs/common';
import { DepartmentsModule } from 'src/services/departments/departments.module';
import { FactoryModule } from 'src/services/factories/factories.module';
import { UserModule } from 'src/services/users/users.module';
import { WorkflowModule } from 'src/services/workflow/workflow.module';
import { TeamCsvImportService } from './team-csv-import.service';

@Module({
  imports: [FactoryModule, UserModule, DepartmentsModule, WorkflowModule],
  providers: [TeamCsvImportService],
  exports: [TeamCsvImportService],
})
export class TeamImportModule {}
