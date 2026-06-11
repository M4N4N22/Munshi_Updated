/**
 * Phase 3.4 — purchase request prefill from low stock alert tests.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from 'src/core/services/db-service/db.module';
import { DbService } from 'src/core/services/db-service/db.service';
import { UserModule } from 'src/services/users/users.module';
import { InventoryModule } from 'src/services/inventory/inventory.module';
import { DomainEventsModule } from 'src/services/domain-events/domain-events.module';
import { MessagingModule } from 'src/core/messaging/messaging.module';
import { WA_LOW_STOCK_PURCHASE_BUTTON_TITLE } from 'src/core/messaging/inventory-low-stock-outbound';
import { MessagingService } from 'src/core/messaging/messaging.service';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { InventoryTransactionService } from 'src/services/inventory/inventory-transaction.service';
import { WorkflowModule } from 'src/services/workflow/workflow.module';
import { WorkflowRouterService } from 'src/services/workflow/workflow-engine.service';
import { WorkflowSessionService } from 'src/services/workflow/workflow-session.service';
import { PurchaseRequestPrefillService } from 'src/services/purchase-requests/purchase-request-prefill.service';
import { PURCHASE_REQUEST_STATUS } from 'src/services/purchase-requests/purchase-requests.constants';
import { buildPurchaseRequestCreateCommand } from 'src/services/purchase-requests/purchase-request-prefill.helper';
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

describe('Phase 3.4 purchase request prefill from low stock', () => {
  let dbUp = false;
  let app: INestApplication;
  let dbService: DbService;
  let inventoryService: InventoryService;
  let inventoryTransactionService: InventoryTransactionService;
  let messagingService: MessagingService;
  let workflowRouter: WorkflowRouterService;
  let workflowSessionService: WorkflowSessionService;
  let prefillService: PurchaseRequestPrefillService;

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
        WorkflowModule,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    dbService = module.get(DbService);
    inventoryService = module.get(InventoryService);
    inventoryTransactionService = module.get(InventoryTransactionService);
    messagingService = module.get(MessagingService);
    workflowRouter = module.get(WorkflowRouterService);
    workflowSessionService = module.get(WorkflowSessionService);
    prefillService = module.get(PurchaseRequestPrefillService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  async function seedLowStockItem(tag: string) {
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
    const ownerPhone = owner!.phone_number as string;
    return { fx, item, ownerPhone };
  }

  async function countPurchaseRequests(factoryId: number): Promise<number> {
    return dbService.sqlService.PurchaseRequest.count({
      where: { factory_id: factoryId },
    });
  }

  async function countInventoryTransactions(factoryId: number): Promise<number> {
    return dbService.sqlService.InventoryTransaction.count({
      where: { factory_id: factoryId },
    });
  }

  it('1 — low stock alert CTA includes itemId', async () => {
    requireDb(dbUp);
    const { fx, item } = await seedLowStockItem('pr-prefill-cta');
    const sendSpy = jest
      .spyOn(messagingService, 'sendInteractiveButtons')
      .mockResolvedValue(undefined);

    await inventoryTransactionService.recordStockOut({
      factory_id: fx.factoryId,
      inventory_item_id: item.id,
      quantity: '2',
      created_by: fx.ownerId,
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(sendSpy).toHaveBeenCalled();
    const [, body, buttons] = sendSpy.mock.calls[0];
    expect(body).toContain(item.name);
    expect(body).toContain('Low Stock Alert');
    expect(buttons[0].id).toBe(buildPurchaseRequestCreateCommand(item.id));
    expect(buttons[0].title).toBe(WA_LOW_STOCK_PURCHASE_BUTTON_TITLE);
  });

  it('2 — prefill item loaded into workflow session', async () => {
    requireDb(dbUp);
    const { fx, item, ownerPhone } = await seedLowStockItem('pr-prefill-load');

    const prefill = await prefillService.buildLowStockPrefill(fx.factoryId, item.id);
    expect(prefill).not.toBeNull();
    expect(prefill!.inventory_item_id).toBe(item.id);
    expect(prefill!.item_name).toBeTruthy();

    const prompt = await workflowRouter.startWorkflowFromCommand(
      ownerPhone,
      buildPurchaseRequestCreateCommand(item.id),
    );
    expect(prompt).toContain('prefilled');

    const session = await workflowSessionService.resolveActiveSession(ownerPhone);
    const data = session.session!.session_data as Record<string, unknown>;
    expect(data.inventory_item_id).toBe(item.id);
    expect(data.item_name).toBe(prefill!.item_name);
    expect(data.prefill_pending_confirm).toBe(true);
  });

  it('3 — user edits quantity before submit', async () => {
    requireDb(dbUp);
    const { fx, item, ownerPhone } = await seedLowStockItem('pr-prefill-edit');

    await workflowRouter.startWorkflowFromCommand(
      ownerPhone,
      buildPurchaseRequestCreateCommand(item.id),
    );

    const edited = await workflowRouter.handleActiveWorkflowMessage(ownerPhone, '25');
    expect(edited).toContain('25');

    const session = await workflowSessionService.resolveActiveSession(ownerPhone);
    expect(session.session!.session_data.item_quantity).toBe('25');
    expect(session.session!.session_data.prefill_pending_confirm).toBe(true);

    const prBefore = await countPurchaseRequests(fx.factoryId);
    expect(prBefore).toBe(0);
  });

  it('4 — approval workflow unchanged after manual submit', async () => {
    requireDb(dbUp);
    const { fx, item, ownerPhone } = await seedLowStockItem('pr-prefill-approval');

    await workflowRouter.startWorkflowFromCommand(
      ownerPhone,
      buildPurchaseRequestCreateCommand(item.id),
    );
    await workflowRouter.handleActiveWorkflowMessage(ownerPhone, 'YES');

    const sessionAfterSubmit =
      await workflowSessionService.resolveActiveSession(ownerPhone);
    expect(sessionAfterSubmit.session!.current_step).toBe('APPROVAL');

    const rejectMsg = await workflowRouter.handleActiveWorkflowMessage(
      ownerPhone,
      'NO',
    );
    expect(rejectMsg).toContain('Rejected');

    const prId = sessionAfterSubmit.session!.session_data.purchase_request_id as number;
    const pr = await dbService.sqlService.PurchaseRequest.findByPk(prId);
    expect(pr!.status).toBe(PURCHASE_REQUEST_STATUS.REJECTED);
  });

  it('5 — no automatic purchase request on prefill start', async () => {
    requireDb(dbUp);
    const { fx, item, ownerPhone } = await seedLowStockItem('pr-prefill-noauto');

    const before = await countPurchaseRequests(fx.factoryId);
    await workflowRouter.startWorkflowFromCommand(
      ownerPhone,
      buildPurchaseRequestCreateCommand(item.id),
    );
    const after = await countPurchaseRequests(fx.factoryId);
    expect(after).toBe(before);
  });

  it('6 — no inventory writes during prefill transport', async () => {
    requireDb(dbUp);
    const { fx, item, ownerPhone } = await seedLowStockItem('pr-prefill-noinv');

    const txBefore = await countInventoryTransactions(fx.factoryId);
    await workflowRouter.startWorkflowFromCommand(
      ownerPhone,
      buildPurchaseRequestCreateCommand(item.id),
    );
    const txAfter = await countInventoryTransactions(fx.factoryId);
    expect(txAfter).toBe(txBefore);
  });
});
