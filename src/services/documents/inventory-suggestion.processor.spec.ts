import { InventorySuggestionProcessor } from './inventory-suggestion.processor';
import { DocumentRepository } from './documents.repository';
import { InventoryRepository } from 'src/services/inventory/inventory.repository';
import { DOCUMENT_TYPE, SUGGESTION_TYPE } from './documents.constants';

describe('InventorySuggestionProcessor', () => {
  let processor: InventorySuggestionProcessor;
  let inventoryRepository: jest.Mocked<InventoryRepository>;

  beforeEach(() => {
    inventoryRepository = {
      listItems: jest.fn(),
    } as unknown as jest.Mocked<InventoryRepository>;

    processor = new InventorySuggestionProcessor(
      {} as DocumentRepository,
      inventoryRepository,
    );
  });

  it('generates INITIAL_INVENTORY_IMPORT when factory inventory is empty', async () => {
    inventoryRepository.listItems.mockResolvedValue({ count: 0, rows: [] } as any);

    const suggestions = await processor.generateFromExtraction(
      {
        id: 1,
        document_id: 10,
        factory_id: 1,
        extraction_version: 'v1',
        payload: {},
      },
      {
        document_type: DOCUMENT_TYPE.INVENTORY_IMPORT,
        items: [
          { name: 'Cement', quantity: 500 },
          { name: 'Steel Rod', quantity: 200 },
        ],
      },
    );

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].suggestion_type).toBe(
      SUGGESTION_TYPE.INITIAL_INVENTORY_IMPORT,
    );
    expect(suggestions[0].payload.summary).toContain('Cement');
  });

  it('generates NEW_INVENTORY_ITEM for unknown items when inventory exists', async () => {
    inventoryRepository.listItems.mockResolvedValue({
      count: 2,
      rows: [
        { id: 1, name: 'Cement', sku: 'CEM001' },
        { id: 2, name: 'Steel Rod', sku: 'STL001' },
      ],
    } as any);

    const suggestions = await processor.generateFromExtraction(
      {
        id: 2,
        document_id: 11,
        factory_id: 1,
        extraction_version: 'v1',
        payload: {},
      },
      {
        document_type: DOCUMENT_TYPE.STOCK_REGISTER,
        items: [
          { name: 'Cement', quantity: 10 },
          { name: 'Aluminium Sheet', quantity: 5 },
        ],
      },
    );

    const types = suggestions.map((s) => s.suggestion_type);
    expect(types).toContain(SUGGESTION_TYPE.STOCK_IN);
    expect(types).toContain(SUGGESTION_TYPE.NEW_INVENTORY_ITEM);
    expect(
      suggestions.find((s) => s.suggestion_type === SUGGESTION_TYPE.NEW_INVENTORY_ITEM)
        ?.payload.item,
    ).toMatchObject({ name: 'Aluminium Sheet' });
  });
});
