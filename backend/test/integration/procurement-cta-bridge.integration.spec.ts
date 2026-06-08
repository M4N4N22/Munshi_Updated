/**
 * Procurement CTA bridge — low stock alert → purchase request workflow.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import axios from 'axios';
import { DbModule } from 'src/core/services/db-service/db.module';
import { DbService } from 'src/core/services/db-service/db.service';
import { UserModule } from 'src/services/users/users.module';
import { InventoryModule } from 'src/services/inventory/inventory.module';
import { DomainEventsModule } from 'src/services/domain-events/domain-events.module';
import { DOMAIN_EVENT_TYPE } from 'src/services/domain-events/domain-events.constants';
import { InventoryLowStockAlertHandler } from 'src/services/inventory/inventory-low-stock-alert.handler';
import { LowStockAlertContextService } from 'src/services/inventory/low-stock-alert-context.service';
import { MessagingModule } from 'src/core/messaging/messaging.module';
import { MessagingService } from 'src/core/messaging/messaging.service';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { InventoryTransactionService } from 'src/services/inventory/inventory-transaction.service';
import { WorkflowModule } from 'src/services/workflow/workflow.module';
import { WorkflowRouterService } from 'src/services/workflow/workflow-engine.service';
import { WorkflowSessionService } from 'src/services/workflow/workflow-session.service';
import { PURCHASE_REQUEST_STATUS } from 'src/services/purchase-requests/purchase-requests.constants';
import {
  LOW_STOCK_ALERT_CONTEXT_TTL_MS,
  LOW_STOCK_CTA_USER_MESSAGES,
} from 'src/services/inventory/low-stock-alert-context.constants';
import { buildPurchaseRequestCreateCommand } from 'src/services/purchase-requests/purchase-request-prefill.helper';
import { WA_LOW_STOCK_PURCHASE_BUTTON_TITLE } from 'src/core/messaging/inventory-low-stock-outbound';
import { parseWhatsAppInbound } from 'src/modules/whatsapp/whatsapp-inbound.parser';
import { WhatsAppModule } from 'src/modules/whatsapp/whatsapp.module';
import { WhatsAppService } from 'src/modules/whatsapp/whatsapp.service';
import {
  createInventoryItemWithStock,
  seedPhase0Fixture,
} from './helpers/phase0-fixtures';
import { migrationStatusJson, probePostgres, runMigrations } from './helpers/db-env';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

function requireDb(dbUp: boolean): void {
  if (!dbUp) {
    throw new Error('NOT VERIFIED: Postgres unavailable');
  }
}

describe('Procurement CTA bridge integration', () => {
  let dbUp = false;
  let app: INestApplication;
  let dbService: DbService;
  let inventoryService: InventoryService;
  let inventoryTransactionService: InventoryTransactionService;
  let messagingService: MessagingService;
  let alertHandler: InventoryLowStockAlertHandler;
  let contextService: LowStockAlertContextService;
  let workflowRouter: WorkflowRouterService;
  let workflowSessionService: WorkflowSessionService;
  let whatsappService: WhatsAppService;

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
        WhatsAppModule,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    dbService = module.get(DbService);
    inventoryService = module.get(InventoryService);
    inventoryTransactionService = module.get(InventoryTransactionService);
    messagingService = module.get(MessagingService);
    alertHandler = module.get(InventoryLowStockAlertHandler);
    contextService = module.get(LowStockAlertContextService);
    workflowRouter = module.get(WorkflowRouterService);
    workflowSessionService = module.get(WorkflowSessionService);
    whatsappService = module.get(WhatsAppService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    mockedAxios.post.mockReset();
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

  async function triggerLowStockAlert(
    fx: { factoryId: number; ownerId: number },
    item: { id: number },
  ) {
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
    return event!;
  }

  it('scenario A — button_reply.id starts workflow without ML', async () => {
    requireDb(dbUp);
    const { item, ownerPhone } = await seedLowStockItem('cta-a');
    const command = buildPurchaseRequestCreateCommand(item.id);
    const inbound = parseWhatsAppInbound({
      data: {
        type: 'interactive',
        from: ownerPhone,
        interactive: {
          type: 'button_reply',
          button_reply: { id: command, title: WA_LOW_STOCK_PURCHASE_BUTTON_TITLE },
        },
      },
    });
    expect(inbound?.kind).toBe('text');
    if (inbound?.kind !== 'text') return;

    jest.spyOn(messagingService, 'sendText').mockResolvedValue(undefined);
    const mlSpy = mockedAxios.post;

    const result = await whatsappService.handleIncomingMessage({
      from: inbound.from,
      message: inbound.message,
    });

    expect(result).toBe('ok');
    expect(mlSpy).not.toHaveBeenCalled();
    const session = await workflowSessionService.resolveActiveSession(ownerPhone);
    expect(session.session).toBeTruthy();
    expect(session.session!.session_data.inventory_item_id).toBe(item.id);
    expect(session.session!.session_data.prefill_pending_confirm).toBe(true);
  });

  it('scenario B — title-only Purchase karein uses context cache', async () => {
    requireDb(dbUp);
    const { fx, item, ownerPhone } = await seedLowStockItem('cta-b');
    jest.spyOn(messagingService, 'sendInteractiveButtons').mockResolvedValue(undefined);
    await triggerLowStockAlert(fx, item);

    const active = await contextService.listActiveDistinct(ownerPhone);
    expect(active.some((c) => c.inventory_item_id === item.id)).toBe(true);

    jest.spyOn(messagingService, 'sendText').mockResolvedValue(undefined);
    const mlSpy = mockedAxios.post;

    await whatsappService.handleIncomingMessage({
      from: ownerPhone,
      message: WA_LOW_STOCK_PURCHASE_BUTTON_TITLE,
    });

    expect(mlSpy).not.toHaveBeenCalled();
    const session = await workflowSessionService.resolveActiveSession(ownerPhone);
    expect(session.session!.session_data.inventory_item_id).toBe(item.id);
  });

  it('scenario C — button_reply.id wins over title text', async () => {
    requireDb(dbUp);
    const { item, ownerPhone } = await seedLowStockItem('cta-c');
    const command = buildPurchaseRequestCreateCommand(item.id);
    const inbound = parseWhatsAppInbound({
      data: {
        type: 'interactive',
        from: ownerPhone,
        text: WA_LOW_STOCK_PURCHASE_BUTTON_TITLE,
        interactive: {
          type: 'button_reply',
          button_reply: { id: command, title: WA_LOW_STOCK_PURCHASE_BUTTON_TITLE },
        },
      },
    });
    expect(inbound).toEqual({ kind: 'text', from: ownerPhone, message: command });
  });

  it('scenario D — multiple active alerts prompt disambiguation', async () => {
    requireDb(dbUp);
    const { fx, ownerPhone } = await seedLowStockItem('cta-d-base');
    jest.spyOn(messagingService, 'sendInteractiveButtons').mockResolvedValue(undefined);
    jest.spyOn(messagingService, 'sendText').mockResolvedValue(undefined);

    for (const name of ['Cement', 'Steel', 'Bolts']) {
      const item = await createInventoryItemWithStock(
        inventoryService,
        inventoryTransactionService,
        fx,
        `cta-d-${name}`,
        '10',
        fx.ownerId,
      );
      await inventoryService.updateItem(item.id, fx.factoryId, {
        reorder_threshold: '10',
      });
      await triggerLowStockAlert(fx, item);
    }

    const resolution = await contextService.resolveCtaTitle(ownerPhone);
    expect(resolution.kind).toBe('disambiguation');

    const sendSpy = jest.spyOn(messagingService, 'sendText');
    await whatsappService.handleIncomingMessage({
      from: ownerPhone,
      message: WA_LOW_STOCK_PURCHASE_BUTTON_TITLE,
    });
    expect(sendSpy).toHaveBeenCalled();
    const prompt = String(sendSpy.mock.calls.at(-1)?.[1] ?? '');
    expect(prompt).toContain('multiple low-stock items');
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('scenario E — expired context returns expiry message', async () => {
    requireDb(dbUp);
    const { ownerPhone } = await seedLowStockItem('cta-e');
    const expiredAt = new Date(Date.now() - 1000);
    const alertSentAt = new Date(
      expiredAt.getTime() - LOW_STOCK_ALERT_CONTEXT_TTL_MS,
    );
    await dbService.sqlService.LowStockAlertContext.create({
      phone_number: ownerPhone,
      factory_id: 1,
      inventory_item_id: 999001,
      inventory_item_name: 'Expired',
      alert_sent_at: alertSentAt,
      expires_at: expiredAt,
    });

    const sendSpy = jest.spyOn(messagingService, 'sendText').mockResolvedValue(undefined);
    await whatsappService.handleIncomingMessage({
      from: ownerPhone,
      message: WA_LOW_STOCK_PURCHASE_BUTTON_TITLE,
    });
    expect(String(sendSpy.mock.calls.at(-1)?.[1])).toContain(
      LOW_STOCK_CTA_USER_MESSAGES.EXPIRED,
    );
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('scenario F — no context returns manual fallback', async () => {
    requireDb(dbUp);
    const { ownerPhone } = await seedLowStockItem('cta-f');
    await dbService.sqlService.LowStockAlertContext.destroy({
      where: { phone_number: ownerPhone },
    });

    const sendSpy = jest.spyOn(messagingService, 'sendText').mockResolvedValue(undefined);
    await whatsappService.handleIncomingMessage({
      from: ownerPhone,
      message: WA_LOW_STOCK_PURCHASE_BUTTON_TITLE,
    });
    expect(String(sendSpy.mock.calls.at(-1)?.[1])).toContain(
      LOW_STOCK_CTA_USER_MESSAGES.NONE,
    );
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('UAT — alert → Purchase karein → YES creates purchase request', async () => {
    requireDb(dbUp);
    const { fx, item, ownerPhone } = await seedLowStockItem('cta-uat');
    jest.spyOn(messagingService, 'sendInteractiveButtons').mockResolvedValue(undefined);
    jest.spyOn(messagingService, 'sendText').mockResolvedValue(undefined);
    await triggerLowStockAlert(fx, item);

    await whatsappService.handleIncomingMessage({
      from: ownerPhone,
      message: WA_LOW_STOCK_PURCHASE_BUTTON_TITLE,
    });

    const sessionBefore =
      await workflowSessionService.resolveActiveSession(ownerPhone);
    expect(sessionBefore.session!.session_data.prefill_pending_confirm).toBe(true);

    const prBefore = await dbService.sqlService.PurchaseRequest.count({
      where: { factory_id: fx.factoryId },
    });

    await whatsappService.handleIncomingMessage({
      from: ownerPhone,
      message: 'YES',
    });

    const prAfter = await dbService.sqlService.PurchaseRequest.count({
      where: { factory_id: fx.factoryId },
    });
    expect(prAfter).toBe(prBefore + 1);

    const sessionAfter =
      await workflowSessionService.resolveActiveSession(ownerPhone);
    expect(sessionAfter.session!.current_step).toBe('APPROVAL');

    const prId = sessionAfter.session!.session_data.purchase_request_id as number;
    const pr = await dbService.sqlService.PurchaseRequest.findByPk(prId);
    expect(pr!.status).toBe(PURCHASE_REQUEST_STATUS.PENDING_APPROVAL);
  });
});
