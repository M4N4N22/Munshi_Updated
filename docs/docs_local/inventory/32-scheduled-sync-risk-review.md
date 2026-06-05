# Phase 2.4 — Scheduled Sync Risk Review

**Run date:** 2026-06-04

---

## R-Z06 — Quantity Overwrite

| Check | Status |
|-------|--------|
| Scheduler calls `ZohoPullSyncService.runPullSync` only | **PASS** |
| No direct `current_quantity` updates in scheduler | **PASS** |
| Stock still via `recordStockIn(ZOHO_PULL)` inside pull service | **PASS** |
| Pull sync logic not duplicated | **PASS** |

**R-Z06 preserved** — scheduler has zero inventory write paths.

---

## Duplicate Run Protection

| Check | Status |
|-------|--------|
| `findRunningPullSyncRun` before sync start | **PASS** |
| Skip reason `sync_already_running` | **PASS** |
| Integration test: running row blocks second execution | **PASS** |

---

## Failure Isolation

| Check | Status |
|-------|--------|
| Per-connection try/catch in scheduler | **PASS** |
| Failed connection does not abort batch loop | **PASS** |
| Sync run `failed`/`partial` recorded by pull service | **PASS** |
| Test: factory A fails, factory B succeeds | **PASS** |

---

## Residual Risks

| ID | Risk | Severity | Notes |
|----|------|----------|-------|
| SR-S01 | Multi-instance cron race | Medium | Two pods may both pass running check before either creates run — rare window |
| SR-S02 | Interval based on last CRON run only | Low | Manual pulls do not reset scheduled interval (by design) |
| SR-S03 | Sequential sync of many connections | Low | Long tick duration; monitor in prod |
| SR-S04 | `skipAuth` on scheduled path | Low | Only callable from internal service; no new public endpoint |

---

## Overall Assessment

**R-Z06, duplicate protection, and failure isolation validated.**

Approved to proceed to **Phase 2.5 Stock Push**.
