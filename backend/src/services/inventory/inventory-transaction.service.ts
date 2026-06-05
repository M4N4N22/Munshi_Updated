import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transaction } from 'sequelize';
import { INVENTORY_TRANSACTION_TYPE } from './inventory.constants';
import {
  IInventoryItemRecord,
  IInventoryTransactionRecord,
} from './inventory.interfaces';
import { InventoryRepository } from './inventory.repository';
import {
  formatQuantity,
  parsePositiveQuantity,
  parseSignedQuantity,
  roundQuantity,
} from './inventory.validation';

export interface RecordStockMovementInput {
  factory_id: number;
  inventory_item_id: number;
  quantity: string | number;
  notes?: string | null;
  reference_type?: string | null;
  reference_id?: number | null;
  created_by?: number | null;
}

@Injectable()
export class InventoryTransactionService {
  constructor(private readonly repository: InventoryRepository) {}

  async recordStockIn(
    input: RecordStockMovementInput,
    transaction?: Transaction,
  ): Promise<IInventoryTransactionRecord> {
    const qty = parsePositiveQuantity(input.quantity, 'Stock in quantity');
    return this.applyMovement(
      {
        ...input,
        transactionType: INVENTORY_TRANSACTION_TYPE.STOCK_IN,
        delta: qty,
        storedQuantity: qty,
      },
      transaction,
    );
  }

  async recordStockOut(
    input: RecordStockMovementInput,
    transaction?: Transaction,
  ): Promise<IInventoryTransactionRecord> {
    const qty = parsePositiveQuantity(input.quantity, 'Stock out quantity');
    return this.applyMovement(
      {
        ...input,
        transactionType: INVENTORY_TRANSACTION_TYPE.STOCK_OUT,
        delta: -qty,
        storedQuantity: qty,
      },
      transaction,
    );
  }

  async recordAdjustment(
    input: RecordStockMovementInput,
    transaction?: Transaction,
  ): Promise<IInventoryTransactionRecord> {
    const delta = parseSignedQuantity(input.quantity, 'Adjustment quantity');
    return this.applyMovement(
      {
        ...input,
        transactionType: INVENTORY_TRANSACTION_TYPE.ADJUSTMENT,
        delta,
        storedQuantity: Math.abs(delta),
      },
      transaction,
    );
  }

  /** Sum signed quantities from transaction ledger (audit verification). */
  async calculateQuantityFromTransactions(
    itemId: number,
    factoryId: number,
  ): Promise<number> {
    const rows = await this.repository.sumTransactionQuantities(
      itemId,
      factoryId,
    );
    let total = 0;
    for (const row of rows as { transaction_type: string; quantity: string }[]) {
      const qty = Number(row.quantity);
      switch (row.transaction_type) {
        case INVENTORY_TRANSACTION_TYPE.STOCK_IN:
          total += qty;
          break;
        case INVENTORY_TRANSACTION_TYPE.STOCK_OUT:
          total -= qty;
          break;
        case INVENTORY_TRANSACTION_TYPE.ADJUSTMENT:
          total += qty;
          break;
        default:
          break;
      }
    }
    return roundQuantity(total);
  }

  private async applyMovement(
    params: {
      factory_id: number;
      inventory_item_id: number;
      transactionType: string;
      delta: number;
      storedQuantity: number;
      notes?: string | null;
      reference_type?: string | null;
      reference_id?: number | null;
      created_by?: number | null;
    },
    parentTransaction?: Transaction,
  ): Promise<IInventoryTransactionRecord> {
    const run = async (transaction: Transaction) => {
      const item = await this.repository.findItemById(
        params.inventory_item_id,
        params.factory_id,
        transaction,
      );
      if (!item) {
        throw new NotFoundException(
          `Inventory item #${params.inventory_item_id} not found in factory #${params.factory_id}`,
        );
      }
      if (!item.is_active) {
        throw new BadRequestException('Cannot transact on inactive inventory item');
      }

      const current = Number(item.current_quantity ?? 0);
      const next = roundQuantity(current + params.delta);
      if (next < 0) {
        throw new BadRequestException(
          `Insufficient stock. Current: ${formatQuantity(current)}, requested change: ${formatQuantity(params.delta)}`,
        );
      }

      const row = await this.repository.createTransaction(
        {
          factory_id: params.factory_id,
          inventory_item_id: params.inventory_item_id,
          transaction_type: params.transactionType,
          quantity:
            params.transactionType === INVENTORY_TRANSACTION_TYPE.ADJUSTMENT
              ? formatQuantity(params.delta)
              : formatQuantity(params.storedQuantity),
          notes: params.notes ?? null,
          reference_type: params.reference_type ?? null,
          reference_id: params.reference_id ?? null,
          created_by: params.created_by ?? null,
        },
        transaction,
      );

      await this.repository.updateItemQuantity(
        item.id,
        params.factory_id,
        formatQuantity(next),
        transaction,
      );

      return this.toTransactionRecord(row);
    };

    if (parentTransaction) {
      return run(parentTransaction);
    }

    return this.repository.sequelize.transaction(run);
  }

  private toTransactionRecord(row: any): IInventoryTransactionRecord {
    return {
      id: row.id,
      factory_id: row.factory_id,
      inventory_item_id: row.inventory_item_id,
      transaction_type: row.transaction_type,
      quantity: String(row.quantity),
      reference_type: row.reference_type ?? null,
      reference_id: row.reference_id ?? null,
      notes: row.notes ?? null,
      created_by: row.created_by ?? null,
      created_at: row.created_at,
    };
  }
}
