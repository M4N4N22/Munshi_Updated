# Phase 2.4 — Scheduled Sync Analysis

**Run date:** 2026-06-04  
**Scope:** Cron orchestration only — reuses Phase 2.3 pull sync

---

## 1. Existing Scheduler Architecture

Munshi already uses `@nestjs/schedule` with `ScheduleModule.forRoot()` in `AppModule`.

| Cron | File | Schedule |
|------|------|----------|
| Domain events outbox | `domain-events.processor.cron.ts` | Every minute |
| Workflow expiry | `workflow-expiry.cron.ts` | Hourly |
| Task deadlines | `task-deadline.cron.ts` | Hourly (:10) |
| Business discovery | `business-discovery-reminder.cron.ts` | Hourly |
| Onboarding OTP cleanup | `onboarding-otp.cron.ts` | Hourly |
| WhatsApp reminders | `whatsapp.service.ts` | Daily + 2h |

**Phase 2.4 pattern:** New `ZohoScheduledSyncCron` with `@Cron(CronExpression.EVERY_10_MINUTES)` tick; per-connection interval enforced in service layer (not hardcoded in cron expression).

---

## 2. Scheduled Sync Design

```text
ZohoScheduledSyncCron (every 10 min)
    ↓
ZohoScheduledSyncService.runScheduledSyncIfDue()
    ↓
For each ACTIVE zoho_inventory connection:
    eligibility checks
    ↓
ZohoPullSyncService.runPullSync(..., { trigger: CRON, skipAuth: true })
    ↓
integration_sync_runs (existing audit from 2.3)
```

No new inventory, mapping, or quantity logic. Orchestration only.

---

## 3. Duplicate Run Protection

Before calling `runPullSync`:

```sql
SELECT * FROM integration_sync_runs
WHERE connection_id = ? AND factory_id = ?
  AND direction = 'pull' AND status = 'running'
```

If row exists → skip with reason `sync_already_running`.

Protects against overlapping cron ticks and manual+scheduled overlap.

---

## 4. Failure Handling Design

| Scenario | Behavior |
|----------|----------|
| Item-level failures inside pull | Handled by `ZohoPullSyncService` → `partial`/`failed` sync run |
| Connection-level exception | Caught in scheduler → `outcome: failed`, continue next connection |
| One factory fails | Other factories still processed in same tick |

Sync run `error_summary` populated by existing pull sync service.

---

## 5. Risks

| ID | Risk | Mitigation |
|----|------|------------|
| R-S01 | Cron tick faster than interval | Service checks `last CRON run + ZOHO_SYNC_INTERVAL_MINUTES` |
| R-S02 | No sync user if owner deleted | Fallback to first factory OWNER; skip if none |
| R-S03 | Multi-instance duplicate cron | Same `running` gate; residual: two instances may race — document for ops |
| R-S04 | Large connection count in one tick | Sequential processing; batch checkpoint deferred to ops tuning |

---

## 6. Configuration

| Env | Default | Purpose |
|-----|---------|---------|
| `ZOHO_SYNC_ENABLED` | `true` | Master switch |
| `ZOHO_SYNC_INTERVAL_MINUTES` | `360` | Min minutes between CRON syncs per connection |
