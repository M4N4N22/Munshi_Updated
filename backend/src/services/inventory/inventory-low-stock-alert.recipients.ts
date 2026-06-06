import { TASK_INVENTORY_REFERENCE_TYPE } from 'src/services/tasks/tasks.inventory.constants';
import { InventoryLowStockEventPayload } from './inventory.low-stock.helper';

/** Deduplicated non-empty phone numbers preserving order (owner first). */
export function uniqueAlertPhones(
  ...phones: Array<string | null | undefined>
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of phones) {
    const phone = raw?.trim();
    if (!phone || seen.has(phone)) {
      continue;
    }
    seen.add(phone);
    result.push(phone);
  }
  return result;
}

export type LowStockAlertRecipientInput = {
  factoryId: number;
  referenceType: string | null | undefined;
  referenceId: number | null | undefined;
};

/**
 * Resolves department manager phone when low-stock movement is TASK-linked.
 * Inventory items have no direct department relation — TASK → department_id → manager.
 */
export async function resolveDepartmentManagerPhoneForLowStockAlert(
  db: {
    Task: {
      findOne: (opts: unknown) => Promise<{ department_id?: number | null } | null>;
    };
    Department: {
      findOne: (opts: unknown) => Promise<{ manager_user_id?: number } | null>;
    };
    User: {
      findByPk: (
        id: number,
        opts: unknown,
      ) => Promise<{ phone_number?: string | null } | null>;
    };
  },
  input: LowStockAlertRecipientInput,
): Promise<string | null> {
  if (
    input.referenceType !== TASK_INVENTORY_REFERENCE_TYPE ||
    input.referenceId == null ||
    !Number.isFinite(input.referenceId)
  ) {
    return null;
  }

  const task = await db.Task.findOne({
    where: { id: input.referenceId, factory_id: input.factoryId },
    attributes: ['department_id'],
  });
  if (!task?.department_id) {
    return null;
  }

  const department = await db.Department.findOne({
    where: { id: task.department_id, factory_id: input.factoryId },
    attributes: ['manager_user_id'],
  });
  if (!department?.manager_user_id) {
    return null;
  }

  const manager = await db.User.findByPk(department.manager_user_id, {
    attributes: ['phone_number'],
  });
  const phone = manager?.phone_number;
  return phone?.trim() ? phone.trim() : null;
}

export function lowStockRecipientInputFromPayload(
  factoryId: number,
  payload: Partial<InventoryLowStockEventPayload>,
): LowStockAlertRecipientInput {
  return {
    factoryId,
    referenceType: payload.reference_type ?? null,
    referenceId:
      payload.reference_id != null ? Number(payload.reference_id) : null,
  };
}
