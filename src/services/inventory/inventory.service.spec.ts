import { ConflictException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { InventoryTransactionService } from './inventory-transaction.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let repository: jest.Mocked<InventoryRepository>;
  let transactionService: jest.Mocked<InventoryTransactionService>;

  beforeEach(() => {
    repository = {
      findFactoryById: jest.fn().mockResolvedValue({ id: 1 }),
      findCategoryById: jest.fn().mockResolvedValue({ id: 2, is_active: true }),
      findLocationById: jest.fn().mockResolvedValue({ id: 3, is_active: true }),
      findCategoryByName: jest.fn().mockResolvedValue(null),
      listCategories: jest.fn(),
      findItemBySku: jest.fn().mockResolvedValue(null),
      createItem: jest.fn().mockResolvedValue({
        id: 10,
        factory_id: 1,
        category_id: 2,
        location_id: 3,
        sku: 'CEM001',
        name: 'Cement',
        unit: 'bags',
        current_quantity: '0.0000',
        reorder_threshold: '50.0000',
        is_active: true,
        category: { id: 2, name: 'Raw Material' },
        location: { id: 3, name: 'Warehouse A' },
      }),
      findItemById: jest.fn(),
      listItems: jest.fn(),
    } as unknown as jest.Mocked<InventoryRepository>;

    transactionService = {} as jest.Mocked<InventoryTransactionService>;

    service = new InventoryService(repository, transactionService);
  });

  it('creates item with required category and location', async () => {
    const item = await service.createItem({
      factory_id: 1,
      category_id: 2,
      location_id: 3,
      sku: 'cem001',
      name: 'Cement',
      unit: 'bags',
      reorder_threshold: '50',
    });

    expect(item.sku).toBe('CEM001');
    expect(repository.createItem).toHaveBeenCalledWith(
      expect.objectContaining({
        current_quantity: '0.0000',
        sku: 'CEM001',
      }),
    );
  });

  it('throws ConflictException on duplicate SKU', async () => {
    repository.findItemBySku.mockResolvedValue({ id: 99 } as any);

    await expect(
      service.createItem({
        factory_id: 1,
        category_id: 2,
        location_id: 3,
        sku: 'CEM001',
        name: 'Cement',
        unit: 'bags',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('detects low stock', () => {
    expect(
      service.isLowStock({
        current_quantity: '5.0000',
        reorder_threshold: '10.0000',
      }),
    ).toBe(true);
    expect(
      service.isLowStock({
        current_quantity: '15.0000',
        reorder_threshold: '10.0000',
      }),
    ).toBe(false);
  });

  it('builds inventory status', async () => {
    repository.findItemById.mockResolvedValue({
      id: 10,
      factory_id: 1,
      category_id: 2,
      location_id: 3,
      sku: 'CEM001',
      name: 'Cement',
      unit: 'bags',
      current_quantity: '5.0000',
      reorder_threshold: '50.0000',
      is_active: true,
      category: { id: 2, name: 'Raw Material' },
      location: { id: 3, name: 'Warehouse A' },
    } as any);

    const status = await service.getInventoryStatus(10, 1);
    expect(status.is_low_stock).toBe(true);
    expect(status.location_name).toBe('Warehouse A');
  });

  it('throws when category missing', async () => {
    repository.findCategoryById.mockResolvedValue(null);

    await expect(
      service.createItem({
        factory_id: 1,
        category_id: 99,
        location_id: 3,
        sku: 'X1',
        name: 'Item',
        unit: 'pcs',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
