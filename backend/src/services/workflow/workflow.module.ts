import { Module, forwardRef } from '@nestjs/common';
import { VendorModule } from 'src/services/vendors/vendors.module';
import { UserModule } from 'src/services/users/users.module';
import { FactoryModule } from 'src/services/factories/factories.module';
import { DepartmentsModule } from 'src/services/departments/departments.module';
import { MessagingModule } from 'src/core/messaging/messaging.module';
import { InventoryModule } from 'src/services/inventory/inventory.module';
import { PurchaseRequestModule } from 'src/services/purchase-requests/purchase-requests.module';
import { DocumentModule } from 'src/services/documents/documents.module';
import { VendorOnboardingWorkflowHandler } from './handlers/vendor-onboarding.handler';
import { WorkerOnboardingWorkflowHandler } from './handlers/worker-onboarding.handler';
import { InventoryCreateWorkflowHandler } from './handlers/inventory-create.handler';
import { PurchaseRequestCreateWorkflowHandler } from './handlers/purchase-request-create.handler';
import { BusinessDiscoveryModule } from 'src/services/business-discovery/business-discovery.module';
import { BusinessDiscoveryWorkflowHandler } from './handlers/business-discovery.handler';
import { AssignClarifyWorkflowHandler } from './handlers/assign-clarify.handler';
import { TaskInventoryCreationWorkflowHandler } from './handlers/task-inventory-creation.handler';
import { TaskInventoryResolutionModule } from 'src/services/task-inventory-resolution/task-inventory-resolution.module';
import { TasksModule } from 'src/services/tasks/tasks.module';
import { SuggestionApprovalWorkflowHandler } from './handlers/suggestion-approval.handler';
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
    InventoryModule,
    PurchaseRequestModule,
    TasksModule,
    forwardRef(() => DocumentModule),
    BusinessDiscoveryModule,
    forwardRef(() => TaskInventoryResolutionModule),
  ],
  providers: [
    WorkflowSessionRepository,
    WorkflowSessionService,
    VendorOnboardingWorkflowHandler,
    WorkerOnboardingWorkflowHandler,
    InventoryCreateWorkflowHandler,
    SuggestionApprovalWorkflowHandler,
    PurchaseRequestCreateWorkflowHandler,
    BusinessDiscoveryWorkflowHandler,
    AssignClarifyWorkflowHandler,
    TaskInventoryCreationWorkflowHandler,
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
