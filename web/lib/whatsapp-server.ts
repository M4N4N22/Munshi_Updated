/** Server-only — do not import from client components. */
export function getWhatsappBusinessNumber(): string | null {
  const raw =
    process.env.WHATSAPP_BUSINESS_NUMBER ||
    process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER;
  const digits = raw?.trim().replace(/\D/g, "");
  return digits || null;
}

export function isWhatsappConfigured(): boolean {
  return getWhatsappBusinessNumber() != null;
}
