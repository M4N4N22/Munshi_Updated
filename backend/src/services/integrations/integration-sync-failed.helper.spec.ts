import { DOMAIN_EVENT_TYPE } from 'src/services/domain-events/domain-events.constants';
import {
  buildIntegrationSyncFailedPayload,
  publishIntegrationSyncFailedEvent,
  SYNC_FAILED_AGGREGATE_TYPE,
} from './integration-sync-failed.helper';

describe('integration-sync-failed.helper', () => {
  it('builds minimal payload', () => {
    const payload = buildIntegrationSyncFailedPayload({
      factoryId: 1,
      provider: 'zoho_inventory',
      direction: 'pull',
      connectionId: 5,
      syncRunId: 99,
      errorSummary: 'Token expired',
    });
    expect(payload.factory_id).toBe(1);
    expect(payload.sync_run_id).toBe(99);
    expect(payload.delivery_id).toBeNull();
    expect(payload.error_summary).toBe('Token expired');
  });

  it('dedupes by aggregate id', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const publish = jest.fn();
    const dbService = {
      sqlService: { DomainEvent: { findOne } },
    } as any;
    const domainEventsService = { publish } as any;

    await publishIntegrationSyncFailedEvent(domainEventsService, dbService, {
      aggregateType: SYNC_FAILED_AGGREGATE_TYPE.SYNC_RUN,
      aggregateId: '42',
      payload: buildIntegrationSyncFailedPayload({
        factoryId: 1,
        provider: 'zoho_inventory',
        direction: 'pull',
        connectionId: 2,
        syncRunId: 42,
        errorSummary: 'fail',
      }),
    });

    expect(findOne).toHaveBeenCalledWith({
      where: {
        event_type: DOMAIN_EVENT_TYPE.INTEGRATION_SYNC_FAILED,
        aggregate_type: SYNC_FAILED_AGGREGATE_TYPE.SYNC_RUN,
        aggregate_id: '42',
      },
    });
    expect(publish).toHaveBeenCalledTimes(1);

    findOne.mockResolvedValue({ id: 99 });
    await publishIntegrationSyncFailedEvent(domainEventsService, dbService, {
      aggregateType: SYNC_FAILED_AGGREGATE_TYPE.SYNC_RUN,
      aggregateId: '42',
      payload: buildIntegrationSyncFailedPayload({
        factoryId: 1,
        provider: 'zoho_inventory',
        direction: 'pull',
        connectionId: 2,
        syncRunId: 42,
        errorSummary: 'fail again',
      }),
    });
    expect(publish).toHaveBeenCalledTimes(1);
  });
});
