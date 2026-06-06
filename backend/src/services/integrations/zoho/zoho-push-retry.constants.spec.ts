import {
  computeNextRetryAt,
  isDeliveryRetryEligible,
  MAX_PUSH_DELIVERY_ATTEMPTS,
} from './zoho-push-retry.constants';

describe('zoho-push-retry.constants', () => {
  it('schedules backoff after failed attempts', () => {
    const base = new Date('2026-06-06T12:00:00.000Z');
    const t1 = computeNextRetryAt(1, base)!;
    const t2 = computeNextRetryAt(2, base)!;
    const t3 = computeNextRetryAt(3, base)!;
    expect(t1.getTime() - base.getTime()).toBe(15 * 60 * 1000);
    expect(t2.getTime() - base.getTime()).toBe(60 * 60 * 1000);
    expect(t3.getTime() - base.getTime()).toBe(6 * 60 * 60 * 1000);
    expect(computeNextRetryAt(MAX_PUSH_DELIVERY_ATTEMPTS, base)).toBeNull();
  });

  it('only FAILED with due next_retry_at is eligible', () => {
    const now = new Date('2026-06-06T12:00:00.000Z');
    expect(
      isDeliveryRetryEligible('failed', 1, new Date('2026-06-06T11:00:00.000Z'), now),
    ).toBe(true);
    expect(
      isDeliveryRetryEligible('delivered', 0, new Date('2026-06-06T11:00:00.000Z'), now),
    ).toBe(false);
    expect(
      isDeliveryRetryEligible('skipped_unmapped', 0, new Date('2026-06-06T11:00:00.000Z'), now),
    ).toBe(false);
    expect(isDeliveryRetryEligible('failed', MAX_PUSH_DELIVERY_ATTEMPTS, now, now)).toBe(
      false,
    );
  });
});
