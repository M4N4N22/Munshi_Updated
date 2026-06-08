# Phase 7–8 — Backward Compatibility & Deployment Readiness

**Date:** 2026-06-08

---

## Phase 7 — Backward compatibility

Migration 014 is **additive only**. No `ALTER` or `DROP` on existing tables.

| Table / system | Impact | Evidence |
|----------------|--------|----------|
| `workflow_sessions` | **None** | Row count unchanged at 186 post-migration |
| `purchase_requests` | **None** | Row count unchanged at 25 |
| `inventory_items` | **None** | Row count unchanged at 115; FK parent intact |
| `inventory_transactions` | **None** | Row count unchanged at 136 |
| `inventory_alerts` | **N/A** | No `inventory_alerts` table in schema; low-stock uses `domain_events` — unaffected |

### Schema conflicts

- **None** — new table name `low_stock_alert_contexts` does not collide with existing objects
- FK `ON DELETE CASCADE` only affects new table rows when parent factory/item deleted (standard pattern)

### Data loss

- **None** — migration creates empty table only

---

## Phase 8 — Railway readiness

| Component | Ready? | Status |
|-----------|--------|--------|
| **Postgres** | **YES** | Reachable; migration 014 applied; 16/16 in `schema_migrations` |
| **Migration** | **YES** | Pre-applied safely; idempotent; rollback documented |
| **Backend (current deploy)** | **PARTIAL** | Running 15-file build; healthy; does not use `low_stock_alert_contexts` yet |
| **Backend (CTA fix code)** | **READY** | Code complete locally; not pushed/deployed per instruction |
| **Rollback** | **YES** | Plan documented in `06-rollback-plan.md` |

### Deploy ordering (validated)

Correct sequence for zero-downtime CTA fix:

1. ✅ **Apply migration 014** (done)
2. ⏳ Deploy backend with CTA fix code
3. ⏳ Verify `/health/migrations` → 16/16
4. ⏳ Live WhatsApp UAT (low stock → Purchase karein → YES)

Deploying backend **before** migration would have caused runtime `relation does not exist` errors on context writes. That risk is **eliminated**.

### GO / NO-GO

| Gate | Decision |
|------|----------|
| Migration pre-apply | **GO** — completed |
| Backend deploy (next step) | **GO** — DB ready; code ready; health baseline green |

**Overall deployment readiness: GO** (for backend deploy as next action)

**Not yet GO for production** until live WhatsApp CTA UAT passes post-deploy.
