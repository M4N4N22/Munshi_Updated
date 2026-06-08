import { USER_ROLE } from 'src/services/users/users.constants';
import { TASK_INVENTORY_REFERENCE_TYPE } from 'src/services/tasks/tasks.inventory.constants';
import { InventoryLowStockEventPayload } from './inventory.low-stock.helper';

export type LowStockAlertDb = {
  FactoryUser: {
    findAll: (opts: unknown) => Promise<
      Array<{ user?: { phone_number?: string | null } | null }>
    >;
  };
  User: {
    findByPk: (
      id: number,
      opts: unknown,
    ) => Promise<{ phone_number?: string | null } | null>;
  };
  Department: {
    findAll: (opts: unknown) => Promise<Array<{ manager_user_id?: number }>>;
    findOne: (opts: unknown) => Promise<{ manager_user_id?: number } | null>;
  };
  Task: {
    findOne: (opts: unknown) => Promise<{ department_id?: number | null } | null>;
  };
};

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
/** All factory owners — not only the first linked row. */
export async function resolveAllOwnerPhones(
  db: LowStockAlertDb,
  factoryId: number,
): Promise<string[]> {
  const links = await db.FactoryUser.findAll({
    where: { factory_id: factoryId, role: USER_ROLE.OWNER },
    order: [['id', 'ASC']],
    include: [
      {
        model: db.User,
        as: 'user',
        attributes: ['phone_number'],
      },
    ],
  });
  const phones: string[] = [];
  for (const link of links) {
    const phone = link.user?.phone_number?.trim();
    if (phone) {
      phones.push(phone);
    }
  }
  return phones;
}

/** Every department head in the factory (deduped later with owners). */
export async function resolveAllDepartmentManagerPhones(
  db: LowStockAlertDb,
  factoryId: number,
): Promise<string[]> {
  const departments = await db.Department.findAll({
    where: { factory_id: factoryId },
    attributes: ['manager_user_id'],
  });
  const managerIds = [
    ...new Set(
      departments
        .map((d) => d.manager_user_id)
        .filter((id): id is number => id != null && Number.isFinite(id)),
    ),
  ];
  const phones: string[] = [];
  for (const managerId of managerIds) {
    const manager = await db.User.findByPk(managerId, {
      attributes: ['phone_number'],
    });
    const phone = manager?.phone_number?.trim();
    if (phone) {
      phones.push(phone);
    }
  }
  return phones;
}

/**
 * Owners + department managers for every low-stock alert.
 * Order: owners first, then department managers (deduped).
 */
export async function resolveLowStockAlertRecipientPhones(
  db: LowStockAlertDb,
  factoryId: number,
  payload?: Partial<InventoryLowStockEventPayload>,
): Promise<string[]> {
  const owners = await resolveAllOwnerPhones(db, factoryId);
  const deptManagers = await resolveAllDepartmentManagerPhones(db, factoryId);
  const taskManager = payload
    ? await resolveDepartmentManagerPhoneForLowStockAlert(
        db,
        lowStockRecipientInputFromPayload(factoryId, payload),
      )
    : null;
  return uniqueAlertPhones(...owners, ...deptManagers, taskManager);
}

export async function resolveDepartmentManagerPhoneForLowStockAlert(
  db: LowStockAlertDb,
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
