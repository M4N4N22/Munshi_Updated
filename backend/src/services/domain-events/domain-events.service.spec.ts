import { DomainEventsService } from './domain-events.service';
import {
  DOMAIN_EVENT_STATUS,
  DOMAIN_EVENT_TYPE,
} from './domain-events.constants';
import { ZohoStockPushHandler } from '../integrations/zoho/zoho-stock-push.handler';
import { InventoryLowStockAlertHandler } from '../inventory/inventory-low-stock-alert.handler';
import { IntegrationSyncFailedAlertHandler } from '../integrations/integration-sync-failed-alert.handler';
import { DbService } from 'src/core/services/db-service/db.service';

describe('DomainEventsService dispatch', () => {
  it('routes ZOHO_STOCK_PUSH_REQUESTED to ZohoStockPushHandler', async () => {
    const handler = { handle: jest.fn().mockResolvedValue(undefined) };
    const model = {
      findAll: jest.fn().mockResolvedValue([
        {
          id: 1,
          status: DOMAIN_EVENT_STATUS.PENDING,
          attempts: 0,
          event_type: DOMAIN_EVENT_TYPE.ZOHO_STOCK_PUSH_REQUESTED,
          update: jest.fn().mockResolvedValue(undefined),
        },
      ]),
    };
    const dbService = {
      sqlService: { DomainEvent: model },
    } as unknown as DbService;

    const service = new DomainEventsService(
      dbService,
      handler as unknown as ZohoStockPushHandler,
    );

    await service.processPendingBatch(1);

    expect(handler.handle).toHaveBeenCalledTimes(1);
  });

  it('routes INVENTORY_LOW_STOCK to InventoryLowStockAlertHandler', async () => {
    const handler = { handle: jest.fn().mockResolvedValue(undefined) };
    const model = {
      findAll: jest.fn().mockResolvedValue([
        {
          id: 2,
          status: DOMAIN_EVENT_STATUS.PENDING,
          attempts: 0,
          event_type: DOMAIN_EVENT_TYPE.INVENTORY_LOW_STOCK,
          update: jest.fn().mockResolvedValue(undefined),
        },
      ]),
    };
    const dbService = {
      sqlService: { DomainEvent: model },
    } as unknown as DbService;

    const service = new DomainEventsService(
      dbService,
      undefined,
      handler as unknown as InventoryLowStockAlertHandler,
    );

    await service.processPendingBatch(1);

    expect(handler.handle).toHaveBeenCalledTimes(1);
  });

  it('routes INTEGRATION_SYNC_FAILED to IntegrationSyncFailedAlertHandler', async () => {
    const handler = { handle: jest.fn().mockResolvedValue(undefined) };
    const model = {
      findAll: jest.fn().mockResolvedValue([
        {
          id: 3,
          status: DOMAIN_EVENT_STATUS.PENDING,
          attempts: 0,
          event_type: DOMAIN_EVENT_TYPE.INTEGRATION_SYNC_FAILED,
          update: jest.fn().mockResolvedValue(undefined),
        },
      ]),
    };
    const dbService = {
      sqlService: { DomainEvent: model },
    } as unknown as DbService;

    const service = new DomainEventsService(
      dbService,
      undefined,
      undefined,
      handler as unknown as IntegrationSyncFailedAlertHandler,
    );

    await service.processPendingBatch(1);

    expect(handler.handle).toHaveBeenCalledTimes(1);
  });

  it('processEventById dispatches a single pending event', async () => {
    const handler = { handle: jest.fn().mockResolvedValue(undefined) };
    const row = {
      id: 9,
      status: DOMAIN_EVENT_STATUS.PENDING,
      event_type: DOMAIN_EVENT_TYPE.INVENTORY_LOW_STOCK,
      attempts: 0,
      update: jest.fn().mockResolvedValue(undefined),
    };
    const model = {
      findByPk: jest.fn().mockResolvedValue(row),
      findAll: jest.fn(),
    };
    const dbService = {
      sqlService: { DomainEvent: model },
    } as unknown as DbService;

    const service = new DomainEventsService(
      dbService,
      undefined,
      handler as unknown as InventoryLowStockAlertHandler,
    );

    const ok = await service.processEventById(9);

    expect(ok).toBe(true);
    expect(handler.handle).toHaveBeenCalledTimes(1);
    expect(row.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: DOMAIN_EVENT_STATUS.COMPLETED }),
    );
  });
});
