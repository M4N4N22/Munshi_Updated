import { DomainEventsService } from '../domain-events/domain-events.service';
import { DOMAIN_EVENT_TYPE } from '../domain-events/domain-events.constants';
import { TaskInventoryMovementCaptured } from './tasks.inventory.helper';

const STOCK_PUSH_AGGREGATE_TYPE = 'inventory_transaction';

export interface PublishZohoStockPushRequestedEventsParams {
  domainEventsService: DomainEventsService;
  factoryId: number;
  taskId: number;
  movements: TaskInventoryMovementCaptured[];
}

/**
 * Persists ZOHO_STOCK_PUSH_REQUESTED domain events after task completion commit.
 * Call only outside the task completion transaction (R-P05-02).
 */
export async function publishZohoStockPushRequestedEvents(
  params: PublishZohoStockPushRequestedEventsParams,
): Promise<void> {
  for (const movement of params.movements) {
    await params.domainEventsService.publish({
      factory_id: params.factoryId,
      event_type: DOMAIN_EVENT_TYPE.ZOHO_STOCK_PUSH_REQUESTED,
      aggregate_type: STOCK_PUSH_AGGREGATE_TYPE,
      aggregate_id: String(movement.inventory_transaction_id),
      payload: {
        factory_id: params.factoryId,
        inventory_transaction_id: movement.inventory_transaction_id,
        task_id: params.taskId,
        transaction_type: movement.transaction_type,
      },
    });
  }
}
