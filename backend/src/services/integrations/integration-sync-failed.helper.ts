import { DOMAIN_EVENT_TYPE } from 'src/services/domain-events/domain-events.constants';
import { DomainEventsService } from 'src/services/domain-events/domain-events.service';
import { DbService } from 'src/core/services/db-service/db.service';

export const SYNC_FAILED_AGGREGATE_TYPE = {
  SYNC_RUN: 'integration_sync_run',
  PUSH_DELIVERY: 'integration_push_delivery',
} as const;

export type IntegrationSyncFailedDirection = 'pull' | 'push';

export type IntegrationSyncFailedPayload = {
  factory_id: number;
  provider: string;
  direction: IntegrationSyncFailedDirection;
  connection_id: number;
  sync_run_id: number | null;
  delivery_id: number | null;
  error_summary: string;
  occurred_at: string;
};

export function buildIntegrationSyncFailedPayload(params: {
  factoryId: number;
  provider: string;
  direction: IntegrationSyncFailedDirection;
  connectionId: number;
  syncRunId?: number | null;
  deliveryId?: number | null;
  errorSummary: string;
  occurredAt?: Date;
}): IntegrationSyncFailedPayload {
  return {
    factory_id: params.factoryId,
    provider: params.provider,
    direction: params.direction,
    connection_id: params.connectionId,
    sync_run_id: params.syncRunId ?? null,
    delivery_id: params.deliveryId ?? null,
    error_summary: params.errorSummary.slice(0, 500),
    occurred_at: (params.occurredAt ?? new Date()).toISOString(),
  };
}

/**
 * Publishes integration.sync_failed with dedup by aggregate (sync_run_id or delivery_id).
 */
export async function publishIntegrationSyncFailedEvent(
  domainEventsService: DomainEventsService | undefined,
  dbService: DbService,
  params: {
    aggregateType: string;
    aggregateId: string;
    payload: IntegrationSyncFailedPayload;
  },
): Promise<void> {
  if (!domainEventsService) {
    return;
  }

  const existing = await dbService.sqlService.DomainEvent.findOne({
    where: {
      event_type: DOMAIN_EVENT_TYPE.INTEGRATION_SYNC_FAILED,
      aggregate_type: params.aggregateType,
      aggregate_id: params.aggregateId,
    },
  });
  if (existing) {
    return;
  }

  await domainEventsService.publish({
    factory_id: params.payload.factory_id,
    event_type: DOMAIN_EVENT_TYPE.INTEGRATION_SYNC_FAILED,
    aggregate_type: params.aggregateType,
    aggregate_id: params.aggregateId,
    payload: params.payload,
  });
}
