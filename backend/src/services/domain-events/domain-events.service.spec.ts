import { DomainEventsService } from './domain-events.service';
import { DOMAIN_EVENT_TYPE } from './domain-events.constants';
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
});
