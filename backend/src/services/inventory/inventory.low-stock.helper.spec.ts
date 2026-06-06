import {
  didCrossLowStockThreshold,
  isItemLowStock,
} from './inventory.low-stock.helper';
import { INVENTORY_TRANSACTION_TYPE } from './inventory.constants';

describe('inventory.low-stock.helper', () => {
  describe('isItemLowStock', () => {
    it('returns false when no threshold', () => {
      expect(isItemLowStock(5, null)).toBe(false);
      expect(isItemLowStock(5, '')).toBe(false);
    });

    it('returns true when below threshold', () => {
      expect(isItemLowStock(8, '10')).toBe(true);
    });

    it('returns false when at or above threshold', () => {
      expect(isItemLowStock(10, '10')).toBe(false);
      expect(isItemLowStock(12, '10')).toBe(false);
    });
  });

  describe('didCrossLowStockThreshold', () => {
    it('detects threshold cross on STOCK_OUT', () => {
      expect(
        didCrossLowStockThreshold({
          transactionType: INVENTORY_TRANSACTION_TYPE.STOCK_OUT,
          previousQuantity: 10,
          nextQuantity: 8,
          reorderThreshold: '10',
        }),
      ).toBe(true);
    });

    it('returns false when already low', () => {
      expect(
        didCrossLowStockThreshold({
          transactionType: INVENTORY_TRANSACTION_TYPE.STOCK_OUT,
          previousQuantity: 8,
          nextQuantity: 5,
          reorderThreshold: '10',
        }),
      ).toBe(false);
    });

    it('returns false for STOCK_IN', () => {
      expect(
        didCrossLowStockThreshold({
          transactionType: INVENTORY_TRANSACTION_TYPE.STOCK_IN,
          previousQuantity: 5,
          nextQuantity: 15,
          reorderThreshold: '10',
        }),
      ).toBe(false);
    });

    it('returns false for ADJUSTMENT', () => {
      expect(
        didCrossLowStockThreshold({
          transactionType: INVENTORY_TRANSACTION_TYPE.ADJUSTMENT,
          previousQuantity: 10,
          nextQuantity: 8,
          reorderThreshold: '10',
        }),
      ).toBe(false);
    });
  });
});
