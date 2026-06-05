import { Injectable } from '@nestjs/common';
import type { InventoryCsvRow } from 'src/modules/whatsapp/inventory-csv.parse';
import { INVENTORY_REFERENCE_TYPE } from './inventory.constants';
import { InventoryRepository } from './inventory.repository';
import { InventoryTransactionService } from './inventory-transaction.service';
import {
  assertFactoryId,
  formatQuantity,
  normalizeInventoryName,
  normalizeSku,
  normalizeUnit,
} from './inventory.validation';
import { Transaction } from 'sequelize';

export type InventoryImportRowStatus = 'added' | 'updated' | 'skipped' | 'failed';

export type InventoryImportRowResult = {
  line: number;
  sku: string;
  status: InventoryImportRowStatus;
  detail: string;
};

export type InventoryImportSummary = {
  addedCount: number;
  updatedCount: number;
  failedCount: number;
  skippedCount: number;
  rowResults: InventoryImportRowResult[];
};

@Injectable()
export class InventoryImportService {
  constructor(
    private readonly repository: InventoryRepository,
    private readonly transactionService: InventoryTransactionService,
  ) {}

  async processImport(
    factoryId: number,
    userId: number,
    rows: InventoryCsvRow[],
    batchId: number,
  ): Promise<InventoryImportSummary> {
    assertFactoryId(factoryId);
    if (!Number.isFinite(batchId) || batchId <= 0) {
      throw new Error('Valid batchId is required');
    }

    const factory = await this.repository.findFactoryById(factoryId);
    if (!factory) {
      throw new Error(`Factory #${factoryId} not found`);
    }

    const rowResults: InventoryImportRowResult[] = [];

    for (const row of rows) {
      rowResults.push(
        await this.processRow(factoryId, userId, row, batchId),
      );
    }

    return this.buildSummary(rowResults);
  }

  private async processRow(
    factoryId: number,
    userId: number,
    row: InventoryCsvRow,
    batchId: number,
  ): Promise<InventoryImportRowResult> {
    let sku: string;
    try {
      sku = normalizeSku(row.sku);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        line: row.line,
        sku: row.sku,
        status: 'failed',
        detail: msg.slice(0, 200),
      };
    }

    const base = { line: row.line, sku };
    const name = normalizeInventoryName(row.name, 'Item name');
    const unit = normalizeUnit(row.unit);

    try {
      return await this.repository.sequelize.transaction(async (transaction) => {
        const category = await this.repository.findCategoryByName(
          factoryId,
          row.category,
        );
        if (!category) {
          return {
            ...base,
            status: 'failed',
            detail: `Category "${row.category}" nahi mila`,
          };
        }

        const location = await this.repository.findLocationByName(
          factoryId,
          row.location,
        );
        if (!location) {
          return {
            ...base,
            status: 'failed',
            detail: `Location "${row.location}" nahi mila`,
          };
        }

        const qty = Number(row.quantity);
        const hasStockIn = Number.isFinite(qty) && qty > 0;

        const existing = await this.repository.findItemBySku(factoryId, sku);

        if (!existing) {
          const created = await this.repository.createItem(
            {
              factory_id: factoryId,
              category_id: category.id,
              location_id: location.id,
              sku,
              name,
              unit,
              current_quantity: formatQuantity(0),
              reorder_threshold: row.reorder_threshold,
              is_active: true,
            },
            transaction,
          );

          if (hasStockIn) {
            await this.recordCsvStockIn(
              factoryId,
              created.id,
              row.quantity,
              userId,
              batchId,
              transaction,
            );
          }

          return {
            ...base,
            status: 'added',
            detail: hasStockIn ? 'item create + stock in' : 'item create (qty 0)',
          };
        }

        const patch = {
          name,
          category_id: category.id,
          location_id: location.id,
          unit,
          reorder_threshold: row.reorder_threshold,
        };

        const unchanged =
          !hasStockIn &&
          existing.name === name &&
          existing.category_id === category.id &&
          existing.location_id === location.id &&
          existing.unit === unit &&
          String(existing.reorder_threshold ?? '') ===
            String(row.reorder_threshold ?? '');

        if (unchanged) {
          return {
            ...base,
            status: 'skipped',
            detail: 'koi change nahi',
          };
        }

        await this.repository.itemModel.update(patch as any, {
          where: { id: existing.id, factory_id: factoryId },
          transaction,
        });

        if (hasStockIn) {
          await this.recordCsvStockIn(
            factoryId,
            existing.id,
            row.quantity,
            userId,
            batchId,
            transaction,
          );
        }

        return {
          ...base,
          status: 'updated',
          detail: hasStockIn ? 'metadata update + stock in' : 'metadata update (qty 0)',
        };
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ...base,
        status: 'failed',
        detail: msg.slice(0, 200),
      };
    }
  }

  private async recordCsvStockIn(
    factoryId: number,
    inventoryItemId: number,
    quantity: string,
    userId: number,
    batchId: number,
    transaction: Transaction,
  ) {
    await this.transactionService.recordStockIn(
      {
        factory_id: factoryId,
        inventory_item_id: inventoryItemId,
        quantity,
        reference_type: INVENTORY_REFERENCE_TYPE.CSV_IMPORT,
        reference_id: batchId,
        created_by: userId,
        notes: 'Inventory CSV import',
      },
      transaction,
    );
  }

  private buildSummary(
    rowResults: InventoryImportRowResult[],
  ): InventoryImportSummary {
    let addedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const r of rowResults) {
      switch (r.status) {
        case 'added':
          addedCount++;
          break;
        case 'updated':
          updatedCount++;
          break;
        case 'failed':
          failedCount++;
          break;
        case 'skipped':
          skippedCount++;
          break;
      }
    }

    return {
      addedCount,
      updatedCount,
      failedCount,
      skippedCount,
      rowResults,
    };
  }
}
