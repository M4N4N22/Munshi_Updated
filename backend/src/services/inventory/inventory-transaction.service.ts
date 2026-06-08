import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { Transaction } from 'sequelize';
import { DomainEventsService } from 'src/services/domain-events/domain-events.service';
import { DOMAIN_EVENT_TYPE } from 'src/services/domain-events/domain-events.constants';
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
import {
  buildInventoryLowStockEventPayload,
  didCrossLowStockThreshold,
} from './inventory.low-stock.helper';

const LOW_STOCK_AGGREGATE_TYPE = 'inventory_item';

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
  private readonly logger = new Logger(InventoryTransactionService.name);

  constructor(
    private readonly repository: InventoryRepository,
    @Optional()
    @Inject(forwardRef(() => DomainEventsService))
    private readonly domainEventsService?: DomainEventsService,
  ) {}

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

      this.scheduleLowStockAlertIfNeeded(transaction, {
        factoryId: params.factory_id,
        inventoryItemId: item.id,
        sku: String(item.sku ?? ''),
        itemName: String(item.name ?? ''),
        transactionType: params.transactionType,
        previousQuantity: current,
        nextQuantity: next,
        reorderThreshold: item.reorder_threshold ?? null,
        referenceType: params.reference_type ?? null,
        referenceId: params.reference_id ?? null,
      });

      return this.toTransactionRecord(row);
    };

    if (parentTransaction) {
      return run(parentTransaction);
    }

    return this.repository.sequelize.transaction(run);
  }

  /**
   * Publishes inventory.low_stock after commit when STOCK_OUT crosses reorder threshold.
   * Alerting only — does not alter inventory math.
   */
  private scheduleLowStockAlertIfNeeded(
    transaction: Transaction,
    ctx: {
      factoryId: number;
      inventoryItemId: number;
      sku: string;
      itemName: string;
      transactionType: string;
      previousQuantity: number;
      nextQuantity: number;
      reorderThreshold: string | null;
      referenceType: string | null;
      referenceId: number | null;
    },
  ): void {
    if (!this.domainEventsService) {
      return;
    }
    if (
      !didCrossLowStockThreshold({
        transactionType: ctx.transactionType,
        previousQuantity: ctx.previousQuantity,
        nextQuantity: ctx.nextQuantity,
        reorderThreshold: ctx.reorderThreshold,
      })
    ) {
      return;
    }
    if (ctx.reorderThreshold == null || ctx.reorderThreshold === '') {
      return;
    }

    const payload = buildInventoryLowStockEventPayload({
      factoryId: ctx.factoryId,
      inventoryItemId: ctx.inventoryItemId,
      sku: ctx.sku,
      itemName: ctx.itemName,
      currentQuantity: ctx.nextQuantity,
      previousQuantity: ctx.previousQuantity,
      reorderThreshold: ctx.reorderThreshold,
      referenceType: ctx.referenceType,
      referenceId: ctx.referenceId,
    });

    transaction.afterCommit(async () => {
      try {
        const event = await this.domainEventsService!.publish({
          factory_id: ctx.factoryId,
          event_type: DOMAIN_EVENT_TYPE.INVENTORY_LOW_STOCK,
          aggregate_type: LOW_STOCK_AGGREGATE_TYPE,
          aggregate_id: String(ctx.inventoryItemId),
          payload,
        });
        await this.domainEventsService!.processEventById(event.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Failed to publish inventory.low_stock for item #${ctx.inventoryItemId}: ${message}`,
        );
      }
    });
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
