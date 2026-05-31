import { DocumentProcessingOrchestrator } from './document-processing.orchestrator';
import { DocumentRepository } from './documents.repository';
import { LocalStorageProvider } from './storage/local-storage.provider';
import { MlParserAdapter } from './parser/ml-parser.adapter';
import { ContractValidationService } from './contract-validation.service';
import { SuggestionEngineService } from './suggestion-engine.service';
import { SuggestionQueueService } from './suggestion-queue.service';
import { SuggestionWorkflowTriggerService } from './suggestion-workflow-trigger.service';
import {
  DOCUMENT_JOB_STATUS,
  DOCUMENT_STATUS,
  DOCUMENT_TYPE,
} from './documents.constants';

describe('DocumentProcessingOrchestrator', () => {
  let orchestrator: DocumentProcessingOrchestrator;
  let repository: jest.Mocked<DocumentRepository>;
  let storage: jest.Mocked<LocalStorageProvider>;
  let parser: jest.Mocked<MlParserAdapter>;
  let contractValidation: jest.Mocked<ContractValidationService>;
  let suggestionEngine: jest.Mocked<SuggestionEngineService>;
  let queueService: jest.Mocked<SuggestionQueueService>;
  let workflowTrigger: jest.Mocked<SuggestionWorkflowTriggerService>;

  beforeEach(() => {
    repository = {
      findDocumentById: jest.fn().mockResolvedValue({
        id: 1,
        factory_id: 1,
        storage_ref: 'local://1/file.csv',
        file_name: 'file.csv',
        mime_type: 'text/csv',
        document_type: DOCUMENT_TYPE.INVENTORY_IMPORT,
      }),
      createJob: jest.fn().mockResolvedValue({ id: 99 }),
      updateDocument: jest.fn(),
      updateJob: jest.fn(),
      createExtraction: jest.fn().mockResolvedValue({ id: 5 }),
    } as unknown as jest.Mocked<DocumentRepository>;

    storage = {
      read: jest.fn().mockResolvedValue(Buffer.from('name,qty\nCement,1')),
    } as unknown as jest.Mocked<LocalStorageProvider>;

    parser = {
      parse: jest.fn().mockResolvedValue({
        document_type_detected: DOCUMENT_TYPE.INVENTORY_IMPORT,
        payload: {
          document_type: DOCUMENT_TYPE.INVENTORY_IMPORT,
          items: [{ name: 'Cement', quantity: 1 }],
        },
      }),
    } as unknown as jest.Mocked<MlParserAdapter>;

    contractValidation = {
      validateAndNormalize: jest.fn().mockReturnValue({
        document_type: DOCUMENT_TYPE.INVENTORY_IMPORT,
        items: [{ name: 'Cement', quantity: 1 }],
      }),
    } as unknown as jest.Mocked<ContractValidationService>;

    suggestionEngine = {
      generateFromExtraction: jest.fn().mockResolvedValue({
        suggestions: [{ id: 7 }, { id: 8 }],
      }),
    } as unknown as jest.Mocked<SuggestionEngineService>;

    queueService = {
      initializeQueue: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SuggestionQueueService>;

    workflowTrigger = {
      startQueueForDocument: jest.fn().mockResolvedValue({ started: true }),
    } as unknown as jest.Mocked<SuggestionWorkflowTriggerService>;

    orchestrator = new DocumentProcessingOrchestrator(
      repository,
      storage,
      parser,
      contractValidation,
      suggestionEngine,
      queueService,
      workflowTrigger,
    );
  });

  it('runs full ingestion pipeline', async () => {
    const result = await orchestrator.processDocument(1, 1);

    expect(storage.read).toHaveBeenCalled();
    expect(parser.parse).toHaveBeenCalled();
    expect(contractValidation.validateAndNormalize).toHaveBeenCalled();
    expect(suggestionEngine.generateFromExtraction).toHaveBeenCalledWith(5, 1);
    expect(queueService.initializeQueue).toHaveBeenCalledWith(1, 1, [7, 8]);
    expect(workflowTrigger.startQueueForDocument).toHaveBeenCalledWith(1, 1);
    expect(result.workflow_started).toBe(true);
    expect(repository.updateDocument).toHaveBeenCalledWith(
      1,
      1,
      expect.objectContaining({ status: DOCUMENT_STATUS.EXTRACTED }),
    );
    expect(repository.updateJob).toHaveBeenCalledWith(
      99,
      expect.objectContaining({ status: DOCUMENT_JOB_STATUS.COMPLETED }),
    );
  });
});
