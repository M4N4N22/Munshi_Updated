import { InventoryImportService } from './inventory-import.service';
import type { InventoryRepository } from './inventory.repository';
import type { InventoryTransactionService } from './inventory-transaction.service';
import type { InventoryCsvRow } from 'src/modules/whatsapp/inventory-csv.parse';

function row(
  partial: Partial<InventoryCsvRow> & Pick<InventoryCsvRow, 'line' | 'sku'>,
): InventoryCsvRow {
  return {
    name: partial.name ?? partial.sku,
    category: partial.category ?? 'Cat',
    location: partial.location ?? 'Loc',
    unit: partial.unit ?? 'pcs',
    quantity: partial.quantity ?? '1.0000',
    reorder_threshold: partial.reorder_threshold ?? null,
    ...partial,
  };
}

describe('InventoryImportService review helpers', () => {
  const repository = {
    findCategoryByName: jest.fn(),
    findLocationByName: jest.fn(),
    findItemBySku: jest.fn(),
    createCategory: jest.fn(),
    createLocation: jest.fn(),
    sequelize: {
      transaction: jest.fn((fn: (t: unknown) => Promise<unknown>) => fn({})),
    },
  } as unknown as InventoryRepository;

  const transactionService = {} as InventoryTransactionService;
  const service = new InventoryImportService(repository, transactionService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('buildImportReview classifies new categories, locations, and items', async () => {
    (repository.findCategoryByName as jest.Mock).mockResolvedValue(null);
    (repository.findLocationByName as jest.Mock).mockResolvedValue(null);
    (repository.findItemBySku as jest.Mock).mockResolvedValue(null);

    const review = await service.buildImportReview(1, [
      row({
        line: 2,
        sku: 'SKU1',
        name: 'Cement Bag',
        category: 'Building Materials',
        location: 'Main Warehouse',
      }),
    ]);

    expect(review.newCategories).toEqual(['Building Materials']);
    expect(review.newLocations).toEqual(['Main Warehouse']);
    expect(review.newItems).toEqual([{ sku: 'SKU1', name: 'Cement Bag' }]);
  });

  it('buildImportReview detects existing master data', async () => {
    (repository.findCategoryByName as jest.Mock).mockResolvedValue({ id: 1 });
    (repository.findLocationByName as jest.Mock).mockResolvedValue({ id: 2 });
    (repository.findItemBySku as jest.Mock).mockResolvedValue({ id: 3 });

    const review = await service.buildImportReview(1, [
      row({
        line: 2,
        sku: 'SKU1',
        name: 'Cement Bag',
        category: 'Building Materials',
        location: 'Main Warehouse',
      }),
    ]);

    expect(review.existingCategories).toEqual(['Building Materials']);
    expect(review.existingLocations).toEqual(['Main Warehouse']);
    expect(review.existingItems).toEqual([{ sku: 'SKU1', name: 'Cement Bag' }]);
    expect(review.newItems).toEqual([]);
  });

  it('ensureMasterData creates only missing categories and locations', async () => {
    (repository.findCategoryByName as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 9 });
    (repository.findLocationByName as jest.Mock).mockResolvedValue(null);
    (repository.createCategory as jest.Mock).mockResolvedValue({ id: 1 });
    (repository.createLocation as jest.Mock).mockResolvedValue({ id: 2 });

    const result = await service.ensureMasterData(
      1,
      ['Building Materials', 'Apparel'],
      ['Main Warehouse'],
    );

    expect(result.categoriesCreated).toBe(1);
    expect(result.locationsCreated).toBe(1);
    expect(repository.createCategory).toHaveBeenCalledTimes(1);
    expect(repository.createLocation).toHaveBeenCalledTimes(1);
  });
});
