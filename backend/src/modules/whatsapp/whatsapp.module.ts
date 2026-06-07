import { Module } from '@nestjs/common';
import { AttendanceCronService, WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { AttendanceModule } from 'src/services/attendance/attendance.module';
import { UserModule } from 'src/services/users/users.module';
import { IssueModule } from 'src/services/issues/issues.module';
import { TasksModule } from 'src/services/tasks/tasks.module';
import { FactoryModule } from 'src/services/factories/factories.module';
import { ReportsModule } from 'src/services/reports/reports.module';
import { MessagingModule } from 'src/core/messaging/messaging.module';
import { DepartmentsModule } from 'src/services/departments/departments.module';
import { WorkflowModule } from 'src/services/workflow/workflow.module';
import { InventoryModule } from 'src/services/inventory/inventory.module';
import { TaskInventoryResolutionModule } from 'src/services/task-inventory-resolution/task-inventory-resolution.module';
import { BusinessReadinessService } from './business-readiness.service';
import { OwnerHomeService } from './owner-home.service';
import { TeamBulkImportService } from './team-bulk-import.service';
import { InventoryBulkImportService } from './inventory-bulk-import.service';
import { OlliMediaService } from 'src/core/messaging/olli-media.service';

@Module({
  imports: [
    MessagingModule,
    DepartmentsModule,
    AttendanceModule,
    UserModule,
    IssueModule,
    TasksModule,
    FactoryModule,
    ReportsModule,
    WorkflowModule,
    InventoryModule,
    TaskInventoryResolutionModule,
  ],
  providers: [
    WhatsAppService,
    AttendanceCronService,
    BusinessReadinessService,
    OwnerHomeService,
    TeamBulkImportService,
    InventoryBulkImportService,
    OlliMediaService,
  ],
  controllers: [WhatsAppController],
})
export class WhatsAppModule {}

