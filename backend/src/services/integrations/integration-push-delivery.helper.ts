import { UniqueConstraintError } from 'sequelize';
import { IntegrationPushDelivery } from './integration.schema';
import { IntegrationRepository } from './integration.repository';

export interface EnsurePushDeliveryInput {
  factoryId: number;
  connectionId: number;
  inventoryTransactionId: number;
}

export interface EnsurePushDeliveryResult {
  delivery: IntegrationPushDelivery;
  created: boolean;
}

/**
 * Idempotent push delivery registration (R-P05-01).
 * First call creates a PENDING row; subsequent calls return the existing row.
 */
export async function ensurePushDelivery(
  repository: IntegrationRepository,
  input: EnsurePushDeliveryInput,
): Promise<EnsurePushDeliveryResult> {
  const existing = await repository.findDelivery(
    input.factoryId,
    input.connectionId,
    input.inventoryTransactionId,
  );
  if (existing) {
    return { delivery: existing, created: false };
  }

  try {
    const created = await repository.createDelivery({
      factory_id: input.factoryId,
      connection_id: input.connectionId,
      inventory_transaction_id: input.inventoryTransactionId,
    });
    return { delivery: created, created: true };
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      const duplicate = await repository.findDelivery(
        input.factoryId,
        input.connectionId,
        input.inventoryTransactionId,
      );
      if (duplicate) {
        return { delivery: duplicate, created: false };
      }
    }
    throw err;
  }
}
