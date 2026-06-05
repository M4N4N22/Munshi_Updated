import { Module } from '@nestjs/common';
import { TasksController, TasksService } from './tasks.service';
import { TaskDeadlineCronService } from './task-deadline.cron';
import { MessagingModule } from 'src/core/messaging/messaging.module';
import { DepartmentsModule } from 'src/services/departments/departments.module';
import { InventoryModule } from 'src/services/inventory/inventory.module';
import { DomainEventsModule } from 'src/services/domain-events/domain-events.module';

@Module({
  imports: [MessagingModule, DepartmentsModule, InventoryModule, DomainEventsModule],
  controllers: [TasksController],
  providers: [TasksService, TaskDeadlineCronService],
  exports: [TasksService],
})
export class TasksModule {}
