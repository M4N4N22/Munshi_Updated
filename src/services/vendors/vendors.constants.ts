export const VENDOR_FIELD_LIMITS = {
  NAME_MAX: 255,
  PHONE_MAX: 32,
  EMAIL_MAX: 255,
  GST_MAX: 15,
  ADDRESS_MAX: 2000,
  NOTES_MAX: 5000,
} as const;

export const VENDOR_PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 25,
  MAX_LIMIT: 100,
} as const;

/** Indian GSTIN: 15 alphanumeric characters (standard format). */
export const VENDOR_GST_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Digits-only length after normalization (10–15 for E.164-style numbers). */
export const VENDOR_PHONE_DIGITS_MIN = 10;
export const VENDOR_PHONE_DIGITS_MAX = 15;
