import { DomainEventsService } from './domain-events.service';
import { DOMAIN_EVENT_TYPE } from './domain-events.constants';
import { ZohoStockPushHandler } from '../integrations/zoho/zoho-stock-push.handler';
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
});
