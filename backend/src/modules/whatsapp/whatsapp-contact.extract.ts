/** Sentinel when a contact card arrived without an extractable phone (GetOlli shape). */
export const CONTACT_SHARE_NO_PHONE_PREFIX = '__MUNSHI_CONTACT_NO_PHONE__:';

export function buildContactShareNoPhoneMessage(displayName?: string): string {
  if (displayName?.trim()) {
    return `${CONTACT_SHARE_NO_PHONE_PREFIX}${displayName.trim()}`;
  }
  return CONTACT_SHARE_NO_PHONE_PREFIX;
}

export function isContactShareNoPhoneMessage(message: string): boolean {
  return message.startsWith(CONTACT_SHARE_NO_PHONE_PREFIX);
}

const PHONE_KEYS = [
  'wa_id',
  'waId',
  'phone',
  'phone_number',
  'phoneNumber',
  'contact_phone',
  'recipient_id',
];

/** Never treat webhook / message metadata as dialable numbers. */
const METADATA_SKIP_KEYS = new Set([
  'from',
  'text',
  'message_id',
  'messageId',
  'timestamp',
  'conversation_id',
  'conversationId',
  'id',
  'created_at',
  'updated_at',
  'event',
  'type',
  'media',
  'status',
]);

/** Reject GetOlli/WhatsApp metadata timestamps mistaken for phone numbers. */
export function isLikelyMetadataTimestamp(digits: string): boolean {
  if (digits.length !== 10) {
    return false;
  }
  const n = Number(digits);
  // Unix seconds ~2001–2049 (WhatsApp message timestamps often land here)
  return n >= 1_000_000_000 && n <= 2_500_000_000;
}

function phoneFromString(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }
  if (isLikelyMetadataTimestamp(digits)) {
    return null;
  }
  return value.trim();
}

/** Walk nested objects for phone fields (skip sender `from`). */
function findPhoneDeep(
  obj: unknown,
  depth = 0,
  skipKeys = new Set<string>(),
): string | null {
  if (depth > 8 || obj == null) {
    return null;
  }

  if (typeof obj === 'string') {
    return phoneFromString(obj);
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findPhoneDeep(item, depth + 1, skipKeys);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (typeof obj !== 'object') {
    return null;
  }

  const record = obj as Record<string, unknown>;

  for (const key of PHONE_KEYS) {
    if (skipKeys.has(key)) {
      continue;
    }
    const raw = record[key];
    if (typeof raw === 'string') {
      const phone = phoneFromString(raw);
      if (phone) {
        return phone;
      }
    }
  }

  for (const [key, value] of Object.entries(record)) {
    if (skipKeys.has(key) || METADATA_SKIP_KEYS.has(key)) {
      continue;
    }
    const found = findPhoneDeep(value, depth + 1, skipKeys);
    if (found) {
      return found;
    }
  }

  return null;
}

function phonesFromContactEntry(contact: Record<string, unknown>): string | null {
  const phones = contact.phones;
  if (!Array.isArray(phones)) {
    return null;
  }
  for (const entry of phones) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const row = entry as Record<string, unknown>;
    const waId = row.wa_id ?? row.waId;
    if (typeof waId === 'string') {
      const phone = phoneFromString(waId);
      if (phone) {
        return phone;
      }
    }
    const phone = row.phone;
    if (typeof phone === 'string') {
      const normalized = phoneFromString(phone);
      if (normalized) {
        return normalized;
      }
    }
  }
  return null;
}

/** Extract dialable phone from WhatsApp / Olli contact share payloads. */
export function extractPhoneFromContactsData(
  data: Record<string, unknown>,
  body?: Record<string, unknown>,
): string | null {
  const rawList =
    data.contacts ??
    data.contact ??
    (body?.data as Record<string, unknown> | undefined)?.contacts ??
    body?.contacts;

  const contacts: Record<string, unknown>[] = Array.isArray(rawList)
    ? (rawList as Record<string, unknown>[])
    : rawList && typeof rawList === 'object'
      ? [rawList as Record<string, unknown>]
      : [];

  for (const contact of contacts) {
    const phone = phonesFromContactEntry(contact);
    if (phone) {
      return phone;
    }
    const deep = findPhoneDeep(contact, 0, new Set(['from']));
    if (deep) {
      return deep;
    }
  }

  return null;
}

export function parseContactsInbound(
  data: Record<string, unknown>,
  body?: Record<string, unknown>,
): { kind: 'phone'; phone: string } | { kind: 'no_phone'; displayName?: string } {
  const phone = extractPhoneFromContactsData(data, body);
  if (phone) {
    return { kind: 'phone', phone };
  }

  const displayName =
    typeof data.text === 'string'
      ? data.text.trim()
      : typeof data.name === 'string'
        ? data.name.trim()
        : undefined;

  return { kind: 'no_phone', displayName };
}
