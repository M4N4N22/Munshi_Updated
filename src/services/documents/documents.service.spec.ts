import { NotFoundException } from '@nestjs/common';
import { DocumentService } from './documents.service';
import { DocumentRepository } from './documents.repository';
import { DocumentRegistry } from './document-registry';
import { DocumentExtractionContractService } from './document-extraction-contract.service';
import { SuggestionEngineService } from './suggestion-engine.service';
import { SuggestionExecutionService } from './suggestion-execution.service';
import { WorkflowSessionService } from 'src/services/workflow/workflow-session.service';
import { DOCUMENT_STATUS, DOCUMENT_TYPE } from './documents.constants';

describe('DocumentService', () => {
  let service: DocumentService;
  let repository: jest.Mocked<DocumentRepository>;
  let suggestionEngine: jest.Mocked<SuggestionEngineService>;

  beforeEach(() => {
    repository = {
      findFactoryById: jest.fn().mockResolvedValue({ id: 1 }),
      createDocument: jest.fn().mockResolvedValue({
        id: 1,
        factory_id: 1,
        document_type: DOCUMENT_TYPE.INVENTORY_IMPORT,
        status: DOCUMENT_STATUS.UPLOADED,
        metadata: {},
      }),
      findDocumentById: jest.fn(),
      updateDocument: jest.fn(),
      createJob: jest.fn().mockResolvedValue({ id: 1 }),
      updateJob: jest.fn(),
      createExtraction: jest.fn().mockResolvedValue({
        id: 5,
        document_id: 1,
        factory_id: 1,
        extraction_version: 'v1',
        document_type_detected: DOCUMENT_TYPE.INVENTORY_IMPORT,
        payload: { items: [{ name: 'Cement', quantity: 500 }] },
      }),
    } as unknown as jest.Mocked<DocumentRepository>;

    suggestionEngine = {
      generateFromExtraction: jest.fn().mockResolvedValue({
        suggestions: [{ id: 7, suggestion_type: 'INITIAL_INVENTORY_IMPORT' }],
        documentStatus: DOCUMENT_STATUS.SUGGESTED,
      }),
    } as unknown as jest.Mocked<SuggestionEngineService>;

    service = new DocumentService(
      repository,
      new DocumentRegistry(),
      new DocumentExtractionContractService(new DocumentRegistry()),
      suggestionEngine,
      {} as SuggestionExecutionService,
      {} as WorkflowSessionService,
    );
  });

  it('creates document metadata without parsing', async () => {
    const doc = await service.createDocument({
      factory_id: 1,
      document_type: DOCUMENT_TYPE.INVENTORY_IMPORT,
      file_name: 'inventory.csv',
      storage_ref: 's3://bucket/key',
    });

    expect(doc.status).toBe(DOCUMENT_STATUS.UPLOADED);
    expect(repository.createDocument).toHaveBeenCalled();
  });

  it('stores structured extraction and marks document EXTRACTED', async () => {
    repository.findDocumentById.mockResolvedValue({
      id: 1,
      factory_id: 1,
      document_type: DOCUMENT_TYPE.UNKNOWN,
    } as any);

    const extraction = await service.storeExtraction(1, {
      factory_id: 1,
      document_type_detected: DOCUMENT_TYPE.INVENTORY_IMPORT,
      payload: {
        items: [{ name: 'Cement', quantity: 500 }],
      },
    });

    expect(extraction.id).toBe(5);
    expect(repository.updateDocument).toHaveBeenCalledWith(
      1,
      1,
      expect.objectContaining({ status: DOCUMENT_STATUS.EXTRACTED }),
    );
  });

  it('throws when factory not found', async () => {
    repository.findFactoryById.mockResolvedValue(null);

    await expect(
      service.createDocument({ factory_id: 999, document_type: DOCUMENT_TYPE.UNKNOWN }),
    ).rejects.toThrow(NotFoundException);
  });

  it('delegates suggestion generation to suggestion engine', async () => {
    repository.findDocumentById.mockResolvedValue({ id: 1, factory_id: 1 } as any);

    const result = await service.generateSuggestions(1, 5, 1);

    expect(suggestionEngine.generateFromExtraction).toHaveBeenCalledWith(5, 1);
    expect(result.documentStatus).toBe(DOCUMENT_STATUS.SUGGESTED);
  });
});
