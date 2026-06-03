import { BadRequestException } from '@nestjs/common';
import { SuggestionExecutionService } from './suggestion-execution.service';
import { DocumentRepository } from './documents.repository';
import { InventoryRepository } from 'src/services/inventory/inventory.repository';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { InventoryTransactionService } from 'src/services/inventory/inventory-transaction.service';
import {
  SUGGESTION_STATUS,
  SUGGESTION_TYPE,
} from './documents.constants';

describe('SuggestionExecutionService', () => {
  let service: SuggestionExecutionService;
  let documentRepository: jest.Mocked<DocumentRepository>;
  let inventoryService: jest.Mocked<InventoryService>;
  let inventoryTransactionService: jest.Mocked<InventoryTransactionService>;
  let inventoryRepository: jest.Mocked<InventoryRepository>;

  beforeEach(() => {
    documentRepository = {
      findSuggestionById: jest.fn(),
      updateSuggestion: jest.fn(),
      listSuggestions: jest.fn().mockResolvedValue([]),
      updateDocument: jest.fn(),
    } as unknown as jest.Mocked<DocumentRepository>;

    inventoryRepository = {
      findCategoryByName: jest.fn().mockResolvedValue(null),
      createCategory: jest.fn().mockResolvedValue({ id: 2 }),
      findLocationByName: jest.fn().mockResolvedValue(null),
      createLocation: jest.fn().mockResolvedValue({ id: 3 }),
      findItemByName: jest.fn(),
      findItemBySku: jest.fn(),
    } as unknown as jest.Mocked<InventoryRepository>;

    inventoryService = {
      createItem: jest.fn().mockResolvedValue({ id: 10, name: 'Cement' }),
    } as unknown as jest.Mocked<InventoryService>;

    inventoryTransactionService = {
      recordStockIn: jest.fn().mockResolvedValue({ id: 99 }),
    } as unknown as jest.Mocked<InventoryTransactionService>;

    service = new SuggestionExecutionService(
      documentRepository,
      inventoryRepository,
      inventoryService,
      inventoryTransactionService,
    );
  });

  it('executes INITIAL_INVENTORY_IMPORT via inventory services', async () => {
    documentRepository.findSuggestionById
      .mockResolvedValueOnce({
        id: 1,
        document_id: 5,
        factory_id: 1,
        extraction_id: 2,
        suggestion_type: SUGGESTION_TYPE.INITIAL_INVENTORY_IMPORT,
        status: SUGGESTION_STATUS.PENDING,
        payload: {
          items: [{ name: 'Cement', quantity: 500 }],
        },
      } as any)
      .mockResolvedValueOnce({
        id: 1,
        status: SUGGESTION_STATUS.EXECUTED,
      } as any);

    await service.executeApprovedSuggestion({
      suggestionId: 1,
      factoryId: 1,
      userId: 42,
    });

    expect(inventoryService.createItem).toHaveBeenCalled();
    expect(inventoryTransactionService.recordStockIn).toHaveBeenCalledWith(
      expect.objectContaining({
        inventory_item_id: 10,
        quantity: 500,
        reference_type: 'DOCUMENT_SUGGESTION',
      }),
    );
  });

  it('rejects non-pending suggestions', async () => {
    documentRepository.findSuggestionById.mockResolvedValue({
      id: 1,
      status: SUGGESTION_STATUS.EXECUTED,
    } as any);

    await expect(
      service.executeApprovedSuggestion({ suggestionId: 1, factoryId: 1 }),
    ).rejects.toThrow(BadRequestException);
  });
});
