/** TTL for low-stock CTA context cache (title-only tap fallback). */
export const LOW_STOCK_ALERT_CONTEXT_TTL_MS = 24 * 60 * 60 * 1000;

export const LOW_STOCK_CTA_USER_MESSAGES = {
  EXPIRED:
    'Purchase alert expired.\nPlease wait for a new alert.',
  NONE:
    'Unable to determine inventory item.\nPlease create a purchase request manually.',
} as const;
