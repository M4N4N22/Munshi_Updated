import { Module } from '@nestjs/common';
import { TasksController, TasksService } from './tasks.service';
import { TaskDeadlineCronService } from './task-deadline.cron';
import { MessagingModule } from 'src/core/messaging/messaging.module';
import { DepartmentsModule } from 'src/services/departments/departments.module';

@Module({
  imports: [MessagingModule, DepartmentsModule],
  controllers: [TasksController],
  providers: [TasksService, TaskDeadlineCronService],
  exports: [TasksService],
})
export class TasksModule {}
