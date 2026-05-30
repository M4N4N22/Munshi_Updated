import { BadRequestException } from '@nestjs/common';
import { InventoryTransactionService } from './inventory-transaction.service';
import { InventoryRepository } from './inventory.repository';
import { INVENTORY_TRANSACTION_TYPE } from './inventory.constants';

describe('InventoryTransactionService', () => {
  let service: InventoryTransactionService;
  let repository: jest.Mocked<InventoryRepository>;

  const mockTransaction = jest.fn(async (fn: (t: unknown) => Promise<unknown>) =>
    fn({}),
  );

  beforeEach(() => {
    repository = {
      sequelize: { transaction: mockTransaction },
      findItemById: jest.fn().mockResolvedValue({
        id: 1,
        factory_id: 1,
        current_quantity: '10.0000',
        is_active: true,
      }),
      createTransaction: jest.fn().mockResolvedValue({
        id: 100,
        factory_id: 1,
        inventory_item_id: 1,
        transaction_type: INVENTORY_TRANSACTION_TYPE.STOCK_IN,
        quantity: '5.0000',
      }),
      updateItemQuantity: jest.fn(),
      sumTransactionQuantities: jest.fn(),
    } as unknown as jest.Mocked<InventoryRepository>;

    service = new InventoryTransactionService(repository);
  });

  it('records stock in and updates quantity', async () => {
    const result = await service.recordStockIn({
      factory_id: 1,
      inventory_item_id: 1,
      quantity: '5',
    });

    expect(result.transaction_type).toBe(INVENTORY_TRANSACTION_TYPE.STOCK_IN);
    expect(repository.updateItemQuantity).toHaveBeenCalledWith(
      1,
      1,
      '15.0000',
      expect.anything(),
    );
  });

  it('records stock out', async () => {
    await service.recordStockOut({
      factory_id: 1,
      inventory_item_id: 1,
      quantity: '3',
    });

    expect(repository.updateItemQuantity).toHaveBeenCalledWith(
      1,
      1,
      '7.0000',
      expect.anything(),
    );
  });

  it('rejects stock out below zero', async () => {
    await expect(
      service.recordStockOut({
        factory_id: 1,
        inventory_item_id: 1,
        quantity: '20',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('calculates quantity from transaction ledger', async () => {
    repository.sumTransactionQuantities.mockResolvedValue([
      { transaction_type: INVENTORY_TRANSACTION_TYPE.STOCK_IN, quantity: '10.0000' },
      { transaction_type: INVENTORY_TRANSACTION_TYPE.STOCK_OUT, quantity: '3.0000' },
      { transaction_type: INVENTORY_TRANSACTION_TYPE.ADJUSTMENT, quantity: '-1.0000' },
    ] as any);

    const total = await service.calculateQuantityFromTransactions(1, 1);
    expect(total).toBe(6);
  });
});
