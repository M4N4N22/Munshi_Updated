import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { PurchaseRequestSuggestionService } from './purchase-request-suggestion.service';
import { PurchaseRequestRepository } from './purchase-requests.repository';
import { PurchaseRequestService } from './purchase-requests.service';
import { PurchaseRequestValidationService } from './purchase-requests.validation';

describe('PurchaseRequestSuggestionService', () => {
  let service: PurchaseRequestSuggestionService;
  const inventoryService = { listLowStockItems: jest.fn() };
  const purchaseRequestService = { createPurchaseRequest: jest.fn() };
  const purchaseRequestRepository = { appendAudit: jest.fn() };
  const validationService = { assertFactoryMember: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseRequestSuggestionService,
        { provide: InventoryService, useValue: inventoryService },
        { provide: PurchaseRequestService, useValue: purchaseRequestService },
        { provide: PurchaseRequestRepository, useValue: purchaseRequestRepository },
        { provide: PurchaseRequestValidationService, useValue: validationService },
      ],
    }).compile();
    service = module.get(PurchaseRequestSuggestionService);
  });

  it('generates low-stock suggestions', async () => {
    inventoryService.listLowStockItems.mockResolvedValue([
      {
        id: 5,
        item_id: 5,
        name: 'Cement',
        sku: 'CEM-01',
        current_quantity: '2',
        reorder_threshold: '10',
        unit: 'bags',
      },
    ]);
    const suggestions = await service.generateLowStockSuggestions(3);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].suggestion_key).toBe('low-stock:3:5');
    expect(Number(suggestions[0].suggested_quantity)).toBeGreaterThan(0);
  });
});
