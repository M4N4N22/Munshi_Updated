import { BadRequestException } from '@nestjs/common';
import {
  formatQuantity,
  normalizeInventoryName,
  normalizeSku,
  normalizeUnit,
  parseNonNegativeThreshold,
  roundQuantity,
} from 'src/services/inventory/inventory.validation';
import {
  INVENTORY_CSV_MAX_BYTES,
  INVENTORY_CSV_MAX_ROWS,
} from './inventory-csv.constants';
import { resolveInventoryCsvHeaders } from './inventory-csv-header-aliases';

export type InventoryCsvRow = {
  line: number;
  sku: string;
  name: string;
  category: string;
  location: string;
  unit: string;
  quantity: string;
  reorder_threshold: string | null;
};

export type InventoryCsvParseResult =
  | { ok: true; rows: InventoryCsvRow[] }
  | { ok: false; error: string };

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function validationErrorMessage(err: unknown): string {
  if (err instanceof BadRequestException) {
    const payload = err.getResponse();
    if (typeof payload === 'string') {
      return payload;
    }
    const msg = (payload as { message?: string | string[] }).message;
    if (Array.isArray(msg)) {
      return msg.join('; ');
    }
    if (typeof msg === 'string') {
      return msg;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

function parseNonNegativeQuantity(
  value: string,
  label = 'Quantity',
): number {
  const trimmed = String(value).trim();
  if (!trimmed) {
    throw new BadRequestException(`${label} is required`);
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) {
    throw new BadRequestException(`${label} must be zero or a positive number`);
  }
  return roundQuantity(num);
}

function validateInventoryRow(
  raw: {
    line: number;
    sku: string;
    name: string;
    category: string;
    location: string;
    unit: string;
    quantity: string;
    reorder_threshold: string;
  },
  seenSkus: Map<string, number>,
): InventoryCsvRow | { error: string } {
  let sku: string;
  try {
    sku = normalizeSku(raw.sku);
  } catch (err) {
    return {
      error: `Line ${raw.line}: ${validationErrorMessage(err)}`,
    };
  }

  const firstLine = seenSkus.get(sku);
  if (firstLine != null) {
    return {
      error:
        `Line ${raw.line}: Duplicate SKU "${sku}" ` +
        `(pehle line ${firstLine} par mila).`,
    };
  }
  seenSkus.set(sku, raw.line);

  let name: string;
  let category: string;
  let location: string;
  let unit: string;
  let quantityNum: number;
  let reorder_threshold: string | null = null;

  try {
    name = normalizeInventoryName(raw.name, 'Item name');
    category = normalizeInventoryName(raw.category, 'Category');
    location = normalizeInventoryName(raw.location, 'Location');
    unit = normalizeUnit(raw.unit);
    quantityNum = parseNonNegativeQuantity(raw.quantity);
    const threshold = parseNonNegativeThreshold(raw.reorder_threshold);
    reorder_threshold =
      threshold == null ? null : formatQuantity(threshold);
  } catch (err) {
    return {
      error: `Line ${raw.line}: ${validationErrorMessage(err)}`,
    };
  }

  return {
    line: raw.line,
    sku,
    name,
    category,
    location,
    unit,
    quantity: formatQuantity(quantityNum),
    reorder_threshold,
  };
}

export function parseInventoryCsvText(raw: string): InventoryCsvParseResult {
  if (Buffer.byteLength(raw, 'utf8') > INVENTORY_CSV_MAX_BYTES) {
    return {
      ok: false,
      error: `CSV file bahut badi hai. Maximum ${INVENTORY_CSV_MAX_BYTES / (1024 * 1024)} MB allowed.`,
    };
  }

  const text = raw.replace(/^\uFEFF/, '').trim();
  if (!text) {
    return { ok: false, error: 'File khali hai.' };
  }

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return {
      ok: false,
      error: 'Kam se kam header aur ek inventory row chahiye.',
    };
  }

  const headerCells = parseCsvLine(lines[0]);
  const resolved = resolveInventoryCsvHeaders(headerCells);
  if (!resolved.ok) {
    return { ok: false, error: resolved.error };
  }
  const idx = resolved.idx;

  const rawRows: {
    line: number;
    sku: string;
    name: string;
    category: string;
    location: string;
    unit: string;
    quantity: string;
    reorder_threshold: string;
  }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.every((c) => !c.trim())) {
      continue;
    }
    rawRows.push({
      line: i + 1,
      sku: cells[idx.sku] ?? '',
      name: cells[idx.name] ?? '',
      category: cells[idx.category] ?? '',
      location: cells[idx.location] ?? '',
      unit: cells[idx.unit] ?? '',
      quantity: cells[idx.quantity] ?? '',
      reorder_threshold:
        idx.reorder_threshold >= 0 ? (cells[idx.reorder_threshold] ?? '') : '',
    });
  }

  if (!rawRows.length) {
    return { ok: false, error: 'Koi inventory row nahi mili.' };
  }

  if (rawRows.length > INVENTORY_CSV_MAX_ROWS) {
    return {
      ok: false,
      error: `Bahut zyada rows. Ek baar mein maximum ${INVENTORY_CSV_MAX_ROWS} items allowed.`,
    };
  }

  const seenSkus = new Map<string, number>();
  const rows: InventoryCsvRow[] = [];

  for (const rawRow of rawRows) {
    const validated = validateInventoryRow(rawRow, seenSkus);
    if ('error' in validated) {
      return { ok: false, error: validated.error };
    }
    rows.push(validated);
  }

  return { ok: true, rows };
}
