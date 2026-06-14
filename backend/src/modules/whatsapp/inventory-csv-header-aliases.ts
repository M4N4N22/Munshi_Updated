import {
  INVENTORY_CSV_HEADERS,
  INVENTORY_CSV_OPTIONAL_HEADERS,
} from './inventory-csv.constants';

export type InventoryCsvCanonicalHeader =
  | (typeof INVENTORY_CSV_HEADERS)[number]
  | (typeof INVENTORY_CSV_OPTIONAL_HEADERS)[number];

const CANONICAL_HEADERS = new Set<string>([
  ...INVENTORY_CSV_HEADERS,
  ...INVENTORY_CSV_OPTIONAL_HEADERS,
]);

/** Alternate header labels (normalized) → Munshi canonical column. */
export const INVENTORY_CSV_HEADER_ALIASES: Record<
  string,
  InventoryCsvCanonicalHeader
> = {
  // sku
  item_code: 'sku',
  itemcode: 'sku',
  item_id: 'sku',
  product_code: 'sku',
  product_id: 'sku',
  product_sku: 'sku',
  sku_code: 'sku',
  code: 'sku',
  // name
  item_name: 'name',
  product_name: 'name',
  product: 'name',
  item: 'name',
  item_description: 'name',
  description: 'name',
  maal: 'name',
  maal_ka_naam: 'name',
  maal_naam: 'name',
  // category
  cat: 'category',
  category_name: 'category',
  product_category: 'category',
  type: 'category',
  item_type: 'category',
  department: 'category',
  shreni: 'category',
  varg: 'category',
  // location
  loc: 'location',
  location_name: 'location',
  warehouse: 'location',
  warehouse_name: 'location',
  store: 'location',
  store_name: 'location',
  godown: 'location',
  stock_location: 'location',
  jagah: 'location',
  sthan: 'location',
  // unit
  uom: 'unit',
  unit_of_measure: 'unit',
  units: 'unit',
  measure: 'unit',
  ikai: 'unit',
  // quantity
  qty: 'quantity',
  qnty: 'quantity',
  stock: 'quantity',
  stock_qty: 'quantity',
  stock_quantity: 'quantity',
  stock_on_hand: 'quantity',
  on_hand: 'quantity',
  onhand: 'quantity',
  current_quantity: 'quantity',
  quantity_on_hand: 'quantity',
  available_qty: 'quantity',
  available_quantity: 'quantity',
  maatra: 'quantity',
  matra: 'quantity',
  // reorder_threshold
  reorder_level: 'reorder_threshold',
  reorder_point: 'reorder_threshold',
  min_stock: 'reorder_threshold',
  minimum_stock: 'reorder_threshold',
  min_qty: 'reorder_threshold',
  min_quantity: 'reorder_threshold',
  threshold: 'reorder_threshold',
  low_stock_alert: 'reorder_threshold',
};

export function normalizeInventoryCsvHeader(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\u0900-\u097F]/g, '');
}

export function toCanonicalInventoryCsvHeader(
  normalized: string,
): InventoryCsvCanonicalHeader | null {
  if (!normalized) {
    return null;
  }
  if (CANONICAL_HEADERS.has(normalized)) {
    return normalized as InventoryCsvCanonicalHeader;
  }
  return INVENTORY_CSV_HEADER_ALIASES[normalized] ?? null;
}

export type ResolvedInventoryCsvHeaders =
  | {
      ok: true;
      idx: Record<InventoryCsvCanonicalHeader, number>;
    }
  | { ok: false; error: string };

/** Map a header row to canonical Munshi columns (supports aliases). */
export function resolveInventoryCsvHeaders(
  rawHeaderCells: string[],
): ResolvedInventoryCsvHeaders {
  const idx: Partial<Record<InventoryCsvCanonicalHeader, number>> = {};
  const duplicateOf = new Map<number, string>();

  for (let col = 0; col < rawHeaderCells.length; col++) {
    const normalized = normalizeInventoryCsvHeader(rawHeaderCells[col]);
    if (!normalized) {
      continue;
    }
    const canonical = toCanonicalInventoryCsvHeader(normalized);
    if (!canonical) {
      continue;
    }
    if (idx[canonical] != null) {
      duplicateOf.set(col, canonical);
      continue;
    }
    idx[canonical] = col;
  }

  if (duplicateOf.size > 0) {
    const examples = [...duplicateOf.entries()]
      .slice(0, 3)
      .map(([col, field]) => `"${rawHeaderCells[col]}" → ${field}`)
      .join(', ');
    return {
      ok: false,
      error:
        `Duplicate columns map to the same field (${examples}). ` +
        `Ek hi column rakhein — jaise sku ya item_code, dono nahi.`,
    };
  }

  const required = INVENTORY_CSV_HEADERS as readonly string[];
  const missing = required.filter((h) => idx[h as InventoryCsvCanonicalHeader] == null);
  if (missing.length) {
    const aliasHint =
      ' Common names: item_code→sku, product_name→name, qty→quantity, godown→location.';
    return {
      ok: false,
      error:
        `Galat CSV format. Ye columns chahiye: ${required.join(', ')}\n` +
        `Missing: ${missing.join(', ')}.${aliasHint}`,
    };
  }

  const optional = INVENTORY_CSV_OPTIONAL_HEADERS as readonly string[];
  const allHeaders = [...required, ...optional] as InventoryCsvCanonicalHeader[];
  const fullIdx = {} as Record<InventoryCsvCanonicalHeader, number>;
  for (const h of allHeaders) {
    fullIdx[h] = idx[h] ?? -1;
  }

  return { ok: true, idx: fullIdx };
}
