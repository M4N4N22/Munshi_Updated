import { Module, forwardRef } from '@nestjs/common';
import { InventoryModule } from 'src/services/inventory/inventory.module';
import { WorkflowModule } from 'src/services/workflow/workflow.module';
import { DocumentController } from './documents.controller';
import { DocumentRegistry } from './document-registry';
import { DocumentExtractionContractService } from './document-extraction-contract.service';
import { DocumentRepository } from './documents.repository';
import { DocumentService } from './documents.service';
import { InventorySuggestionProcessor } from './inventory-suggestion.processor';
import { SuggestionEngineService } from './suggestion-engine.service';
import { SuggestionExecutionService } from './suggestion-execution.service';

@Module({
  imports: [InventoryModule, forwardRef(() => WorkflowModule)],
  controllers: [DocumentController],
  providers: [
    DocumentRepository,
    DocumentRegistry,
    DocumentExtractionContractService,
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
    DocumentRegistry,
  ],
})
export class DocumentModule {}
