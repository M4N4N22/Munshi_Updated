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
  ],
  providers: [WhatsAppService, AttendanceCronService],
  controllers: [WhatsAppController],
})
export class WhatsAppModule {}
