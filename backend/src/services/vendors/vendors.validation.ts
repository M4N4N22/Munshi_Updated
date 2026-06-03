import { BadRequestException } from '@nestjs/common';
import {
  VENDOR_FIELD_LIMITS,
  VENDOR_GST_REGEX,
  VENDOR_PHONE_DIGITS_MAX,
  VENDOR_PHONE_DIGITS_MIN,
} from './vendors.constants';

export function trimOptional(value?: string | null): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t.length ? t : null;
}

export function normalizeVendorName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    throw new BadRequestException('Vendor name is required');
  }
  if (trimmed.length > VENDOR_FIELD_LIMITS.NAME_MAX) {
    throw new BadRequestException(
      `Vendor name must be at most ${VENDOR_FIELD_LIMITS.NAME_MAX} characters`,
    );
  }
  return trimmed;
}

/** Strip spaces/dashes; keep leading + for storage display. */
export function normalizeVendorPhone(phone: string): string {
  const raw = phone.trim();
  if (!raw) {
    throw new BadRequestException('Vendor phone number is required');
  }

  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');

  if (
    digits.length < VENDOR_PHONE_DIGITS_MIN ||
    digits.length > VENDOR_PHONE_DIGITS_MAX
  ) {
    throw new BadRequestException(
      `Phone number must contain ${VENDOR_PHONE_DIGITS_MIN} to ${VENDOR_PHONE_DIGITS_MAX} digits`,
    );
  }

  const normalized = hasPlus ? `+${digits}` : digits;
  if (normalized.length > VENDOR_FIELD_LIMITS.PHONE_MAX) {
    throw new BadRequestException('Phone number is too long');
  }
  return normalized;
}

export function normalizeVendorEmail(email?: string | null): string | null {
  const trimmed = trimOptional(email);
  if (!trimmed) return null;
  if (trimmed.length > VENDOR_FIELD_LIMITS.EMAIL_MAX) {
    throw new BadRequestException('Email is too long');
  }
  return trimmed.toLowerCase();
}

export function normalizeVendorGst(gst?: string | null): string | null {
  const trimmed = trimOptional(gst);
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase().replace(/\s+/g, '');
  if (upper.length > VENDOR_FIELD_LIMITS.GST_MAX) {
    throw new BadRequestException('GST number is too long');
  }
  if (!VENDOR_GST_REGEX.test(upper)) {
    throw new BadRequestException(
      'Invalid GST number format (expected 15-character Indian GSTIN)',
    );
  }
  return upper;
}

export function normalizeVendorAddress(address?: string | null): string | null {
  const trimmed = trimOptional(address);
  if (!trimmed) return null;
  if (trimmed.length > VENDOR_FIELD_LIMITS.ADDRESS_MAX) {
    throw new BadRequestException(
      `Address must be at most ${VENDOR_FIELD_LIMITS.ADDRESS_MAX} characters`,
    );
  }
  return trimmed;
}

export function normalizeVendorNotes(notes?: string | null): string | null {
  const trimmed = trimOptional(notes);
  if (!trimmed) return null;
  if (trimmed.length > VENDOR_FIELD_LIMITS.NOTES_MAX) {
    throw new BadRequestException(
      `Notes must be at most ${VENDOR_FIELD_LIMITS.NOTES_MAX} characters`,
    );
  }
  return trimmed;
}

export function assertFactoryId(factoryId: number): void {
  if (!Number.isFinite(factoryId) || factoryId <= 0) {
    throw new BadRequestException('Valid factory_id is required');
  }
}
