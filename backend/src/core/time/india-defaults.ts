/**
 * Munshi factories default to Asia/Kolkata (IST) for dates, reminders, and ML inputs.
 */

export const INDIA_TIMEZONE = 'Asia/Kolkata' as const;

const INDIA_OFFSET_SUFFIX = '+05:30';

function hasExplicitTimeZoneSuffix(text: string): boolean {
  if (/[zZ]$/.test(text)) return true;
  if (!/[Tt]/.test(text)) return false;
  return /[+-]\d{2}:?\d{2}$/.test(text);
}

/**
 * Parses deadline strings from ML/API. Plain dates and naive datetimes mean IST wall time;
 * strings with Z or ±offset are interpreted as-is.
 */
export function parseIndiaDefaultDeadline(raw: string): Date | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T23:59:59.999${INDIA_OFFSET_SUFFIX}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const isoified = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}(:\d{2}(\.\d+)?)?)/.test(s)
    ? s.replace(/^(\d{4}-\d{2}-\d{2}) /, '$1T')
    : s;

  const naiveIstDatetime =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;
  if (!hasExplicitTimeZoneSuffix(isoified) && naiveIstDatetime.test(isoified)) {
    const d = new Date(`${isoified}${INDIA_OFFSET_SUFFIX}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Today's calendar date YYYY-MM-DD in IST (en-CA gives ISO-like formatting). */
export function getTodayCalendarDateIST(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: INDIA_TIMEZONE });
}

/** Local hour 0–23 for `now`, in India timezone (for cron window checks). */
export function getHourIST(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: INDIA_TIMEZONE,
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now);
  const h = parts.find((p) => p.type === 'hour')?.value;
  const n = h != null ? Number.parseInt(h, 10) : NaN;
  return Number.isNaN(n) ? 0 : n;
}
