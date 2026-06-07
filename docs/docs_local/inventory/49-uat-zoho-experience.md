# UAT — Zoho Integration Experience

**Roles:** Owner  
**Run date:** 2026-06-06  
**Live Zoho credentials:** Not required (mock validation acceptable)  

---

## Connection Flow (Group 12)

| Step | Result | Notes |
|------|--------|-------|
| List connections | **PASS** | Empty list for new factory |
| OAuth authorize redirect | **FAIL** | 500 — `Zoho OAuth environment is not configured` |
| Disconnect endpoint | **NOT TESTED** | No active connection |
| User understanding of connect state | **PARTIAL** | Empty connections list is clear; OAuth error is technical |

**Mock validation:** Authorize endpoint correctly validates owner/manager role and fails fast when env missing — acceptable for UAT without live Zoho app.

---

## Inventory Pull (Group 13)

| Step | Result |
|------|--------|
| Manual sync `POST /integrations/zoho/sync/pull` | **PASS** — 400 without connection (expected) |
| Scheduled sync cron registered | **PASS** † | `ZohoScheduledSyncCron` every 10 min |
| Sync visibility (connections metadata) | **PASS** | last_sync fields on connection summary |
| Success messaging | **NOT TESTED** | Requires live connection |
| Failure messaging | **PASS** † | Phase 3.2 integration |

---

## Stock Push (Group 14)

| Step | Live UAT | Integration |
|------|----------|-------------|
| Push on task completion | **NOT TESTED** | **PASS** Phase 2.5 |
| Push delivery list | **FAIL** — 404 route | **PASS** |
| Retry cron | **PASS** † | `ZohoPushRetryCron` registered |
| Failure handling | **PASS** † | Retry + max attempts |
| User visibility | **PARTIAL** | Push list endpoint missing on stale server |

---

## Sync Failure Alerts (Group 15)

| Step | Result |
|------|--------|
| Owner notified on sync failure | **PASS** † |
| Manager notified | **PASS** † |
| Alert clarity (Hindi/English) | **PASS** † |
| Recovery guidance in message | **PASS** † |

Integration file: `integration-sync-failed-alert.integration.spec.ts` — 6+ scenarios **PASS**.

---

## Scenario Group Verdict

| Group | Result |
|-------|--------|
| 12 — Zoho connection | **PARTIAL** |
| 13 — Zoho inventory pull | **PASS** (mock) |
| 14 — Zoho stock push | **PARTIAL** |
| 15 — Sync failure alerts | **PASS** † |

---

## Business View

Owner understands **whether Zoho is connected** via connections API. Without OAuth env, business cannot complete connect in UAT — expected. Push lifecycle is **not visible** on stale UAT server; integration tests confirm push/retry behaviour for engineering confidence.

---

## Evening Simulation (Business Day)

| Activity | Result |
|----------|--------|
| Zoho scheduled sync | **PASS** † cron registered |
| Push processing | **PARTIAL** |
| Sync failure alert | **PASS** † |

---

## Production Prerequisites

1. Configure `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REDIRECT_URI`, `ZOHO_ACCOUNTS_URL`.  
2. Restart backend after deploy so push-delivery route is active.  
3. Single-instance OAuth state store (known HA limitation per report 30).
