/** Normalize Indian mobile to digits-only E.164 without + (e.g. 919876543210). */
export function normalizeIndianPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return null;
}

export function formatPhoneDisplay(e164: string): string {
  if (e164.startsWith("91") && e164.length === 12) {
    return `+91 ${e164.slice(2, 7)} ${e164.slice(7)}`;
  }
  return e164;
}
