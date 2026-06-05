/**
 * Phase 1.2 — inventory CSV import processing integration tests.
 */
import {
  createTestApp,
  seedPhase0Fixture,
} from './helpers/phase0-fixtures';
import { migrationStatusJson, probePostgres, runMigrations } from './helpers/db-env';
import { InventoryImportService } from 'src/services/inventory/inventory-import.service';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { InventoryTransactionService } from 'src/services/inventory/inventory-transaction.service';
import { DbService } from 'src/core/services/db-service/db.service';
import { INVENTORY_REFERENCE_TYPE } from 'src/services/inventory/inventory.constants';
import type { InventoryCsvRow } from 'src/modules/whatsapp/inventory-csv.parse';
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';

function requireDb(dbUp: boolean): void {
  if (!dbUp) {
    throw new Error('NOT VERIFIED: Postgres unavailable');
  }
}

function row(partial: Partial<InventoryCsvRow> & Pick<InventoryCsvRow, 'line' | 'sku'>): InventoryCsvRow {
  return {
    name: partial.name ?? partial.sku,
    category: partial.category ?? 'Cat-Default',
    location: partial.location ?? 'Loc-Default',
    unit: partial.unit ?? 'pcs',
    quantity: partial.quantity ?? '0.0000',
    reorder_threshold: partial.reorder_threshold ?? null,
    ...partial,
  };
}

describe('Phase 1.2 inventory CSV import processing', () => {
  let dbUp = false;
  let app: INestApplication;
  let importService: InventoryImportService;
  let inventoryService: InventoryService;
  let inventoryTransactionService: InventoryTransactionService;
  let dbService: DbService;

  beforeAll(async () => {
    dbUp = await probePostgres();
    if (!dbUp) return;
    runMigrations();
    const status = migrationStatusJson();
    if (status.pending_count > 0) {
      throw new Error(`Migrations pending (${status.pending_count})`);
    }
    const ctx = await createTestApp();
    app = ctx.app;
    importService = ctx.module.get(InventoryImportService);
    inventoryService = ctx.inventoryService;
    inventoryTransactionService = ctx.inventoryTransactionService;
    dbService = ctx.dbService;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  async function seedFx(tag: string) {
    const fx = await seedPhase0Fixture(
      dbService,
      inventoryService,
      inventoryTransactionService,
      tag,
    );
    const cat = await dbService.sqlService.InventoryCategory.findByPk(fx.categoryId);
    const loc = await dbService.sqlService.InventoryLocation.findByPk(fx.locationId);
    return {
      ...fx,
      categoryName: cat!.name,
      locationName: loc!.name,
    };
  }

  async function countCsvRefs(factoryId: number, batchId: number, itemId?: number) {
    return dbService.sqlService.InventoryTransaction.count({
      where: {
        factory_id: factoryId,
        reference_type: INVENTORY_REFERENCE_TYPE.CSV_IMPORT,
        reference_id: batchId,
        ...(itemId != null ? { inventory_item_id: itemId } : {}),
      },
    });
  }

  describe('Scenario 1 — new SKU with quantity', () => {
    it('creates item and STOCK_IN ledger row', async () => {
      requireDb(dbUp);
      const fx = await seedFx('imp1');
      const batchId = 1001;
      const sku = `NEW_${randomUUID().slice(0, 8)}`;

      const summary = await importService.processImport(
        fx.factoryId,
        fx.ownerId,
        [
          row({
            line: 2,
            sku,
            name: 'New Cement',
            category: fx.categoryName,
            location: fx.locationName,
            unit: 'bag',
            quantity: '10.0000',
          }),
        ],
        batchId,
      );

      expect(summary.addedCount).toBe(1);
      expect(summary.failedCount).toBe(0);

      const item = await inventoryService.findItemBySku(fx.factoryId, sku);
      expect(Number(item.current_quantity)).toBe(10);
      expect(await countCsvRefs(fx.factoryId, batchId, item.id)).toBe(1);
    });
  });

  describe('Scenario 2 — existing SKU update + stock in', () => {
    it('updates metadata and adds STOCK_IN', async () => {
      requireDb(dbUp);
      const fx = await seedFx('imp2');
      const sku = `UPD_${randomUUID().slice(0, 8)}`;
      const batchId = 1002;

      await importService.processImport(
        fx.factoryId,
        fx.ownerId,
        [
          row({
            line: 2,
            sku,
            name: 'Original Name',
            category: fx.categoryName,
            location: fx.locationName,
            quantity: '5.0000',
          }),
        ],
        batchId,
      );

      const summary = await importService.processImport(
        fx.factoryId,
        fx.ownerId,
        [
          row({
            line: 3,
            sku,
            name: 'Updated Name',
            category: fx.categoryName,
            location: fx.locationName,
            quantity: '3.0000',
          }),
        ],
        batchId + 1,
      );

      expect(summary.updatedCount).toBe(1);
      const item = await inventoryService.findItemBySku(fx.factoryId, sku);
      expect(item.name).toBe('Updated Name');
      expect(Number(item.current_quantity)).toBe(8);
      expect(await countCsvRefs(fx.factoryId, batchId + 1, item.id)).toBe(1);
    });
  });

  describe('Scenario 3 — quantity zero', () => {
    it('updates metadata without STOCK_IN', async () => {
      requireDb(dbUp);
      const fx = await seedFx('imp3');
      const sku = `ZERO_${randomUUID().slice(0, 8)}`;
      const batchId = 1003;

      await importService.processImport(
        fx.factoryId,
        fx.ownerId,
        [
          row({
            line: 2,
            sku,
            name: 'Seed Item',
            category: fx.categoryName,
            location: fx.locationName,
            quantity: '4.0000',
          }),
        ],
        batchId,
      );

      const itemBefore = await inventoryService.findItemBySku(fx.factoryId, sku);
      const qtyBefore = Number(itemBefore.current_quantity);

      const summary = await importService.processImport(
        fx.factoryId,
        fx.ownerId,
        [
          row({
            line: 3,
            sku,
            name: 'Renamed Only',
            category: fx.categoryName,
            location: fx.locationName,
            quantity: '0.0000',
          }),
        ],
        batchId + 1,
      );

      expect(summary.updatedCount).toBe(1);
      const item = await inventoryService.findItemBySku(fx.factoryId, sku);
      expect(item.name).toBe('Renamed Only');
      expect(Number(item.current_quantity)).toBe(qtyBefore);
      expect(await countCsvRefs(fx.factoryId, batchId + 1, item.id)).toBe(0);
    });
  });

  describe('Scenario 4 — category missing', () => {
    it('fails row without affecting other rows', async () => {
      requireDb(dbUp);
      const fx = await seedFx('imp4');
      const batchId = 1004;
      const skuOk = `OK_${randomUUID().slice(0, 8)}`;

      const summary = await importService.processImport(
        fx.factoryId,
        fx.ownerId,
        [
          row({
            line: 2,
            sku: skuOk,
            category: fx.categoryName,
            location: fx.locationName,
            quantity: '2.0000',
          }),
          row({
            line: 3,
            sku: `BAD_${randomUUID().slice(0, 8)}`,
            category: 'Nonexistent Category XYZ',
            location: fx.locationName,
            quantity: '1.0000',
          }),
        ],
        batchId,
      );

      expect(summary.addedCount).toBe(1);
      expect(summary.failedCount).toBe(1);
      expect(summary.rowResults[1].status).toBe('failed');
      expect(summary.rowResults[1].detail).toContain('Category');
      await inventoryService.findItemBySku(fx.factoryId, skuOk);
    });
  });

  describe('Scenario 5 — location missing', () => {
    it('fails row without affecting other rows', async () => {
      requireDb(dbUp);
      const fx = await seedFx('imp5');
      const batchId = 1005;
      const skuOk = `OK2_${randomUUID().slice(0, 8)}`;

      const summary = await importService.processImport(
        fx.factoryId,
        fx.ownerId,
        [
          row({
            line: 2,
            sku: skuOk,
            category: fx.categoryName,
            location: fx.locationName,
            quantity: '1.0000',
          }),
          row({
            line: 3,
            sku: `BADLOC_${randomUUID().slice(0, 8)}`,
            category: fx.categoryName,
            location: 'Nonexistent Location XYZ',
            quantity: '1.0000',
          }),
        ],
        batchId,
      );

      expect(summary.addedCount).toBe(1);
      expect(summary.failedCount).toBe(1);
      expect(summary.rowResults[1].detail).toContain('Location');
    });
  });

  describe('Scenario 6 — mixed success file', () => {
    it('returns partial success counts', async () => {
      requireDb(dbUp);
      const fx = await seedFx('imp6');
      const batchId = 1006;

      const summary = await importService.processImport(
        fx.factoryId,
        fx.ownerId,
        [
          row({
            line: 2,
            sku: `MIX_A_${randomUUID().slice(0, 6)}`,
            category: fx.categoryName,
            location: fx.locationName,
            quantity: '1.0000',
          }),
          row({
            line: 3,
            sku: `MIX_B_${randomUUID().slice(0, 6)}`,
            category: 'Missing Cat',
            location: fx.locationName,
            quantity: '1.0000',
          }),
          row({
            line: 4,
            sku: `MIX_C_${randomUUID().slice(0, 6)}`,
            category: fx.categoryName,
            location: fx.locationName,
            quantity: '2.0000',
          }),
        ],
        batchId,
      );

      expect(summary.addedCount).toBe(2);
      expect(summary.failedCount).toBe(1);
      expect(summary.rowResults).toHaveLength(3);
    });
  });

  describe('Scenario 7 — re-import adds ledger never overwrites qty', () => {
    it('creates second CSV_IMPORT STOCK_IN on re-import', async () => {
      requireDb(dbUp);
      const fx = await seedFx('imp7');
      const sku = `REIM_${randomUUID().slice(0, 8)}`;
      const batchId = 1007;

      await importService.processImport(
        fx.factoryId,
        fx.ownerId,
        [
          row({
            line: 2,
            sku,
            category: fx.categoryName,
            location: fx.locationName,
            quantity: '10.0000',
          }),
        ],
        batchId,
      );

      const item = await inventoryService.findItemBySku(fx.factoryId, sku);
      expect(Number(item.current_quantity)).toBe(10);

      await importService.processImport(
        fx.factoryId,
        fx.ownerId,
        [
          row({
            line: 3,
            sku,
            category: fx.categoryName,
            location: fx.locationName,
            quantity: '5.0000',
          }),
        ],
        batchId + 1,
      );

      const reloaded = await inventoryService.findItemBySku(fx.factoryId, sku);
      expect(Number(reloaded.current_quantity)).toBe(15);
      expect(await countCsvRefs(fx.factoryId, batchId, item.id)).toBe(1);
      expect(await countCsvRefs(fx.factoryId, batchId + 1, item.id)).toBe(1);
    });
  });
});
