/**
 * Inventory CSV import review + confirmation integration tests.
 */
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  createTestApp,
  seedPhase0Fixture,
} from './helpers/phase0-fixtures';
import { migrationStatusJson, probePostgres, runMigrations } from './helpers/db-env';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { InventoryTransactionService } from 'src/services/inventory/inventory-transaction.service';
import { InventoryImportService } from 'src/services/inventory/inventory-import.service';
import { InventoryImportUploadService } from 'src/services/inventory/inventory-import-upload.service';
import { DbService } from 'src/core/services/db-service/db.service';
import { parseInventoryCsvText } from 'src/modules/whatsapp/inventory-csv.parse';

function requireDb(dbUp: boolean): void {
  if (!dbUp) {
    throw new Error('NOT VERIFIED: Postgres unavailable');
  }
}

function buildTemplateCsv(): { csv: string; skus: string[] } {
  const sku1 = `NEW_${randomUUID().slice(0, 8).toUpperCase()}`;
  const sku2 = `SHIRT_${randomUUID().slice(0, 4).toUpperCase()}`;
  const csv = [
    'sku,name,category,location,unit,quantity,reorder_threshold',
    `${sku1},Cement 50kg Bag,Building Materials,Main Warehouse,bag,100,10`,
    `${sku2},Medium Cotton Shirt,Apparel,Store Front,pcs,25,5`,
  ].join('\n');
  return { csv, skus: [sku1, sku2] };
}

describe('Inventory import review + provisioning', () => {
  let dbUp = false;
  let app: INestApplication;
  let inventoryService: InventoryService;
  let inventoryTransactionService: InventoryTransactionService;
  let importService: InventoryImportService;
  let uploadService: InventoryImportUploadService;
  let dbService: DbService;

  beforeAll(async () => {
    dbUp = await probePostgres();
    if (!dbUp) return;
    runMigrations();
    const status = migrationStatusJson();
    if (status.pending_count > 0) {
      throw new Error(`Migrations pending (${status.pending_count})`);
    }
    const ctx = await createTestApp({ validationPipe: true });
    app = ctx.app;
    inventoryService = ctx.inventoryService;
    inventoryTransactionService = ctx.inventoryTransactionService;
    dbService = ctx.dbService;
    importService = app.get(InventoryImportService);
    uploadService = app.get(InventoryImportUploadService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('Case 1 — fresh factory: review + provision + import succeeds', async () => {
    requireDb(dbUp);
    const fx = await seedPhase0Fixture(
      dbService,
      inventoryService,
      inventoryTransactionService,
      'review-fresh',
    );

    const { csv, skus } = buildTemplateCsv();
    const parsed = parseInventoryCsvText(csv);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const review = await importService.buildImportReview(fx.factoryId, parsed.rows);
    expect(review.newCategories).toEqual(
      expect.arrayContaining(['Apparel', 'Building Materials']),
    );
    expect(review.newLocations).toEqual(
      expect.arrayContaining(['Main Warehouse', 'Store Front']),
    );
    expect(review.newItems).toHaveLength(2);

    const summary = await uploadService.processImportWithProvisioning(
      {
        factory_id: fx.factoryId,
        created_by: fx.ownerId,
        batch_id: 9001,
      },
      parsed.rows,
      review,
    );

    expect(summary.failedCount).toBe(0);
    expect(summary.addedCount).toBe(2);
    expect(summary.categoriesCreatedCount).toBe(2);
    expect(summary.locationsCreatedCount).toBe(2);

    for (const sku of skus) {
      const item = await inventoryService.findItemBySku(fx.factoryId, sku);
      expect(item).toBeTruthy();
    }
  });

  it('Case 2 — existing category: review shows mixed master data', async () => {
    requireDb(dbUp);
    const fx = await seedPhase0Fixture(
      dbService,
      inventoryService,
      inventoryTransactionService,
      'review-mixed',
    );

    await inventoryService.createCategory({
      factory_id: fx.factoryId,
      name: 'Building Materials',
    });

    const { csv } = buildTemplateCsv();
    const parsed = parseInventoryCsvText(csv);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const review = await importService.buildImportReview(fx.factoryId, parsed.rows);
    expect(review.existingCategories).toContain('Building Materials');
    expect(review.newCategories).toContain('Apparel');
    expect(review.newCategories).not.toContain('Building Materials');
  });

  it('Case 3 — idempotent provision does not recreate existing master data', async () => {
    requireDb(dbUp);
    const fx = await seedPhase0Fixture(
      dbService,
      inventoryService,
      inventoryTransactionService,
      'review-idempotent',
    );

    const { csv } = buildTemplateCsv();
    const parsed = parseInventoryCsvText(csv);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const review = await importService.buildImportReview(fx.factoryId, parsed.rows);
    const first = await importService.ensureMasterData(
      fx.factoryId,
      review.newCategories,
      review.newLocations,
    );
    const second = await importService.ensureMasterData(
      fx.factoryId,
      review.newCategories,
      review.newLocations,
    );

    expect(first.categoriesCreated).toBeGreaterThan(0);
    expect(second.categoriesCreated).toBe(0);
    expect(second.locationsCreated).toBe(0);
  });
});
