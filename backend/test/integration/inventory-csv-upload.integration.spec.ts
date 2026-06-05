/**
 * Phase 1.3 — inventory CSV REST upload integration tests.
 */
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  createTestApp,
  seedPhase0Fixture,
} from './helpers/phase0-fixtures';
import { migrationStatusJson, probePostgres, runMigrations } from './helpers/db-env';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { InventoryTransactionService } from 'src/services/inventory/inventory-transaction.service';
import { DbService } from 'src/core/services/db-service/db.service';

function requireDb(dbUp: boolean): void {
  if (!dbUp) {
    throw new Error('NOT VERIFIED: Postgres unavailable');
  }
}

function buildCsv(
  categoryName: string,
  locationName: string,
  rows: Array<{
    sku: string;
    name: string;
    unit?: string;
    quantity: string;
  }>,
  header = 'sku,name,category,location,unit,quantity',
): string {
  const lines = rows.map(
    (r) =>
      `${r.sku},${r.name},${categoryName},${locationName},${r.unit ?? 'pcs'},${r.quantity}`,
  );
  return [header, ...lines].join('\n');
}

describe('Phase 1.3 inventory CSV REST upload', () => {
  let dbUp = false;
  let app: INestApplication;
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
    const ctx = await createTestApp({ validationPipe: true });
    app = ctx.app;
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

  describe('Scenario 1 — valid CSV upload', () => {
    it('returns 200 and import summary', async () => {
      requireDb(dbUp);
      const fx = await seedFx('rest1');
      const sku = `REST_${randomUUID().slice(0, 8).toUpperCase()}`;
      const batchId = 2001;
      const csv = buildCsv(fx.categoryName, fx.locationName, [
        { sku, name: 'REST Item', unit: 'bag', quantity: '5.0000' },
      ]);

      const res = await request(app.getHttpServer())
        .post('/inventory/import/csv')
        .field('factory_id', fx.factoryId)
        .field('created_by', fx.ownerId)
        .field('batch_id', batchId)
        .attach('file', Buffer.from(csv, 'utf8'), {
          filename: 'inventory.csv',
          contentType: 'text/csv',
        })
        .expect(200);

      expect(res.body.addedCount).toBe(1);
      expect(res.body.failedCount).toBe(0);
      expect(res.body.rowResults).toHaveLength(1);
      expect(res.body.rowResults[0].status).toBe('added');

      const item = await inventoryService.findItemBySku(fx.factoryId, sku);
      expect(Number(item.current_quantity)).toBe(5);
    });
  });

  describe('Scenario 2 — invalid extension', () => {
    it('returns 400 for xlsx upload', async () => {
      requireDb(dbUp);
      const fx = await seedFx('rest2');
      const csv = 'not,really,excel';

      await request(app.getHttpServer())
        .post('/inventory/import/csv')
        .field('factory_id', fx.factoryId)
        .field('created_by', fx.ownerId)
        .attach('file', Buffer.from(csv, 'utf8'), {
          filename: 'inventory.xlsx',
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        .expect(400);
    });
  });

  describe('Scenario 3 — bad headers', () => {
    it('returns 400 for invalid CSV format', async () => {
      requireDb(dbUp);
      const fx = await seedFx('rest3');
      const csv = 'wrong,headers,only\na,b,c';

      const res = await request(app.getHttpServer())
        .post('/inventory/import/csv')
        .field('factory_id', fx.factoryId)
        .field('created_by', fx.ownerId)
        .attach('file', Buffer.from(csv, 'utf8'), {
          filename: 'inventory.csv',
          contentType: 'text/csv',
        })
        .expect(400);

      expect(String(res.body.message || res.body)).toMatch(/columns|format|Missing/i);
    });
  });

  describe('Scenario 4 — mixed success file', () => {
    it('returns partial success summary with 200', async () => {
      requireDb(dbUp);
      const fx = await seedFx('rest4');
      const csv = buildCsv(fx.categoryName, fx.locationName, [
        {
          sku: `OK_${randomUUID().slice(0, 6).toUpperCase()}`,
          name: 'Good Row',
          quantity: '1.0000',
        },
      ]).concat(
        `\nBAD_${randomUUID().slice(0, 6).toUpperCase()},Bad Row,Missing Category,${fx.locationName},pcs,1.0000`,
      );

      const res = await request(app.getHttpServer())
        .post('/inventory/import/csv')
        .field('factory_id', fx.factoryId)
        .field('created_by', fx.ownerId)
        .attach('file', Buffer.from(csv, 'utf8'), {
          filename: 'inventory.csv',
          contentType: 'text/csv',
        })
        .expect(200);

      expect(res.body.addedCount).toBe(1);
      expect(res.body.failedCount).toBe(1);
      expect(res.body.rowResults).toHaveLength(2);
    });
  });
});
