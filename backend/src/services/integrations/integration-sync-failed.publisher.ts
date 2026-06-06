import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import { DomainEventsService } from 'src/services/domain-events/domain-events.service';
import { INTEGRATION_PROVIDER } from './integration.constants';
import {
  buildIntegrationSyncFailedPayload,
  publishIntegrationSyncFailedEvent,
  SYNC_FAILED_AGGREGATE_TYPE,
  IntegrationSyncFailedDirection,
} from './integration-sync-failed.helper';

@Injectable()
export class IntegrationSyncFailedPublisher {
  private readonly logger = new Logger(IntegrationSyncFailedPublisher.name);

  constructor(
    private readonly dbService: DbService,
    @Inject(forwardRef(() => DomainEventsService))
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async publishPullSyncFailure(params: {
    factoryId: number;
    connectionId: number;
    syncRunId: number;
    provider?: string;
    errorSummary: string;
  }): Promise<void> {
    try {
      await publishIntegrationSyncFailedEvent(
        this.domainEventsService,
        this.dbService,
        {
          aggregateType: SYNC_FAILED_AGGREGATE_TYPE.SYNC_RUN,
          aggregateId: String(params.syncRunId),
          payload: buildIntegrationSyncFailedPayload({
            factoryId: params.factoryId,
            provider: params.provider ?? INTEGRATION_PROVIDER.ZOHO_INVENTORY,
            direction: 'pull',
            connectionId: params.connectionId,
            syncRunId: params.syncRunId,
            errorSummary: params.errorSummary,
          }),
        },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Failed to publish integration.sync_failed for sync run #${params.syncRunId}: ${message}`,
      );
    }
  }

  async publishPushDeliveryFailure(params: {
    factoryId: number;
    connectionId: number;
    deliveryId: number;
    provider?: string;
    errorSummary: string;
  }): Promise<void> {
    try {
      await publishIntegrationSyncFailedEvent(
        this.domainEventsService,
        this.dbService,
        {
          aggregateType: SYNC_FAILED_AGGREGATE_TYPE.PUSH_DELIVERY,
          aggregateId: String(params.deliveryId),
          payload: buildIntegrationSyncFailedPayload({
            factoryId: params.factoryId,
            provider: params.provider ?? INTEGRATION_PROVIDER.ZOHO_INVENTORY,
            direction: 'push',
            connectionId: params.connectionId,
            deliveryId: params.deliveryId,
            errorSummary: params.errorSummary,
          }),
        },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Failed to publish integration.sync_failed for delivery #${params.deliveryId}: ${message}`,
      );
    }
  }
}

export function formatSyncFailedDirectionLabel(
  direction: IntegrationSyncFailedDirection,
): string {
  return direction === 'pull' ? 'Pull Sync' : 'Push Sync';
}

export function formatSyncFailedProviderLabel(provider: string): string {
  if (provider === INTEGRATION_PROVIDER.ZOHO_INVENTORY) {
    return 'Zoho';
  }
  return provider;
}
