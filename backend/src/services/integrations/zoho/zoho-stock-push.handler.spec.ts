import { ZohoStockPushHandler } from './zoho-stock-push.handler';
import { ZohoPushExecutionService } from './zoho-push-execution.service';
import { IntegrationRepository } from '../integration.repository';
import { DomainEvent } from 'src/services/domain-events/domain-events.schema';
import { PUSH_DELIVERY_STATUS } from '../integration.constants';

describe('ZohoStockPushHandler', () => {
  let handler: ZohoStockPushHandler;
  let integrationRepository: jest.Mocked<
    Pick<
      IntegrationRepository,
      'findActiveConnectionByProvider' | 'findDelivery' | 'createDelivery'
    >
  >;
  let pushExecution: jest.Mocked<
    Pick<ZohoPushExecutionService, 'executeForDelivery' | 'applyExecutionOutcome'>
  >;
  let fullRepository: IntegrationRepository;

  beforeEach(() => {
    integrationRepository = {
      findActiveConnectionByProvider: jest.fn().mockResolvedValue({
        id: 5,
        factory_id: 10,
      }),
      findDelivery: jest.fn().mockResolvedValue(null),
      createDelivery: jest.fn().mockResolvedValue({
        id: 1,
        status: PUSH_DELIVERY_STATUS.PENDING,
        factory_id: 10,
        connection_id: 5,
        inventory_transaction_id: 99,
        retry_count: 0,
      }),
    };

    fullRepository = {
      ...integrationRepository,
    } as unknown as IntegrationRepository;

    pushExecution = {
      executeForDelivery: jest.fn().mockResolvedValue({
        kind: 'delivered',
        externalReference: 'adj-123',
      }),
      applyExecutionOutcome: jest.fn().mockResolvedValue({
        status: PUSH_DELIVERY_STATUS.DELIVERED,
      }),
    };

    handler = new ZohoStockPushHandler(
      fullRepository,
      pushExecution as unknown as ZohoPushExecutionService,
    );
  });

  function event(payload: Record<string, unknown>): DomainEvent {
    return {
      id: 1,
      factory_id: 10,
      event_type: 'zoho.stock_push.requested',
      payload,
    } as DomainEvent;
  }

  it('executes push for new delivery', async () => {
    await handler.handle(
      event({
        factory_id: 10,
        inventory_transaction_id: 99,
        transaction_type: 'STOCK_OUT',
      }),
    );

    expect(pushExecution.executeForDelivery).toHaveBeenCalled();
    expect(pushExecution.applyExecutionOutcome).toHaveBeenCalled();
  });

  it('skips duplicate delivery registration', async () => {
    (fullRepository.findDelivery as jest.Mock).mockResolvedValue({
      id: 7,
      status: PUSH_DELIVERY_STATUS.DELIVERED,
    });

    await handler.handle(
      event({
        factory_id: 10,
        inventory_transaction_id: 99,
      }),
    );

    expect(pushExecution.executeForDelivery).not.toHaveBeenCalled();
  });
});
