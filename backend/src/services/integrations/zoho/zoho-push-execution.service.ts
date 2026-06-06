import { Injectable, Logger } from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import { TASK_INVENTORY_REFERENCE_TYPE } from 'src/services/tasks/tasks.inventory.constants';
import { IntegrationRepository } from '../integration.repository';
import {
  INTEGRATION_CONNECTION_STATUS,
  INTEGRATION_PROVIDER,
  PUSH_DELIVERY_STATUS,
} from '../integration.constants';
import { IntegrationConnection, IntegrationPushDelivery } from '../integration.schema';
import { ZohoInventoryClient } from './zoho-inventory.client';
import { ZohoOAuthService } from './zoho-oauth.service';
import {
  computeNextRetryAt,
  MAX_PUSH_DELIVERY_ATTEMPTS,
} from './zoho-push-retry.constants';

export type PushExecutionOutcome =
  | { kind: 'delivered'; externalReference: string }
  | { kind: 'skipped_unmapped'; reason: string }
  | { kind: 'failed'; error: string; scheduleRetry: boolean; preserveRetryCount?: boolean }
  | { kind: 'terminal_failed'; error: string };

@Injectable()
export class ZohoPushExecutionService {
  private readonly logger = new Logger(ZohoPushExecutionService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly integrationRepository: IntegrationRepository,
    private readonly zohoInventoryClient: ZohoInventoryClient,
    private readonly zohoOAuthService: ZohoOAuthService,
  ) {}

  /**
   * Executes outbound Zoho push for an existing delivery row (R-Z06 — read-only ledger).
   */
  async executeForDelivery(
    delivery: IntegrationPushDelivery,
    options?: { transactionType?: string; verifyConnection?: boolean },
  ): Promise<PushExecutionOutcome> {
    const factoryId = delivery.factory_id;
    const inventoryTransactionId = delivery.inventory_transaction_id;
    const now = new Date();

    await this.integrationRepository.touchPushAttempt(delivery.id, factoryId, now);

    const connection = await this.integrationRepository.getConnection(
      delivery.connection_id,
      factoryId,
    );
    if (
      !connection ||
      connection.status !== INTEGRATION_CONNECTION_STATUS.ACTIVE ||
      connection.provider !== INTEGRATION_PROVIDER.ZOHO_INVENTORY
    ) {
      return {
        kind: 'failed',
        error: 'Integration connection is not active',
        scheduleRetry: false,
        preserveRetryCount: true,
      };
    }

    if (options?.verifyConnection !== false) {
      try {
        await this.zohoOAuthService.refreshConnectionIfNeeded(connection.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          kind: 'failed',
          error: `Token refresh failed: ${message}`,
          scheduleRetry: false,
          preserveRetryCount: true,
        };
      }
    }

    const ledgerRow = await this.dbService.sqlService.InventoryTransaction.findOne(
      {
        where: { id: inventoryTransactionId, factory_id: factoryId },
      },
    );
    if (!ledgerRow) {
      return {
        kind: 'terminal_failed',
        error: `Inventory transaction #${inventoryTransactionId} not found`,
      };
    }

    if (ledgerRow.reference_type !== TASK_INVENTORY_REFERENCE_TYPE) {
      return {
        kind: 'terminal_failed',
        error: `Inventory transaction #${inventoryTransactionId} is not a TASK movement`,
      };
    }

    const mapping = await this.integrationRepository.findMapping(factoryId, {
      connectionId: connection.id,
      inventoryItemId: ledgerRow.inventory_item_id,
    });
    if (!mapping) {
      return {
        kind: 'skipped_unmapped',
        reason: `No item mapping for inventory item #${ledgerRow.inventory_item_id}`,
      };
    }

    const transactionType = String(
      options?.transactionType ?? ledgerRow.transaction_type,
    ).trim();

    const refreshed = await this.integrationRepository.getConnection(
      connection.id,
      factoryId,
    );

    const result = await this.zohoInventoryClient.adjustStock({
      connection: refreshed ?? connection,
      externalItemId: mapping.external_id,
      quantity: ledgerRow.quantity,
      transactionType,
      referenceId: inventoryTransactionId,
    });

    if (result.success) {
      return { kind: 'delivered', externalReference: result.externalReference };
    }

    return {
      kind: 'failed',
      error: `[${result.code}] ${result.message}`,
      scheduleRetry: result.retryable,
    };
  }

  async applyExecutionOutcome(
    delivery: IntegrationPushDelivery,
    outcome: PushExecutionOutcome,
  ): Promise<IntegrationPushDelivery | null> {
    const factoryId = delivery.factory_id;

    if (outcome.kind === 'delivered') {
      return this.integrationRepository.markDelivered(
        delivery.id,
        factoryId,
        outcome.externalReference,
      );
    }

    if (outcome.kind === 'skipped_unmapped') {
      return this.integrationRepository.markSkippedUnmapped(
        delivery.id,
        factoryId,
        outcome.reason,
      );
    }

    if (outcome.kind === 'terminal_failed') {
      return this.integrationRepository.markFailedWithRetry(
        delivery.id,
        factoryId,
        outcome.error,
        {
          retryCount: MAX_PUSH_DELIVERY_ATTEMPTS,
          nextRetryAt: null,
        },
      );
    }

    if (outcome.preserveRetryCount) {
      return this.integrationRepository.markFailedWithRetry(
        delivery.id,
        factoryId,
        outcome.error,
        {
          retryCount: delivery.retry_count ?? 0,
          nextRetryAt: delivery.next_retry_at ?? null,
        },
      );
    }

    const nextRetryCount = (delivery.retry_count ?? 0) + 1;
    if (!outcome.scheduleRetry || nextRetryCount >= MAX_PUSH_DELIVERY_ATTEMPTS) {
      return this.integrationRepository.markFailedWithRetry(
        delivery.id,
        factoryId,
        outcome.error,
        {
          retryCount: Math.min(nextRetryCount, MAX_PUSH_DELIVERY_ATTEMPTS),
          nextRetryAt: null,
        },
      );
    }

    return this.integrationRepository.markFailedWithRetry(
      delivery.id,
      factoryId,
      outcome.error,
      {
        retryCount: nextRetryCount,
        nextRetryAt: computeNextRetryAt(nextRetryCount),
      },
    );
  }
}
