import { Module } from '@nestjs/common';
import { AttendanceModule } from 'src/services/attendance/attendance.module';
import { InventoryModule } from 'src/services/inventory/inventory.module';
import { ReportsModule } from 'src/services/reports/reports.module';
import { TasksModule } from 'src/services/tasks/tasks.module';
import { UserModule } from 'src/services/users/users.module';
import { WorkflowModule } from 'src/services/workflow/workflow.module';
import { DemoModeController } from './demo-mode.controller';
import { DemoModeService } from './demo-mode.service';

@Module({
  imports: [
    UserModule,
    AttendanceModule,
    TasksModule,
    InventoryModule,
    ReportsModule,
    WorkflowModule,
  ],
  providers: [DemoModeService],
  controllers: [DemoModeController],
  exports: [DemoModeService],
})
export class DemoModeModule {}
