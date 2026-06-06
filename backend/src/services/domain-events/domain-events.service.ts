import { Injectable, Logger, Optional } from '@nestjs/common';
import { Op } from 'sequelize';
import { DbService } from 'src/core/services/db-service/db.service';
import { DOMAIN_EVENT_STATUS, DOMAIN_EVENT_TYPE } from './domain-events.constants';
import { DomainEvent } from './domain-events.schema';
import { ZohoStockPushHandler } from '../integrations/zoho/zoho-stock-push.handler';
import { InventoryLowStockAlertHandler } from '../inventory/inventory-low-stock-alert.handler';
import { IntegrationSyncFailedAlertHandler } from '../integrations/integration-sync-failed-alert.handler';

export interface PublishDomainEventInput {
  factory_id?: number;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload?: Record<string, unknown>;
  scheduled_at?: Date;
}

const MAX_ATTEMPTS = 5;

@Injectable()
export class DomainEventsService {
  private readonly logger = new Logger(DomainEventsService.name);
  private readonly model: typeof DomainEvent;

  constructor(
    private readonly dbService: DbService,
    @Optional() private readonly zohoStockPushHandler?: ZohoStockPushHandler,
    @Optional()
    private readonly inventoryLowStockAlertHandler?: InventoryLowStockAlertHandler,
    @Optional()
    private readonly integrationSyncFailedAlertHandler?: IntegrationSyncFailedAlertHandler,
  ) {
    this.model = this.dbService.sqlService.DomainEvent;
  }

  async publish(input: PublishDomainEventInput): Promise<DomainEvent> {
    return this.model.create({
      factory_id: input.factory_id ?? null,
      event_type: input.event_type,
      aggregate_type: input.aggregate_type,
      aggregate_id: String(input.aggregate_id),
      payload: input.payload ?? {},
      status: DOMAIN_EVENT_STATUS.PENDING,
      scheduled_at: input.scheduled_at ?? new Date(),
    } as any);
  }

  /**
   * Process pending events (outbox worker). Handlers are registered incrementally in P1+.
   */
  async processPendingBatch(limit = 50): Promise<number> {
    const now = new Date();
    const rows = await this.model.findAll({
      where: {
        status: DOMAIN_EVENT_STATUS.PENDING,
        scheduled_at: { [Op.lte]: now },
      },
      order: [['id', 'ASC']],
      limit,
    });

    let processed = 0;
    for (const row of rows) {
      await row.update({ status: DOMAIN_EVENT_STATUS.PROCESSING });
      try {
        await this.dispatch(row);
        await row.update({
          status: DOMAIN_EVENT_STATUS.COMPLETED,
          processed_at: new Date(),
          last_error: null,
        });
        processed += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const attempts = row.attempts + 1;
        const failed = attempts >= MAX_ATTEMPTS;
        await row.update({
          status: failed
            ? DOMAIN_EVENT_STATUS.FAILED
            : DOMAIN_EVENT_STATUS.PENDING,
          attempts,
          last_error: message.slice(0, 2000),
        });
        this.logger.warn(
          `Domain event ${row.id} (${row.event_type}) attempt ${attempts}: ${message}`,
        );
      }
    }
    return processed;
  }

  private async dispatch(event: DomainEvent): Promise<void> {
    if (event.event_type === DOMAIN_EVENT_TYPE.ZOHO_STOCK_PUSH_REQUESTED) {
      if (!this.zohoStockPushHandler) {
        this.logger.warn(
          `Domain event ${event.id} (${event.event_type}) has no handler wired`,
        );
        return;
      }
      await this.zohoStockPushHandler.handle(event);
      return;
    }

    if (event.event_type === DOMAIN_EVENT_TYPE.INVENTORY_LOW_STOCK) {
      if (!this.inventoryLowStockAlertHandler) {
        this.logger.warn(
          `Domain event ${event.id} (${event.event_type}) has no handler wired`,
        );
        return;
      }
      await this.inventoryLowStockAlertHandler.handle(event);
      return;
    }

    if (event.event_type === DOMAIN_EVENT_TYPE.INTEGRATION_SYNC_FAILED) {
      if (!this.integrationSyncFailedAlertHandler) {
        this.logger.warn(
          `Domain event ${event.id} (${event.event_type}) has no handler wired`,
        );
        return;
      }
      await this.integrationSyncFailedAlertHandler.handle(event);
      return;
    }

    this.logger.debug(
      `Domain event ${event.id} ${event.event_type} aggregate=${event.aggregate_type}:${event.aggregate_id} (no handler)`,
    );
  }
}
