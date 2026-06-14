import { Module, forwardRef } from '@nestjs/common';
import { InternalCallGuard } from 'src/core/guards/guards';
import { InventoryModule } from 'src/services/inventory/inventory.module';
import { TasksModule } from 'src/services/tasks/tasks.module';
import { FactoryModule } from 'src/services/factories/factories.module';
import { UserModule } from 'src/services/users/users.module';
import { WorkflowModule } from 'src/services/workflow/workflow.module';
import { InventoryResolverService } from './inventory-resolver.service';
import { TaskInventoryResolutionController } from './task-inventory-resolution.controller';
import { TaskInventoryResolutionService } from './task-inventory-resolution.service';
import { WorkerResolverService } from './worker-resolver.service';
import { TaskInventoryConfirmationService } from './task-inventory-confirmation.service';
import { TaskInventoryCreationService } from './task-inventory-creation.service';
import { TaskInventoryStockAvailabilityService } from './task-inventory-stock-availability.service';
import { MlTaskInventoryClient } from './ml-task-inventory.client';
import { TaskInventoryNlOrchestratorService } from './task-inventory-nl.orchestrator';

@Module({
  imports: [
    InventoryModule,
    TasksModule,
    FactoryModule,
    UserModule,
    forwardRef(() => WorkflowModule),
  ],
  controllers: [TaskInventoryResolutionController],
  providers: [
    InternalCallGuard,
    InventoryResolverService,
    WorkerResolverService,
    TaskInventoryResolutionService,
    TaskInventoryConfirmationService,
    TaskInventoryCreationService,
    TaskInventoryStockAvailabilityService,
    MlTaskInventoryClient,
    TaskInventoryNlOrchestratorService,
  ],
  exports: [
    InventoryResolverService,
    WorkerResolverService,
    TaskInventoryResolutionService,
    TaskInventoryConfirmationService,
    TaskInventoryCreationService,
    TaskInventoryStockAvailabilityService,
    MlTaskInventoryClient,
    TaskInventoryNlOrchestratorService,
  ],
})
export class TaskInventoryResolutionModule {}