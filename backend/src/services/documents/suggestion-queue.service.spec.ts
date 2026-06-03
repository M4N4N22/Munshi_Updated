import { NotFoundException } from '@nestjs/common';
import { SuggestionQueueService } from './suggestion-queue.service';
import { DocumentRepository } from './documents.repository';

describe('SuggestionQueueService', () => {
  let service: SuggestionQueueService;
  let repository: jest.Mocked<DocumentRepository>;

  beforeEach(() => {
    repository = {
      findDocumentById: jest.fn(),
      updateDocument: jest.fn(),
    } as unknown as jest.Mocked<DocumentRepository>;

    service = new SuggestionQueueService(repository);
  });

  it('initializes and advances queue sequentially', async () => {
    repository.findDocumentById.mockResolvedValue({
      id: 1,
      factory_id: 1,
      metadata: {},
    } as any);
    repository.updateDocument.mockImplementation(async (_id, _factoryId, patch: any) => {
      const metadata = patch.metadata ?? {};
      repository.findDocumentById.mockResolvedValue({
        id: 1,
        factory_id: 1,
        metadata,
      } as any);
      return undefined as any;
    });

    await service.initializeQueue(1, 1, [10, 11, 12]);
    expect(await service.getCurrentSuggestionId(1, 1)).toBe(10);

    repository.findDocumentById.mockResolvedValue({
      id: 1,
      factory_id: 1,
      metadata: {
        suggestion_queue: {
          suggestion_ids: [10, 11, 12],
          current_index: 0,
          completed: false,
        },
      },
    } as any);

    const step1 = await service.advanceQueue(1, 1);
    expect(step1.nextSuggestionId).toBe(11);
    expect(step1.completed).toBe(false);

    repository.findDocumentById.mockResolvedValue({
      id: 1,
      factory_id: 1,
      metadata: {
        suggestion_queue: {
          suggestion_ids: [10, 11, 12],
          current_index: 2,
          completed: false,
        },
      },
    } as any);

    const stepFinal = await service.advanceQueue(1, 1);
    expect(stepFinal.completed).toBe(true);
    expect(stepFinal.nextSuggestionId).toBeNull();
  });

  it('throws when queue is missing', async () => {
    repository.findDocumentById.mockResolvedValue({
      id: 1,
      factory_id: 1,
      metadata: {},
    } as any);

    await expect(service.advanceQueue(1, 1)).rejects.toThrow(NotFoundException);
  });
});
