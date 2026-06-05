/**
 * Phase 0 — task ↔ inventory integration tests (runtime validation).
 * Requires Postgres (POSTGRES_CONNECTION_STRING) with migrations applied.
 */
import { BadRequestException } from '@nestjs/common';
import {
  createTestApp,
  seedPhase0Fixture,
  createInventoryItemWithStock,
  getItemQuantity,
  countTaskReferences,
  countInventoryLines,
  Phase0Fixture,
} from './helpers/phase0-fixtures';
import { migrationStatusJson, probePostgres, runMigrations } from './helpers/db-env';
import { TasksService } from 'src/services/tasks/tasks.service';
import { DbService } from 'src/core/services/db-service/db.service';
import { InventoryTransactionService } from 'src/services/inventory/inventory-transaction.service';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { INestApplication } from '@nestjs/common';

function requireDb(dbUp: boolean): void {
  if (!dbUp) {
    throw new Error(
      'NOT VERIFIED: Postgres unavailable — start Docker Postgres or set POSTGRES_CONNECTION_STRING',
    );
  }
}

describe('Phase 0 task-inventory integration', () => {
  let dbUp = false;
  let app: INestApplication;
  let tasksService: TasksService;
  let inventoryService: InventoryService;
  let inventoryTransactionService: InventoryTransactionService;
  let dbService: DbService;

  beforeAll(async () => {
    dbUp = await probePostgres();
    if (!dbUp) return;
    runMigrations();
    const status = migrationStatusJson();
    if (status.pending_count > 0) {
      throw new Error(
        `Migrations pending (${status.pending_count}) after apply-migrations`,
      );
    }
    const ctx = await createTestApp();
    app = ctx.app;
    tasksService = ctx.tasksService;
    inventoryService = ctx.inventoryService;
    inventoryTransactionService = ctx.inventoryTransactionService;
    dbService = ctx.dbService;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('Phase 0.1 — foundation', () => {
    it('task_inventory_lines table and TaskInventoryLine model exist', async () => {
      requireDb(dbUp);
      const sequelize = dbService.sqlService.Task.sequelize!;
      const [rows] = await sequelize.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'task_inventory_lines'
        ORDER BY ordinal_position
      `);
      const cols = (rows as { column_name: string }[]).map((r) => r.column_name);
      expect(cols).toEqual(
        expect.arrayContaining([
          'id',
          'factory_id',
          'task_id',
          'inventory_item_id',
          'quantity_expected',
          'quantity_completed',
          'movement_type',
        ]),
      );
      expect(dbService.sqlService.TaskInventoryLine).toBeDefined();
      expect(dbService.sqlService.Task.associations.inventory_lines).toBeDefined();
    });
  });

  describe('Scenario 1 — single STOCK_OUT completion', () => {
    it('decreases stock, completes task, writes TASK reference', async () => {
      requireDb(dbUp);
      const fx = await seedPhase0Fixture(
        dbService,
        inventoryService,
        inventoryTransactionService,
        's1',
      );
      const item = await createInventoryItemWithStock(
        inventoryService,
        inventoryTransactionService,
        fx,
        'S1',
        '10',
        fx.ownerId,
      );

      const task = await tasksService.adminCreate({
        factory_id: fx.factoryId,
        assigned_to: fx.workerId,
        assigned_by: fx.ownerId,
        description: 'Deliver cement',
        inventory_lines: [
          {
            inventory_item_id: item.id,
            quantity_expected: '3',
            movement_type: 'STOCK_OUT',
          },
        ],
      });

      expect(await countInventoryLines(dbService, task.id)).toBe(1);

      await tasksService.adminComplete(task.id, true);

      const reloaded = await dbService.sqlService.Task.findByPk(task.id);
      expect(reloaded?.is_completed).toBe(true);
      expect(await getItemQuantity(dbService, item.id, fx.factoryId)).toBe(7);
      expect(await countTaskReferences(dbService, task.id)).toBe(1);
    });
  });

  describe('Scenario 2 — single STOCK_IN completion', () => {
    it('increases stock, completes task, writes TASK reference', async () => {
      requireDb(dbUp);
      const fx = await seedPhase0Fixture(
        dbService,
        inventoryService,
        inventoryTransactionService,
        's2',
      );
      const item = await createInventoryItemWithStock(
        inventoryService,
        inventoryTransactionService,
        fx,
        'S2',
        '5',
        fx.ownerId,
      );

      const task = await tasksService.adminCreate({
        factory_id: fx.factoryId,
        assigned_to: fx.workerId,
        assigned_by: fx.ownerId,
        description: 'Restock shelf',
        inventory_lines: [
          {
            inventory_item_id: item.id,
            quantity_expected: '4',
            movement_type: 'STOCK_IN',
          },
        ],
      });

      await tasksService.adminComplete(task.id, true);

      expect(await getItemQuantity(dbService, item.id, fx.factoryId)).toBe(9);
      expect(await countTaskReferences(dbService, task.id)).toBe(1);
      expect(
        (await dbService.sqlService.Task.findByPk(task.id))?.is_completed,
      ).toBe(true);
    });
  });

  describe('Scenario 3 — multi-line completion success', () => {
    it('applies all movements and completes task', async () => {
      requireDb(dbUp);
      const fx = await seedPhase0Fixture(
        dbService,
        inventoryService,
        inventoryTransactionService,
        's3',
      );
      const itemA = await createInventoryItemWithStock(
        inventoryService,
        inventoryTransactionService,
        fx,
        'S3A',
        '20',
        fx.ownerId,
      );
      const itemB = await createInventoryItemWithStock(
        inventoryService,
        inventoryTransactionService,
        fx,
        'S3B',
        '10',
        fx.ownerId,
      );

      const task = await tasksService.adminCreate({
        factory_id: fx.factoryId,
        assigned_to: fx.workerId,
        assigned_by: fx.ownerId,
        description: 'Multi-line delivery',
        inventory_lines: [
          {
            inventory_item_id: itemA.id,
            quantity_expected: '2',
            movement_type: 'STOCK_OUT',
          },
          {
            inventory_item_id: itemB.id,
            quantity_expected: '1',
            movement_type: 'STOCK_OUT',
          },
        ],
      });

      await tasksService.adminComplete(task.id, true);

      expect(await getItemQuantity(dbService, itemA.id, fx.factoryId)).toBe(18);
      expect(await getItemQuantity(dbService, itemB.id, fx.factoryId)).toBe(9);
      expect(await countTaskReferences(dbService, task.id)).toBe(2);
      expect(
        (await dbService.sqlService.Task.findByPk(task.id))?.is_completed,
      ).toBe(true);
    });
  });

  describe('Scenario 4 — multi-line failure rollback', () => {
    it('leaves stock unchanged and task incomplete when second line fails', async () => {
      requireDb(dbUp);
      const fx = await seedPhase0Fixture(
        dbService,
        inventoryService,
        inventoryTransactionService,
        's4',
      );
      const item = await createInventoryItemWithStock(
        inventoryService,
        inventoryTransactionService,
        fx,
        'S4',
        '10',
        fx.ownerId,
      );

      const task = await tasksService.adminCreate({
        factory_id: fx.factoryId,
        assigned_to: fx.workerId,
        assigned_by: fx.ownerId,
        description: 'Multi-line fail',
        inventory_lines: [
          {
            inventory_item_id: item.id,
            quantity_expected: '3',
            movement_type: 'STOCK_OUT',
          },
          {
            inventory_item_id: item.id,
            quantity_expected: '15',
            movement_type: 'STOCK_OUT',
          },
        ],
      });

      await expect(tasksService.adminComplete(task.id, true)).rejects.toThrow(
        BadRequestException,
      );

      expect(await getItemQuantity(dbService, item.id, fx.factoryId)).toBe(10);
      expect(await countTaskReferences(dbService, task.id)).toBe(0);
      expect(
        (await dbService.sqlService.Task.findByPk(task.id))?.is_completed,
      ).toBe(false);
    });
  });

  describe('Scenario 5 — insufficient stock', () => {
    it('blocks completion and leaves stock unchanged', async () => {
      requireDb(dbUp);
      const fx = await seedPhase0Fixture(
        dbService,
        inventoryService,
        inventoryTransactionService,
        's5',
      );
      const item = await createInventoryItemWithStock(
        inventoryService,
        inventoryTransactionService,
        fx,
        'S5',
        '2',
        fx.ownerId,
      );

      const task = await tasksService.adminCreate({
        factory_id: fx.factoryId,
        assigned_to: fx.workerId,
        assigned_by: fx.ownerId,
        description: 'Over draw',
        inventory_lines: [
          {
            inventory_item_id: item.id,
            quantity_expected: '5',
            movement_type: 'STOCK_OUT',
          },
        ],
      });

      await expect(tasksService.adminComplete(task.id, true)).rejects.toThrow(
        /Insufficient stock/i,
      );

      expect(await getItemQuantity(dbService, item.id, fx.factoryId)).toBe(2);
      expect(
        (await dbService.sqlService.Task.findByPk(task.id))?.is_completed,
      ).toBe(false);
    });
  });

  describe('Scenario 6 — reopen inventory-linked task', () => {
    it('rejects reopen', async () => {
      requireDb(dbUp);
      const fx = await seedPhase0Fixture(
        dbService,
        inventoryService,
        inventoryTransactionService,
        's6',
      );
      const item = await createInventoryItemWithStock(
        inventoryService,
        inventoryTransactionService,
        fx,
        'S6',
        '10',
        fx.ownerId,
      );

      const task = await tasksService.adminCreate({
        factory_id: fx.factoryId,
        assigned_to: fx.workerId,
        assigned_by: fx.ownerId,
        description: 'No reopen',
        inventory_lines: [
          {
            inventory_item_id: item.id,
            quantity_expected: '1',
            movement_type: 'STOCK_OUT',
          },
        ],
      });
      await tasksService.adminComplete(task.id, true);

      await expect(tasksService.adminComplete(task.id, false)).rejects.toThrow(
        /cannot be reopened/i,
      );
      expect(
        (await dbService.sqlService.Task.findByPk(task.id))?.is_completed,
      ).toBe(true);
    });
  });

  describe('Scenario 7 — reopen non-inventory task', () => {
    it('allows reopen', async () => {
      requireDb(dbUp);
      const fx = await seedPhase0Fixture(
        dbService,
        inventoryService,
        inventoryTransactionService,
        's7',
      );

      const task = await tasksService.adminCreate({
        factory_id: fx.factoryId,
        assigned_to: fx.workerId,
        assigned_by: fx.ownerId,
        description: 'Generic task',
      });
      await tasksService.adminComplete(task.id, true);

      const result = await tasksService.adminComplete(task.id, false);
      expect(result.message).toMatch(/reopened/i);
      expect(
        (await dbService.sqlService.Task.findByPk(task.id))?.is_completed,
      ).toBe(false);
    });
  });

  describe('Scenario 8 — assignToAll + inventory_lines', () => {
    it('rejects batch assign with inventory lines', async () => {
      requireDb(dbUp);
      const fx = await seedPhase0Fixture(
        dbService,
        inventoryService,
        inventoryTransactionService,
        's8',
      );
      const item = await createInventoryItemWithStock(
        inventoryService,
        inventoryTransactionService,
        fx,
        'S8',
        '10',
        fx.ownerId,
      );

      await expect(
        tasksService.assignToAll(fx.ownerId, fx.factoryId, 'Batch with stock', {
          inventory_lines: [
            {
              inventory_item_id: item.id,
              quantity_expected: '1',
              movement_type: 'STOCK_OUT',
            },
          ],
        }),
      ).rejects.toThrow(/assign-to-all/i);
    });
  });

  describe('Scenario 9 — TRANSFER movement', () => {
    it('rejects completion with TRANSFER line', async () => {
      requireDb(dbUp);
      const fx = await seedPhase0Fixture(
        dbService,
        inventoryService,
        inventoryTransactionService,
        's9',
      );
      const item = await createInventoryItemWithStock(
        inventoryService,
        inventoryTransactionService,
        fx,
        'S9',
        '10',
        fx.ownerId,
      );

      const task = await tasksService.adminCreate({
        factory_id: fx.factoryId,
        assigned_to: fx.workerId,
        assigned_by: fx.ownerId,
        description: 'Transfer line',
        inventory_lines: [
          {
            inventory_item_id: item.id,
            quantity_expected: '1',
            movement_type: 'TRANSFER',
          },
        ],
      });

      await expect(tasksService.adminComplete(task.id, true)).rejects.toThrow(
        /TRANSFER/i,
      );
      expect(await getItemQuantity(dbService, item.id, fx.factoryId)).toBe(10);
      expect(
        (await dbService.sqlService.Task.findByPk(task.id))?.is_completed,
      ).toBe(false);
    });
  });

  describe('Scenario 10 — duplicate completion', () => {
    it('moves stock only once', async () => {
      requireDb(dbUp);
      const fx = await seedPhase0Fixture(
        dbService,
        inventoryService,
        inventoryTransactionService,
        's10',
      );
      const item = await createInventoryItemWithStock(
        inventoryService,
        inventoryTransactionService,
        fx,
        'S10',
        '10',
        fx.ownerId,
      );

      const task = await tasksService.adminCreate({
        factory_id: fx.factoryId,
        assigned_to: fx.workerId,
        assigned_by: fx.ownerId,
        description: 'Idempotent complete',
        inventory_lines: [
          {
            inventory_item_id: item.id,
            quantity_expected: '2',
            movement_type: 'STOCK_OUT',
          },
        ],
      });

      await tasksService.adminComplete(task.id, true);
      const qtyAfterFirst = await getItemQuantity(
        dbService,
        item.id,
        fx.factoryId,
      );
      const refsAfterFirst = await countTaskReferences(dbService, task.id);

      const second = await tasksService.adminComplete(task.id, true);
      expect(second.message).toMatch(/already marked as completed/i);

      expect(await getItemQuantity(dbService, item.id, fx.factoryId)).toBe(
        qtyAfterFirst,
      );
      expect(await countTaskReferences(dbService, task.id)).toBe(refsAfterFirst);
      expect(refsAfterFirst).toBe(1);
    });
  });

  describe('Phase 0.2 — persistence and retrieval', () => {
    it('persists lines on create and returns them on adminFindOne', async () => {
      requireDb(dbUp);
      const fx = await seedPhase0Fixture(
        dbService,
        inventoryService,
        inventoryTransactionService,
        'p02',
      );
      const item = await createInventoryItemWithStock(
        inventoryService,
        inventoryTransactionService,
        fx,
        'P02',
        '5',
        fx.ownerId,
      );

      const created = await tasksService.adminCreate({
        factory_id: fx.factoryId,
        assigned_to: fx.workerId,
        assigned_by: fx.ownerId,
        description: 'Retrieve lines',
        inventory_lines: [
          {
            inventory_item_id: item.id,
            quantity_expected: '2',
            movement_type: 'STOCK_OUT',
          },
        ],
      });

      const detail = await tasksService.adminFindOne(created.id);
      const lines = (detail as any).inventory_lines as any[];
      expect(lines?.length).toBe(1);
      expect(Number(lines[0].quantity_expected)).toBe(2);

      await tasksService.adminRemove(created.id);
      expect(await countInventoryLines(dbService, created.id)).toBe(0);
    });
  });
});
