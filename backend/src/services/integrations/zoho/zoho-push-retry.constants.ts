/** Push delivery retry configuration (Phase 2.5.5). */

export const MAX_PUSH_DELIVERY_ATTEMPTS = 4;

/** Backoff after failed attempt N (1-based): immediate, +15m, +60m, +6h. */
export const PUSH_RETRY_BACKOFF_MS: Record<number, number> = {
  1: 0,
  2: 15 * 60 * 1000,
  3: 60 * 60 * 1000,
  4: 6 * 60 * 60 * 1000,
};

export function isZohoPushRetryEnabled(): boolean {
  const raw = process.env.ZOHO_PUSH_RETRY_ENABLED?.trim().toLowerCase();
  if (raw === '0' || raw === 'false' || raw === 'no') {
    return false;
  }
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === undefined;
}

/**
 * Computes next_retry_at after a failed attempt.
 * @param failedAttemptCount attempts completed including the failure just recorded (1–4)
 */
export function computeNextRetryAt(
  failedAttemptCount: number,
  from: Date = new Date(),
): Date | null {
  if (failedAttemptCount >= MAX_PUSH_DELIVERY_ATTEMPTS) {
    return null;
  }
  const nextAttempt = failedAttemptCount + 1;
  const delayMs = PUSH_RETRY_BACKOFF_MS[nextAttempt] ?? PUSH_RETRY_BACKOFF_MS[4];
  return new Date(from.getTime() + delayMs);
}

export function isDeliveryRetryEligible(
  status: string,
  retryCount: number,
  nextRetryAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (status !== 'failed') {
    return false;
  }
  if (retryCount >= MAX_PUSH_DELIVERY_ATTEMPTS) {
    return false;
  }
  if (!nextRetryAt) {
    return false;
  }
  return nextRetryAt.getTime() <= now.getTime();
}
