/** Scheduled Zoho pull sync configuration (Phase 2.4). */
export function isZohoSyncEnabled(): boolean {
  const raw = process.env.ZOHO_SYNC_ENABLED?.trim().toLowerCase();
  if (raw === '0' || raw === 'false' || raw === 'no') {
    return false;
  }
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === undefined;
}

export function getZohoSyncIntervalMinutes(): number {
  const parsed = Number(process.env.ZOHO_SYNC_INTERVAL_MINUTES ?? 360);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 360;
  }
  return parsed;
}

export const ZOHO_SCHEDULED_SYNC_CRON_TICK_MINUTES = 10;
