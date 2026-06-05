import { BadRequestException } from '@nestjs/common';
import { isLikelyMetadataTimestamp } from 'src/modules/whatsapp/whatsapp-contact.extract';
import { USER_ROLE } from 'src/services/users/users.constants';
import { normalizeVendorPhone } from 'src/services/vendors/vendors.validation';
import { WORKFLOW_SKIP_KEYWORDS } from './workflow.constants';

const WORKER_NAME_MAX = 255;

export function normalizeWorkerName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    throw new BadRequestException('Worker name is required');
  }
  if (trimmed.length > WORKER_NAME_MAX) {
    throw new BadRequestException(
      `Worker name must be at most ${WORKER_NAME_MAX} characters`,
    );
  }
  return trimmed;
}

export function isInvalidStoredPhone(phone?: string): boolean {
  if (!phone?.trim()) {
    return false;
  }
  const digits = phone.replace(/\D/g, '');
  return isLikelyMetadataTimestamp(digits);
}

/** Human-readable Indian mobile for resume copy. */
export function formatWorkerPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    const local = digits.slice(2);
    return `+91 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return phone.trim();
}

export function normalizeWorkerPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (isLikelyMetadataTimestamp(digits)) {
    throw new BadRequestException(
      'Yeh number sahi nahi lag raha. Contact share ke bajay number likh kar bhejein (jaise 7247577182 ya 917247577182).',
    );
  }
  try {
    return normalizeVendorPhone(phone);
  } catch (error: any) {
    const msg = error?.message ?? 'Invalid phone number';
    if (msg.includes('Phone')) {
      throw new BadRequestException(msg);
    }
    throw error;
  }
}

/** True if input is mostly digits (after stripping) — not a name mistaken for phone. */
export function looksLikePhoneInput(input: string): boolean {
  const digits = input.replace(/\D/g, '');
  if (digits.length < 10) {
    return false;
  }
  if (isLikelyMetadataTimestamp(digits)) {
    return false;
  }
  return true;
}

/** Department names should be words, not phone numbers / timestamps. */
export function looksLikeDepartmentInput(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) {
    return false;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 10 && digits.length / trimmed.length > 0.6) {
    return false;
  }
  if (isLikelyMetadataTimestamp(digits)) {
    return false;
  }
  return true;
}

export function normalizeWorkerDoj(input: string): Date | null {
  const trimmed = input.trim();
  if (!trimmed || WORKFLOW_SKIP_KEYWORDS.includes(trimmed.toLowerCase())) {
    return null;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const date = new Date(`${trimmed}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(
        'Invalid date of joining. Use YYYY-MM-DD or reply SKIP.',
      );
    }
    return date;
  }

  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const [, dd, mm, yyyy] = dmyMatch;
    const date = new Date(
      `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00.000Z`,
    );
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(
        'Invalid date of joining. Use YYYY-MM-DD or reply SKIP.',
      );
    }
    return date;
  }

  throw new BadRequestException(
    'Invalid date of joining. Use YYYY-MM-DD (e.g. 2026-05-29) or reply SKIP.',
  );
}

export interface DepartmentOption {
  id: number;
  name: string;
  slug: string;
}

export function resolveDepartmentSelection(
  input: string,
  departments: DepartmentOption[],
): DepartmentOption {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new BadRequestException('Please select a department by name or ID.');
  }

  const asId = Number(trimmed);
  if (Number.isFinite(asId) && asId > 0) {
    const byId = departments.find((d) => d.id === asId);
    if (byId) {
      return byId;
    }
  }

  const lower = trimmed.toLowerCase();
  const bySlug = departments.find((d) => d.slug.toLowerCase() === lower);
  if (bySlug) {
    return bySlug;
  }

  const byName = departments.find(
    (d) => d.name.trim().toLowerCase() === lower,
  );
  if (byName) {
    return byName;
  }

  const partial = departments.filter((d) =>
    d.name.toLowerCase().includes(lower),
  );
  if (partial.length === 1) {
    return partial[0];
  }

  throw new BadRequestException(
    `No department matches "${trimmed}". Reply with a department name or ID from the list.`,
  );
}

export function formatDepartmentList(departments: DepartmentOption[]): string {
  if (departments.length === 0) {
    return '';
  }
  return departments
    .map((d) => `• *${d.id}* — ${d.name}`)
    .join('\n');
}

/** Teams owners can pick during WhatsApp add (excludes junk timestamp names). */
export function filterSelectableDepartments(
  departments: DepartmentOption[],
): DepartmentOption[] {
  return departments.filter((d) => looksLikeDepartmentInput(d.name));
}

export function normalizeRoleInput(input: string): string {
  return input
    .trim()
    .replace(/[*•·]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function parseWorkerRole(input: string): USER_ROLE.WORKER | USER_ROLE.MANAGER {
  const raw = normalizeRoleInput(input);
  const firstWord = raw.split(/[\s,]+/)[0] ?? raw;

  const managerHints = [
    'manager',
    'mgr',
    'supervisor',
    'maneger',
    'menejer',
    'मैनेजर',
  ];
  if (
    managerHints.some((h) => firstWord === h || raw.includes(h)) ||
    /^m(an)?ager$/.test(firstWord)
  ) {
    return USER_ROLE.MANAGER;
  }

  const workerHints = [
    'worker',
    'employee',
    'staff',
    'karmi',
    'कर्मी',
    'कर्मचारी',
    'मजदूर',
  ];
  if (
    workerHints.some((h) => firstWord === h || raw.includes(h)) ||
    /^w(or)?ker$/.test(firstWord)
  ) {
    return USER_ROLE.WORKER;
  }

  throw new BadRequestException(
    'Role samajh nahi aayi. Worker ya Manager likhein (chhoti/badi letters chalegi).',
  );
}
