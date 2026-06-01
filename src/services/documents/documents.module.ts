import { Module, forwardRef } from '@nestjs/common';
import { MessagingModule } from 'src/core/messaging/messaging.module';
import { BusinessDiscoveryModule } from 'src/services/business-discovery/business-discovery.module';
import { InventoryModule } from 'src/services/inventory/inventory.module';
import { UserModule } from 'src/services/users/users.module';
import { WorkflowModule } from 'src/services/workflow/workflow.module';
import { DocumentController } from './documents.controller';
import { DocumentRegistry } from './document-registry';
import { DocumentExtractionContractService } from './document-extraction-contract.service';
import { DocumentProcessingOrchestrator } from './document-processing.orchestrator';
import { DocumentRepository } from './documents.repository';
import { DocumentService } from './documents.service';
import { ContractValidationService } from './contract-validation.service';
import { ExtractionAuditService } from './extraction-audit.service';
import { InventorySuggestionProcessor } from './inventory-suggestion.processor';
import { MlParserAdapter } from './parser/ml-parser.adapter';
import { SuggestionEngineService } from './suggestion-engine.service';
import { SuggestionExecutionService } from './suggestion-execution.service';
import { SuggestionQueueService } from './suggestion-queue.service';
import { SuggestionWorkflowTriggerService } from './suggestion-workflow-trigger.service';
import { LocalStorageProvider } from './storage/local-storage.provider';

@Module({
  imports: [
    InventoryModule,
    UserModule,
    MessagingModule,
    forwardRef(() => WorkflowModule),
    forwardRef(() => BusinessDiscoveryModule),
  ],
  controllers: [DocumentController],
  providers: [
    DocumentRepository,
    DocumentRegistry,
    DocumentExtractionContractService,
    ExtractionAuditService,
    ContractValidationService,
    LocalStorageProvider,
    MlParserAdapter,
    SuggestionQueueService,
    SuggestionWorkflowTriggerService,
    DocumentProcessingOrchestrator,
    DocumentService,
    InventorySuggestionProcessor,
    SuggestionEngineService,
    SuggestionExecutionService,
  ],
  exports: [
    DocumentService,
    DocumentRepository,
    SuggestionEngineService,
    SuggestionExecutionService,
    SuggestionWorkflowTriggerService,
    DocumentRegistry,
  ],
})
export class DocumentModule {}
