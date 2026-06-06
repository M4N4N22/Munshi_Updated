import { Injectable, Logger } from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import { DomainEvent } from 'src/services/domain-events/domain-events.schema';
import { ensurePushDelivery } from '../integration-push-delivery.helper';
import { IntegrationRepository } from '../integration.repository';
import { INTEGRATION_PROVIDER } from '../integration.constants';
import { ZohoPushExecutionService } from './zoho-push-execution.service';

export interface ZohoStockPushEventPayload {
  factory_id: number;
  inventory_transaction_id: number;
  task_id?: number;
  transaction_type?: string;
}

@Injectable()
export class ZohoStockPushHandler {
  private readonly logger = new Logger(ZohoStockPushHandler.name);

  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly pushExecution: ZohoPushExecutionService,
  ) {}

  /**
   * Processes ZOHO_STOCK_PUSH_REQUESTED — outbound Zoho push only (R-Z06).
   */
  async handle(event: DomainEvent): Promise<void> {
    const payload = (event.payload ?? {}) as Partial<ZohoStockPushEventPayload>;
    const factoryId = Number(payload.factory_id ?? event.factory_id);
    const inventoryTransactionId = Number(payload.inventory_transaction_id);

    if (!factoryId || !Number.isFinite(factoryId)) {
      this.logger.warn(`Domain event ${event.id} missing factory_id`);
      return;
    }
    if (!inventoryTransactionId || !Number.isFinite(inventoryTransactionId)) {
      this.logger.warn(`Domain event ${event.id} missing inventory_transaction_id`);
      return;
    }

    const connection =
      await this.integrationRepository.findActiveConnectionByProvider(
        factoryId,
        INTEGRATION_PROVIDER.ZOHO_INVENTORY,
      );
    if (!connection) {
      this.logger.debug(
        `Factory #${factoryId} has no active Zoho connection — skipping push for event ${event.id}`,
      );
      return;
    }

    const { delivery, created } = await ensurePushDelivery(
      this.integrationRepository,
      {
        factoryId,
        connectionId: connection.id,
        inventoryTransactionId,
      },
    );
    if (!created) {
      this.logger.debug(
        `Push delivery already registered for connection #${connection.id} txn #${inventoryTransactionId} — skip`,
      );
      return;
    }

    const outcome = await this.pushExecution.executeForDelivery(delivery, {
      transactionType: payload.transaction_type,
    });
    await this.pushExecution.applyExecutionOutcome(delivery, outcome);
  }
}
