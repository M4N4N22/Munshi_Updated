/**
 * Phase 1.4 — WhatsApp inventory CSV import integration tests.
 */
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DbModule } from 'src/core/services/db-service/db.module';
import { UserModule } from 'src/services/users/users.module';
import { DepartmentsModule } from 'src/services/departments/departments.module';
import { InventoryModule } from 'src/services/inventory/inventory.module';
import { InventoryBulkImportService } from 'src/modules/whatsapp/inventory-bulk-import.service';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { InventoryTransactionService } from 'src/services/inventory/inventory-transaction.service';
import { DbService } from 'src/core/services/db-service/db.service';
import { INVENTORY_CSV_MAX_BYTES } from 'src/modules/whatsapp/inventory-csv.constants';
import { seedPhase0Fixture } from './helpers/phase0-fixtures';
import { migrationStatusJson, probePostgres, runMigrations } from './helpers/db-env';

function requireDb(dbUp: boolean): void {
  if (!dbUp) {
    throw new Error('NOT VERIFIED: Postgres unavailable');
  }
}

function buildCsv(
  categoryName: string,
  locationName: string,
  rows: Array<{ sku: string; name: string; quantity: string }>,
): string {
  const header = 'sku,name,category,location,unit,quantity';
  const lines = rows.map(
    (r) => `${r.sku},${r.name},${categoryName},${locationName},pcs,${r.quantity}`,
  );
  return [header, ...lines].join('\n');
}

describe('Phase 1.4 WhatsApp inventory CSV import', () => {
  let dbUp = false;
  let app: INestApplication;
  let bulkImport: InventoryBulkImportService;
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
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DbModule,
        UserModule,
        DepartmentsModule,
        InventoryModule,
      ],
      providers: [InventoryBulkImportService],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    bulkImport = moduleRef.get(InventoryBulkImportService);
    inventoryService = moduleRef.get(InventoryService);
    inventoryTransactionService = moduleRef.get(InventoryTransactionService);
    dbService = moduleRef.get(DbService);
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
    const owner = await dbService.sqlService.User.findByPk(fx.ownerId);
    const ownerPhone = owner!.phone_number as string;
    bulkImport.startAwaitingCsv(ownerPhone, fx.factoryId, fx.ownerId);
    return {
      ...fx,
      categoryName: cat!.name,
      locationName: loc!.name,
      ownerPhone,
    };
  }

  describe('Scenario 1 — valid CSV document', () => {
    it('imports items and returns success summary', async () => {
      requireDb(dbUp);
      const fx = await seedFx('wa1');
      const sku = `WA_${randomUUID().slice(0, 8).toUpperCase()}`;
      const csv = buildCsv(fx.categoryName, fx.locationName, [
        { sku, name: 'WhatsApp Item', quantity: '3.0000' },
      ]);

      const msg = await bulkImport.importFromCsvBuffer(
        fx.ownerPhone,
        Buffer.from(csv, 'utf8'),
        'inventory.csv',
      );

      expect(msg).toContain('✅ Inventory import complete');
      expect(msg).toContain('Added: 1');
      const item = await inventoryService.findItemBySku(fx.factoryId, sku);
      expect(Number(item.current_quantity)).toBe(3);
    });
  });

  describe('Scenario 2 — invalid extension', () => {
    it('rejects xlsx without import', async () => {
      requireDb(dbUp);
      const fx = await seedFx('wa2');

      const msg = await bulkImport.importFromCsvBuffer(
        fx.ownerPhone,
        Buffer.from('a,b,c'),
        'inventory.xlsx',
      );

      expect(msg).toContain('Sirf CSV inventory files supported');
    });
  });

  describe('Scenario 3 — parser failure', () => {
    it('returns invalid CSV message', async () => {
      requireDb(dbUp);
      const fx = await seedFx('wa3');

      const msg = await bulkImport.importFromCsvBuffer(
        fx.ownerPhone,
        Buffer.from('wrong,headers\na,b', 'utf8'),
        'inventory.csv',
      );

      expect(msg).toContain('❌ CSV file invalid hai');
    });
  });

  describe('Scenario 4 — mixed success file', () => {
    it('returns partial success summary', async () => {
      requireDb(dbUp);
      const fx = await seedFx('wa4');
      const csv =
        buildCsv(fx.categoryName, fx.locationName, [
          {
            sku: `OK_${randomUUID().slice(0, 6).toUpperCase()}`,
            name: 'Good',
            quantity: '1.0000',
          },
        ]) +
        `\nBAD_${randomUUID().slice(0, 6).toUpperCase()},Bad,Missing Cat,${fx.locationName},pcs,1.0000`;

      const msg = await bulkImport.importFromCsvBuffer(
        fx.ownerPhone,
        Buffer.from(csv, 'utf8'),
        'inventory.csv',
      );

      expect(msg).toContain('Failed: 1');
      expect(msg).toContain('Added: 1');
    });
  });

  describe('Scenario 5 — large file', () => {
    it('rejects file over 2 MB', async () => {
      requireDb(dbUp);
      const fx = await seedFx('wa5');
      const big = Buffer.alloc(INVENTORY_CSV_MAX_BYTES + 1);

      const msg = await bulkImport.importFromCsvBuffer(
        fx.ownerPhone,
        big,
        'inventory.csv',
      );

      expect(msg).toContain('bahut badi');
    });
  });
});
