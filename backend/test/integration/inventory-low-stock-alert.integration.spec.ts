/**
 * Phase 3.1 — inventory low stock alert integration tests.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from 'src/core/services/db-service/db.module';
import { DbService } from 'src/core/services/db-service/db.service';
import { UserModule } from 'src/services/users/users.module';
import { InventoryModule } from 'src/services/inventory/inventory.module';
import { DomainEventsModule } from 'src/services/domain-events/domain-events.module';
import { DomainEventsService } from 'src/services/domain-events/domain-events.service';
import { MessagingModule } from 'src/core/messaging/messaging.module';
import { MessagingService } from 'src/core/messaging/messaging.service';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { InventoryTransactionService } from 'src/services/inventory/inventory-transaction.service';
import { DOMAIN_EVENT_TYPE } from 'src/services/domain-events/domain-events.constants';
import { InventoryLowStockAlertHandler } from 'src/services/inventory/inventory-low-stock-alert.handler';
import {
  createInventoryItemWithStock,
  seedPhase0Fixture,
} from './helpers/phase0-fixtures';
import { migrationStatusJson, probePostgres, runMigrations } from './helpers/db-env';

function requireDb(dbUp: boolean): void {
  if (!dbUp) {
    throw new Error('NOT VERIFIED: Postgres unavailable');
  }
}

async function countLowStockEvents(
  dbService: DbService,
  factoryId?: number,
): Promise<number> {
  const rows = await dbService.sqlService.DomainEvent.findAll({
    where: { event_type: DOMAIN_EVENT_TYPE.INVENTORY_LOW_STOCK },
  });
  if (factoryId == null) return rows.length;
  return rows.filter((row) => {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    return payload.factory_id === factoryId;
  }).length;
}

describe('Phase 3.1 inventory low stock alert', () => {
  let dbUp = false;
  let app: INestApplication;
  let dbService: DbService;
  let inventoryService: InventoryService;
  let inventoryTransactionService: InventoryTransactionService;
  let domainEventsService: DomainEventsService;
  let messagingService: MessagingService;
  let alertHandler: InventoryLowStockAlertHandler;

  beforeAll(async () => {
    dbUp = await probePostgres();
    if (!dbUp) return;
    runMigrations();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DbModule,
        UserModule,
        MessagingModule,
        InventoryModule,
        DomainEventsModule,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    dbService = module.get(DbService);
    inventoryService = module.get(InventoryService);
    inventoryTransactionService = module.get(InventoryTransactionService);
    domainEventsService = module.get(DomainEventsService);
    messagingService = module.get(MessagingService);
    alertHandler = module.get(InventoryLowStockAlertHandler);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  async function seedItemWithThreshold(
    tag: string,
    initialQty: string,
    threshold: string,
  ) {
    const fx = await seedPhase0Fixture(
      dbService,
      inventoryService,
      inventoryTransactionService,
      tag,
    );
    const item = await createInventoryItemWithStock(
      inventoryService,
      inventoryTransactionService,
      fx,
      tag,
      initialQty,
      fx.ownerId,
    );
    await inventoryService.updateItem(item.id, fx.factoryId, {
      reorder_threshold: threshold,
    });
    return { fx, item };
  }

  it('1 — threshold crossed on STOCK_OUT publishes event', async () => {
    requireDb(dbUp);
    const { fx, item } = await seedItemWithThreshold('ls-cross', '10', '10');
    const before = await countLowStockEvents(dbService, fx.factoryId);

    await inventoryTransactionService.recordStockOut({
      factory_id: fx.factoryId,
      inventory_item_id: item.id,
      quantity: '2',
      created_by: fx.ownerId,
      reference_type: 'INTEGRATION_TEST',
      reference_id: item.id,
    });

    const after = await countLowStockEvents(dbService, fx.factoryId);
    expect(after - before).toBe(1);

    const event = (
      await dbService.sqlService.DomainEvent.findAll({
        where: {
          event_type: DOMAIN_EVENT_TYPE.INVENTORY_LOW_STOCK,
          factory_id: fx.factoryId,
        },
        order: [['id', 'DESC']],
        limit: 1,
      })
    )[0];
    const payload = event.payload as Record<string, unknown>;
    expect(payload.inventory_item_id).toBe(item.id);
    expect(payload.current_quantity).toBe('8.0000');
    expect(payload.previous_quantity).toBe('10.0000');
    expect(payload.reorder_threshold).toBe('10.0000');
  });

  it('2 — already low stock STOCK_OUT does not publish', async () => {
    requireDb(dbUp);
    const { fx, item } = await seedItemWithThreshold('ls-already', '8', '10');
    const before = await countLowStockEvents(dbService, fx.factoryId);

    await inventoryTransactionService.recordStockOut({
      factory_id: fx.factoryId,
      inventory_item_id: item.id,
      quantity: '2',
      created_by: fx.ownerId,
    });

    const after = await countLowStockEvents(dbService, fx.factoryId);
    expect(after - before).toBe(0);
  });

  it('3 — STOCK_IN does not publish low stock event', async () => {
    requireDb(dbUp);
    const { fx, item } = await seedItemWithThreshold('ls-in', '5', '10');
    const before = await countLowStockEvents(dbService, fx.factoryId);

    await inventoryTransactionService.recordStockIn({
      factory_id: fx.factoryId,
      inventory_item_id: item.id,
      quantity: '10',
      created_by: fx.ownerId,
    });

    const after = await countLowStockEvents(dbService, fx.factoryId);
    expect(after - before).toBe(0);
  });

  it('4 — ADJUSTMENT does not publish low stock event', async () => {
    requireDb(dbUp);
    const { fx, item } = await seedItemWithThreshold('ls-adj', '10', '10');
    const before = await countLowStockEvents(dbService, fx.factoryId);

    await inventoryTransactionService.recordAdjustment({
      factory_id: fx.factoryId,
      inventory_item_id: item.id,
      quantity: '-2',
      created_by: fx.ownerId,
    });

    const after = await countLowStockEvents(dbService, fx.factoryId);
    expect(after - before).toBe(0);
  });

  it('5 — handler sends WhatsApp to owner', async () => {
    requireDb(dbUp);
    const { fx, item } = await seedItemWithThreshold('ls-wa', '10', '10');
    const sendSpy = jest
      .spyOn(messagingService, 'sendText')
      .mockResolvedValue(undefined);

    await inventoryTransactionService.recordStockOut({
      factory_id: fx.factoryId,
      inventory_item_id: item.id,
      quantity: '2',
      created_by: fx.ownerId,
    });

    const event = await dbService.sqlService.DomainEvent.findOne({
      where: {
        event_type: DOMAIN_EVENT_TYPE.INVENTORY_LOW_STOCK,
        factory_id: fx.factoryId,
        aggregate_id: String(item.id),
      },
      order: [['id', 'DESC']],
    });
    expect(event).toBeTruthy();
    await alertHandler.handle(event!);

    expect(sendSpy).toHaveBeenCalledTimes(1);
    const [phone, message] = sendSpy.mock.calls[0];
    expect(String(phone)).toMatch(/^\+91/);
    expect(message).toContain('Low Stock Alert');
    expect(message).toContain(`/purchase_request_create?itemId=${item.id}`);
    expect(message).toContain('Inventory low ho gaya hai');
  });
});
