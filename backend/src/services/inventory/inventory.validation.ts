import { BadRequestException } from '@nestjs/common';
import {
  INVENTORY_FIELD_LIMITS,
  INVENTORY_QUANTITY_SCALE,
} from './inventory.constants';

export function assertFactoryId(factoryId: number): void {
  if (!Number.isFinite(factoryId) || factoryId <= 0) {
    throw new BadRequestException('Valid factory_id is required');
  }
}

export function normalizeInventoryName(name: string, label = 'Name'): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    throw new BadRequestException(`${label} is required`);
  }
  if (trimmed.length > INVENTORY_FIELD_LIMITS.NAME_MAX) {
    throw new BadRequestException(
      `${label} must be at most ${INVENTORY_FIELD_LIMITS.NAME_MAX} characters`,
    );
  }
  return trimmed;
}

export function normalizeSku(sku: string): string {
  const trimmed = sku.trim().toUpperCase();
  if (!trimmed) {
    throw new BadRequestException('SKU is required');
  }
  if (trimmed.length > INVENTORY_FIELD_LIMITS.SKU_MAX) {
    throw new BadRequestException(
      `SKU must be at most ${INVENTORY_FIELD_LIMITS.SKU_MAX} characters`,
    );
  }
  return trimmed;
}

export function normalizeUnit(unit: string): string {
  const trimmed = unit.trim();
  if (!trimmed) {
    throw new BadRequestException('Unit is required');
  }
  if (trimmed.length > INVENTORY_FIELD_LIMITS.UNIT_MAX) {
    throw new BadRequestException(
      `Unit must be at most ${INVENTORY_FIELD_LIMITS.UNIT_MAX} characters`,
    );
  }
  return trimmed;
}

export function normalizeOptionalText(
  value: string | null | undefined,
  maxLen: number,
  label: string,
): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLen) {
    throw new BadRequestException(`${label} is too long`);
  }
  return trimmed;
}

export function parsePositiveQuantity(
  quantity: string | number,
  label = 'Quantity',
): number {
  const num =
    typeof quantity === 'number' ? quantity : Number(String(quantity).trim());
  if (!Number.isFinite(num) || num <= 0) {
    throw new BadRequestException(`${label} must be a positive number`);
  }
  return roundQuantity(num);
}

export function parseSignedQuantity(
  quantity: string | number,
  label = 'Quantity',
): number {
  const num =
    typeof quantity === 'number' ? quantity : Number(String(quantity).trim());
  if (!Number.isFinite(num) || num === 0) {
    throw new BadRequestException(`${label} must be a non-zero number`);
  }
  return roundQuantity(num);
}

export function parseNonNegativeThreshold(
  value: string | number | null | undefined,
): number | null {
  if (value == null || String(value).trim() === '') {
    return null;
  }
  const num = Number(String(value).trim());
  if (!Number.isFinite(num) || num < 0) {
    throw new BadRequestException('Reorder threshold must be zero or positive');
  }
  return roundQuantity(num);
}

export function roundQuantity(value: number): number {
  return (
    Math.round(value * Math.pow(10, INVENTORY_QUANTITY_SCALE)) /
    Math.pow(10, INVENTORY_QUANTITY_SCALE)
  );
}

export function formatQuantity(value: number): string {
  return roundQuantity(value).toFixed(INVENTORY_QUANTITY_SCALE);
}

export interface NamedEntityOption {
  id: number;
  name: string;
}

export function resolveNamedSelection(
  input: string,
  options: NamedEntityOption[],
  label: string,
): NamedEntityOption {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new BadRequestException(`Please select a ${label}.`);
  }

  const asId = Number(trimmed);
  if (Number.isFinite(asId) && asId > 0) {
    const byId = options.find((o) => o.id === asId);
    if (byId) return byId;
  }

  const lower = trimmed.toLowerCase();
  const exact = options.filter(
    (o) => o.name.trim().toLowerCase() === lower,
  );
  if (exact.length === 1) return exact[0];

  const partial = options.filter((o) =>
    o.name.toLowerCase().includes(lower),
  );
  if (partial.length === 1) return partial[0];

  throw new BadRequestException(
    `No ${label} matches "${trimmed}". Reply with a name or ID from the list.`,
  );
}

export function formatNamedEntityList(
  options: NamedEntityOption[],
  emptyMessage: string,
): string {
  if (options.length === 0) {
    return emptyMessage;
  }
  return options.map((o) => `• *${o.id}* — ${o.name}`).join('\n');
}
