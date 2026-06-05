import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from 'src/core/services/db-service/db.module';
import { DbService } from 'src/core/services/db-service/db.service';
import { UserModule } from 'src/services/users/users.module';
import { TasksModule } from 'src/services/tasks/tasks.module';
import { InventoryModule } from 'src/services/inventory/inventory.module';
import { DepartmentsModule } from 'src/services/departments/departments.module';
import { TasksService } from 'src/services/tasks/tasks.service';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { InventoryTransactionService } from 'src/services/inventory/inventory-transaction.service';
import { USER_ROLE } from 'src/services/users/users.constants';
import { TASK_INVENTORY_REFERENCE_TYPE } from 'src/services/tasks/tasks.inventory.constants';
import { randomUUID } from 'crypto';

export interface Phase0Fixture {
  factoryId: number;
  ownerId: number;
  workerId: number;
  worker2Id: number;
  categoryId: number;
  locationId: number;
}

export async function createTestApp(options?: {
  validationPipe?: boolean;
}): Promise<{
  app: INestApplication;
  module: TestingModule;
  tasksService: TasksService;
  inventoryService: InventoryService;
  inventoryTransactionService: InventoryTransactionService;
  dbService: DbService;
}> {
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true }),
      DbModule,
      UserModule,
      DepartmentsModule,
      InventoryModule,
      TasksModule,
    ],
  }).compile();

  const app = module.createNestApplication();
  if (options?.validationPipe) {
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  }
  await app.init();

  return {
    app,
    module,
    tasksService: module.get(TasksService),
    inventoryService: module.get(InventoryService),
    inventoryTransactionService: module.get(InventoryTransactionService),
    dbService: module.get(DbService),
  };
}

export async function seedPhase0Fixture(
  dbService: DbService,
  inventoryService: InventoryService,
  inventoryTransactionService: InventoryTransactionService,
  tag: string,
): Promise<Phase0Fixture> {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const factoryModel = dbService.sqlService.Factory;
  const userModel = dbService.sqlService.User;
  const factoryUserModel = dbService.sqlService.FactoryUser;

  const factory = await factoryModel.create({
    name: `Phase0 Test ${tag} ${suffix}`,
  } as any);

  const owner = await userModel.create({
    phone_number: `+9100${suffix.slice(-8)}1`,
    name: 'Phase0 Owner',
  } as any);
  const worker = await userModel.create({
    phone_number: `+9100${suffix.slice(-8)}2`,
    name: 'Phase0 Worker',
  } as any);
  const worker2 = await userModel.create({
    phone_number: `+9100${suffix.slice(-8)}3`,
    name: 'Phase0 Worker2',
  } as any);

  for (const [userId, role] of [
    [owner.id, USER_ROLE.OWNER],
    [worker.id, USER_ROLE.WORKER],
    [worker2.id, USER_ROLE.WORKER],
  ] as const) {
    await factoryUserModel.create({
      user_id: userId,
      factory_id: factory.id,
      role,
    } as any);
  }

  const category = await inventoryService.createCategory({
    factory_id: factory.id,
    name: `Cat-${suffix}`,
  });
  const location = await inventoryService.createLocation({
    factory_id: factory.id,
    name: `Loc-${suffix}`,
  });

  return {
    factoryId: factory.id,
    ownerId: owner.id,
    workerId: worker.id,
    worker2Id: worker2.id,
    categoryId: category.id,
    locationId: location.id,
  };
}

export async function createInventoryItemWithStock(
  inventoryService: InventoryService,
  inventoryTransactionService: InventoryTransactionService,
  fixture: Phase0Fixture,
  sku: string,
  initialQty: string,
  performedBy: number,
) {
  const item = await inventoryService.createItem({
    factory_id: fixture.factoryId,
    category_id: fixture.categoryId,
    location_id: fixture.locationId,
    sku: `${sku}-${randomUUID().slice(0, 8)}`,
    name: `Item ${sku}`,
    unit: 'pcs',
  });
  if (Number(initialQty) > 0) {
    await inventoryTransactionService.recordStockIn({
      factory_id: fixture.factoryId,
      inventory_item_id: item.id,
      quantity: initialQty,
      created_by: performedBy,
      reference_type: 'INTEGRATION_TEST',
      reference_id: item.id,
    });
  }
  return item;
}

export async function getItemQuantity(
  dbService: DbService,
  itemId: number,
  factoryId: number,
): Promise<number> {
  const row = await dbService.sqlService.InventoryItem.findOne({
    where: { id: itemId, factory_id: factoryId },
  });
  return Number(row?.current_quantity ?? 0);
}

export async function countTaskReferences(
  dbService: DbService,
  taskId: number,
): Promise<number> {
  return dbService.sqlService.InventoryTransaction.count({
    where: {
      reference_type: TASK_INVENTORY_REFERENCE_TYPE,
      reference_id: taskId,
    },
  });
}

export async function countInventoryLines(
  dbService: DbService,
  taskId: number,
): Promise<number> {
  return dbService.sqlService.TaskInventoryLine.count({
    where: { task_id: taskId },
  });
}
