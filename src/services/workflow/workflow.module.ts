import { Module } from '@nestjs/common';
import { VendorModule } from 'src/services/vendors/vendors.module';
import { UserModule } from 'src/services/users/users.module';
import { FactoryModule } from 'src/services/factories/factories.module';
import { DepartmentsModule } from 'src/services/departments/departments.module';
import { MessagingModule } from 'src/core/messaging/messaging.module';
import { VendorOnboardingWorkflowHandler } from './handlers/vendor-onboarding.handler';
import { WorkerOnboardingWorkflowHandler } from './handlers/worker-onboarding.handler';
import { WorkflowSessionRepository } from './workflow-session.repository';
import { WorkflowSessionService } from './workflow-session.service';
import { WorkflowRegistry } from './workflow.registry';
import {
  WorkflowEngineService,
  WorkflowRouterService,
} from './workflow-engine.service';
import { WorkerOnboardingService } from './worker-onboarding.service';
import { WorkflowExpiryCronService } from './workflow-expiry.cron';

@Module({
  imports: [
    VendorModule,
    UserModule,
    FactoryModule,
    DepartmentsModule,
    MessagingModule,
  ],
  providers: [
    WorkflowSessionRepository,
    WorkflowSessionService,
    VendorOnboardingWorkflowHandler,
    WorkerOnboardingWorkflowHandler,
    WorkerOnboardingService,
    WorkflowRegistry,
    WorkflowEngineService,
    WorkflowRouterService,
    WorkflowExpiryCronService,
  ],
  exports: [
    WorkflowSessionService,
    WorkflowRegistry,
    WorkflowEngineService,
    WorkflowRouterService,
    WorkerOnboardingService,
  ],
})
export class WorkflowModule {}
