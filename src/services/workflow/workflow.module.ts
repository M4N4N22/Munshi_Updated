import { Module } from '@nestjs/common';
import { VendorModule } from 'src/services/vendors/vendors.module';
import { UserModule } from 'src/services/users/users.module';
import { VendorOnboardingWorkflowHandler } from './handlers/vendor-onboarding.handler';
import { WorkflowSessionRepository } from './workflow-session.repository';
import { WorkflowSessionService } from './workflow-session.service';
import { WorkflowRegistry } from './workflow.registry';
import {
  WorkflowEngineService,
  WorkflowRouterService,
} from './workflow-engine.service';

@Module({
  imports: [VendorModule, UserModule],
  providers: [
    WorkflowSessionRepository,
    WorkflowSessionService,
    VendorOnboardingWorkflowHandler,
    WorkflowRegistry,
    WorkflowEngineService,
    WorkflowRouterService,
  ],
  exports: [
    WorkflowSessionService,
    WorkflowRegistry,
    WorkflowEngineService,
    WorkflowRouterService,
  ],
})
export class WorkflowModule {}
