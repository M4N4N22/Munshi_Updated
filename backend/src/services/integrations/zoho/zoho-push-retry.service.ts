import { Injectable, Logger } from '@nestjs/common';
import { IntegrationAuthValidationService } from '../integration-auth.validation';
import { IntegrationRepository } from '../integration.repository';
import { IntegrationPushDelivery } from '../integration.schema';
import { PUSH_DELIVERY_STATUS } from '../integration.constants';
import { ZohoPushExecutionService } from './zoho-push-execution.service';
import { isZohoPushRetryEnabled } from './zoho-push-retry.constants';

export type PushDeliverySummary = {
  id: number;
  connection_id: number;
  factory_id: number;
  inventory_transaction_id: number;
  status: string;
  zoho_reference: string | null;
  last_error: string | null;
  retry_count: number;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class ZohoPushRetryService {
  private readonly logger = new Logger(ZohoPushRetryService.name);

  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly pushExecution: ZohoPushExecutionService,
    private readonly authValidation: IntegrationAuthValidationService,
  ) {}

  async runRetryBatch(limit = 50): Promise<{ processed: number; delivered: number; failed: number }> {
    if (!isZohoPushRetryEnabled()) {
      return { processed: 0, delivered: 0, failed: 0 };
    }

    const due = await this.integrationRepository.listFailedDeliveriesDueRetry(limit);
    let delivered = 0;
    let failed = 0;

    for (const row of due) {
      const result = await this.retryDelivery(row);
      if (result === 'delivered') {
        delivered += 1;
      } else if (result === 'failed') {
        failed += 1;
      }
    }

    return { processed: due.length, delivered, failed };
  }

  async retryDelivery(delivery: IntegrationPushDelivery): Promise<
    'delivered' | 'failed' | 'skipped' | 'unchanged'
  > {
    if (delivery.status === PUSH_DELIVERY_STATUS.DELIVERED) {
      return 'unchanged';
    }
    if (delivery.status === PUSH_DELIVERY_STATUS.SKIPPED_UNMAPPED) {
      return 'unchanged';
    }
    if (delivery.status !== PUSH_DELIVERY_STATUS.FAILED) {
      return 'unchanged';
    }

    const outcome = await this.pushExecution.executeForDelivery(delivery);
    const updated = await this.pushExecution.applyExecutionOutcome(delivery, outcome);
    if (!updated) {
      return 'failed';
    }

    if (updated.status === PUSH_DELIVERY_STATUS.DELIVERED) {
      return 'delivered';
    }
    if (updated.status === PUSH_DELIVERY_STATUS.SKIPPED_UNMAPPED) {
      return 'skipped';
    }
    return 'failed';
  }

  async listPushDeliveriesForFactory(
    factoryId: number,
    userId: number,
    connectionId?: number,
  ): Promise<PushDeliverySummary[]> {
    await this.authValidation.assertCanManageIntegrations(factoryId, userId);
    const rows = await this.integrationRepository.listDeliveries(factoryId, {
      connectionId,
    });
    return rows.map((row) => this.toSummary(row));
  }

  private toSummary(row: IntegrationPushDelivery): PushDeliverySummary {
    return {
      id: row.id,
      connection_id: row.connection_id,
      factory_id: row.factory_id,
      inventory_transaction_id: row.inventory_transaction_id,
      status: row.status,
      zoho_reference: row.zoho_reference ?? null,
      last_error: row.last_error ?? null,
      retry_count: row.retry_count ?? 0,
      last_attempt_at: row.last_attempt_at?.toISOString() ?? null,
      next_retry_at: row.next_retry_at?.toISOString() ?? null,
      delivered_at: row.delivered_at?.toISOString() ?? null,
      created_at: (row as any).created_at?.toISOString?.() ?? '',
      updated_at: (row as any).updated_at?.toISOString?.() ?? '',
    };
  }
}
