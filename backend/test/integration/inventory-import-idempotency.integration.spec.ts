/**
 * Inventory import idempotency — webhook dedup, confirm lock, stock integrity.
 */
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DbModule } from 'src/core/services/db-service/db.module';
import { InventoryModule } from 'src/services/inventory/inventory.module';
import { InventoryBulkImportService } from 'src/modules/whatsapp/inventory-bulk-import.service';
import { WhatsAppWebhookDedupService } from 'src/modules/whatsapp/whatsapp-webhook-dedup.service';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { InventoryTransactionService } from 'src/services/inventory/inventory-transaction.service';
import { DbService } from 'src/core/services/db-service/db.service';
import { INVENTORY_REFERENCE_TYPE } from 'src/services/inventory/inventory.constants';
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

describe('Inventory import idempotency', () => {
  let dbUp = false;
  let app: INestApplication;
  let bulkImport: InventoryBulkImportService;
  let webhookDedup: WhatsAppWebhookDedupService;
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
        InventoryModule,
      ],
      providers: [InventoryBulkImportService, WhatsAppWebhookDedupService],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    bulkImport = moduleRef.get(InventoryBulkImportService);
    webhookDedup = moduleRef.get(WhatsAppWebhookDedupService);
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

  it('deduplicates duplicate webhook message_id', async () => {
    requireDb(dbUp);
    const messageId = `wamid.${randomUUID()}`;

    const first = await webhookDedup.tryClaim({
      providerMessageId: messageId,
      eventKind: 'document',
      fromPhone: '919999999999',
    });
    const second = await webhookDedup.tryClaim({
      providerMessageId: messageId,
      eventKind: 'document',
      fromPhone: '919999999999',
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it('rejects CSV without import session', async () => {
    requireDb(dbUp);
    const fx = await seedFx('idem-no-session');
    bulkImport.cancelAwaiting(fx.ownerPhone);

    const msg = await bulkImport.importFromCsvBuffer(
      fx.ownerPhone,
      Buffer.from('sku,name,category,location,unit,quantity\nA,A,A,B,pcs,1', 'utf8'),
      'inventory.csv',
    );

    expect(msg).toContain('/inventory_import_csv');
  });

  it('allows only one CONFIRM import execution', async () => {
    requireDb(dbUp);
    const fx = await seedFx('idem-confirm');
    const sku = `IDEM_${randomUUID().slice(0, 8).toUpperCase()}`;
    const csv = buildCsv(fx.categoryName, fx.locationName, [
      { sku, name: 'Idem Item', quantity: '5.0000' },
    ]);

    await bulkImport.importFromCsvBuffer(
      fx.ownerPhone,
      Buffer.from(csv, 'utf8'),
      'inventory.csv',
    );

    const firstPromise = bulkImport.handleReviewReply(fx.ownerPhone, 'CONFIRM');
    const secondMsg = await bulkImport.handleReviewReply(fx.ownerPhone, 'CONFIRM');

    expect(secondMsg).toContain('Import already in progress');

    const firstMsg = await firstPromise;
    expect(firstMsg).toContain('Inventory import complete');

    const item = await inventoryService.findItemBySku(fx.factoryId, sku);
    expect(Number(item.current_quantity)).toBe(5);
  });

  it('does not duplicate CSV stock-in for same batch retry', async () => {
    requireDb(dbUp);
    const fx = await seedFx('idem-stock');
    const sku = `STK_${randomUUID().slice(0, 8).toUpperCase()}`;
    const csv = buildCsv(fx.categoryName, fx.locationName, [
      { sku, name: 'Stock Item', quantity: '10.0000' },
    ]);

    await bulkImport.importFromCsvBuffer(
      fx.ownerPhone,
      Buffer.from(csv, 'utf8'),
      'inventory.csv',
    );
    await bulkImport.handleReviewReply(fx.ownerPhone, 'CONFIRM');

    const item = await inventoryService.findItemBySku(fx.factoryId, sku);
    const txns = await dbService.sqlService.InventoryTransaction.findAll({
      where: {
        inventory_item_id: item.id,
        reference_type: INVENTORY_REFERENCE_TYPE.CSV_IMPORT,
      },
    });

    expect(txns.length).toBe(1);
    expect(Number(item.current_quantity)).toBe(10);
  });
});
