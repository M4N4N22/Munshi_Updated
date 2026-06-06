/**
 * Phase 3.3A — department manager low stock notification tests.
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
import { InventoryLowStockAlertHandler } from 'src/services/inventory/inventory-low-stock-alert.handler';
import { DOMAIN_EVENT_TYPE } from 'src/services/domain-events/domain-events.constants';
import { USER_ROLE } from 'src/services/users/users.constants';
import { TASK_INVENTORY_REFERENCE_TYPE } from 'src/services/tasks/tasks.inventory.constants';
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

describe('Phase 3.3A low stock manager notification', () => {
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
    const status = migrationStatusJson();
    if (status.pending_count > 0) {
      throw new Error(`Migrations pending (${status.pending_count})`);
    }

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

  async function seedItemWithThreshold(tag: string) {
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
      '10',
      fx.ownerId,
    );
    await inventoryService.updateItem(item.id, fx.factoryId, {
      reorder_threshold: '10',
    });
    const owner = await dbService.sqlService.User.findByPk(fx.ownerId);
    return { fx, item, ownerPhone: owner!.phone_number as string };
  }

  async function createManager(fx: Awaited<ReturnType<typeof seedPhase0Fixture>>, tag: string) {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const manager = await dbService.sqlService.User.create({
      phone_number: `+9188${suffix.slice(-8)}`,
      name: `Manager ${tag}`,
    } as any);
    await dbService.sqlService.FactoryUser.create({
      factory_id: fx.factoryId,
      user_id: manager.id,
      role: USER_ROLE.MANAGER,
    } as any);
    return manager;
  }

  async function createDepartment(
    fx: Awaited<ReturnType<typeof seedPhase0Fixture>>,
    managerUserId: number,
    slug: string,
  ) {
    return dbService.sqlService.Department.create({
      factory_id: fx.factoryId,
      name: `Dept ${slug}`,
      slug,
      manager_user_id: managerUserId,
    } as any);
  }

  async function createTask(
    fx: Awaited<ReturnType<typeof seedPhase0Fixture>>,
    departmentId: number | null,
    tag: string,
  ) {
    return dbService.sqlService.Task.create({
      factory_id: fx.factoryId,
      assigned_to: fx.workerId,
      assigned_by: fx.ownerId,
      owner_id: fx.ownerId,
      department_id: departmentId,
      description: `Low stock task ${tag}`,
      is_completed: false,
    } as any);
  }

  async function publishLowStockEvent(
    fx: Awaited<ReturnType<typeof seedPhase0Fixture>>,
    item: { id: number; sku: string; name: string },
    reference: { type: string | null; id: number | null },
  ) {
    const event = await domainEventsService.publish({
      factory_id: fx.factoryId,
      event_type: DOMAIN_EVENT_TYPE.INVENTORY_LOW_STOCK,
      aggregate_type: 'inventory_item',
      aggregate_id: String(item.id),
      payload: {
        factory_id: fx.factoryId,
        inventory_item_id: item.id,
        sku: item.sku,
        item_name: item.name,
        current_quantity: '8.0000',
        reorder_threshold: '10.0000',
        previous_quantity: '10.0000',
        reference_type: reference.type,
        reference_id: reference.id,
      },
    });
    await alertHandler.handle(event);
  }

  it('1 — owner only when movement is not TASK-linked', async () => {
    requireDb(dbUp);
    const { fx, item, ownerPhone } = await seedItemWithThreshold('mgr-owner-only');
    const sendSpy = jest
      .spyOn(messagingService, 'sendText')
      .mockResolvedValue(undefined);

    await publishLowStockEvent(fx, item, { type: 'INTEGRATION_TEST', id: item.id });

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith(
      ownerPhone,
      expect.stringContaining('Low Stock Alert'),
    );
  });

  it('2 — owner and department manager both notified', async () => {
    requireDb(dbUp);
    const { fx, item, ownerPhone } = await seedItemWithThreshold('mgr-both');
    const manager = await createManager(fx, 'both');
    const dept = await createDepartment(fx, manager.id, 'ops-both');
    const task = await createTask(fx, dept.id, 'both');
    const sendSpy = jest
      .spyOn(messagingService, 'sendText')
      .mockResolvedValue(undefined);

    await publishLowStockEvent(fx, item, {
      type: TASK_INVENTORY_REFERENCE_TYPE,
      id: task.id,
    });

    expect(sendSpy).toHaveBeenCalledTimes(2);
    expect(sendSpy).toHaveBeenCalledWith(ownerPhone, expect.any(String));
    expect(sendSpy).toHaveBeenCalledWith(manager.phone_number, expect.any(String));
  });

  it('3 — owner == manager sends single WhatsApp', async () => {
    requireDb(dbUp);
    const { fx, item, ownerPhone } = await seedItemWithThreshold('mgr-self');
    const dept = await createDepartment(fx, fx.ownerId, 'ops-self');
    const task = await createTask(fx, dept.id, 'self');
    const sendSpy = jest
      .spyOn(messagingService, 'sendText')
      .mockResolvedValue(undefined);

    await publishLowStockEvent(fx, item, {
      type: TASK_INVENTORY_REFERENCE_TYPE,
      id: task.id,
    });

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith(ownerPhone, expect.any(String));
  });

  it('4 — missing manager resolves to owner only', async () => {
    requireDb(dbUp);
    const { fx, item, ownerPhone } = await seedItemWithThreshold('mgr-miss');
    const task = await createTask(fx, null, 'miss');
    const sendSpy = jest
      .spyOn(messagingService, 'sendText')
      .mockResolvedValue(undefined);

    await publishLowStockEvent(fx, item, {
      type: TASK_INVENTORY_REFERENCE_TYPE,
      id: task.id,
    });

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith(ownerPhone, expect.any(String));
  });

  it('5 — manager notification failure still notifies owner', async () => {
    requireDb(dbUp);
    const { fx, item, ownerPhone } = await seedItemWithThreshold('mgr-mfail');
    const manager = await createManager(fx, 'mfail');
    const dept = await createDepartment(fx, manager.id, 'ops-mfail');
    const task = await createTask(fx, dept.id, 'mfail');
    const sendSpy = jest
      .spyOn(messagingService, 'sendText')
      .mockImplementation(async (phone: string) => {
        if (phone === manager.phone_number) {
          throw new Error('Manager channel down');
        }
      });

    await publishLowStockEvent(fx, item, {
      type: TASK_INVENTORY_REFERENCE_TYPE,
      id: task.id,
    });

    expect(sendSpy).toHaveBeenCalledTimes(2);
    expect(sendSpy).toHaveBeenCalledWith(ownerPhone, expect.any(String));
  });

  it('6 — owner notification failure still notifies manager', async () => {
    requireDb(dbUp);
    const { fx, item, ownerPhone } = await seedItemWithThreshold('mgr-ofail');
    const manager = await createManager(fx, 'ofail');
    const dept = await createDepartment(fx, manager.id, 'ops-ofail');
    const task = await createTask(fx, dept.id, 'ofail');
    const sendSpy = jest
      .spyOn(messagingService, 'sendText')
      .mockImplementation(async (phone: string) => {
        if (phone === ownerPhone) {
          throw new Error('Owner channel down');
        }
      });

    await publishLowStockEvent(fx, item, {
      type: TASK_INVENTORY_REFERENCE_TYPE,
      id: task.id,
    });

    expect(sendSpy).toHaveBeenCalledTimes(2);
    expect(sendSpy).toHaveBeenCalledWith(manager.phone_number, expect.any(String));
  });
});
