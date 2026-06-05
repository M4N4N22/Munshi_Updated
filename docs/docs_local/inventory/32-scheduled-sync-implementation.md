# Phase 2.4 — Scheduled Sync Implementation

**Run date:** 2026-06-04

---

## 1. Files Created

| File | Purpose |
|------|---------|
| `zoho-scheduled-sync.constants.ts` | Enable flag + interval helpers |
| `zoho-scheduled-sync.service.ts` | Eligibility, duplicate guard, orchestration |
| `zoho-scheduled-sync.cron.ts` | Nest `@Cron` tick (every 10 min) |
| `test/integration/zoho-scheduled-sync.integration.spec.ts` | Scheduler tests |

---

## 2. Files Modified

| File | Change |
|------|--------|
| `integration.repository.ts` | `listActiveZohoInventoryConnections`, sync run queries |
| `zoho-pull-sync.service.ts` | Optional `{ trigger, skipAuth }` on `runPullSync` |
| `zoho-oauth.service.ts` | Connection summary includes last sync fields |
| `integration.module.ts` | Register scheduled sync providers |
| `backend/.env.example` | `ZOHO_SYNC_ENABLED`, `ZOHO_SYNC_INTERVAL_MINUTES` |
| `web/lib/api/integrations.ts` | Extended connection type + `formatSyncStatus` |
| `web/components/integrations/integrations-panel.tsx` | Last sync display |
| `web/__tests__/integrations-panel.test.tsx` | Sync status UI test |

**Not modified:** OAuth flow, pull sync item logic, inventory services.

---

## 3. Scheduler Flow

```text
EVERY_10_MINUTES cron tick
  → if !ZOHO_SYNC_ENABLED: return
  → listActiveZohoInventoryConnections()
  → for each connection:
       skip if inactive / no refresh token / factory missing
       skip if running pull sync exists
       skip if interval not elapsed (CRON trigger runs only)
       resolve userId (connected_by_user_id || factory owner)
       runPullSync(id, factoryId, userId, { trigger: CRON, skipAuth: true })
```

---

## 4. Visibility Flow

```text
GET /integrations/connections
  → toSummaryWithSync()
  → getLatestPullSyncRun(connectionId, factoryId)
  → getLatestSuccessfulPullSyncRun(connectionId, factoryId)
  → returns last_sync_at, last_sync_status, last_sync_run_id, last_successful_sync_at
```

Web `/integrations` page renders these fields when connected.

---

## 5. Configuration

```env
ZOHO_SYNC_ENABLED=true
ZOHO_SYNC_INTERVAL_MINUTES=360
```

Set `ZOHO_SYNC_ENABLED=false` to disable scheduled ticks entirely.
