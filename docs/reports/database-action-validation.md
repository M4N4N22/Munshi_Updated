# Database Action Validation

**Date:** 2026-06-02  
**Factory under test:** `factory_id=3`  
**Connection:** Same Postgres as backend (`POSTGRES_CONNECTION_STRING` in `.env.local`)  
**Method:** Pre/post snapshots in golden E2E + manual session queries

---

## Summary by domain

| Domain | Applicable intents | DB action expected | Verified in sprint | Status |
|--------|-------------------|--------------------|--------------------|--------|
| Business Discovery | `/business_discovery`, `/continue_discovery` | `business_discovery_profiles`, optional `workflow_sessions` | Session not created (NL); profile updates seen in logs when session active | ⚠️ Partial |
| Vendors | `/onboard_vendor` | `workflow_sessions` → `vendors` on complete | No NL session; no new vendor row | ❌ Not verified |
| Workers | `/onboard_worker` | `workflow_sessions` → `users` / `factory_users` | No NL session | ❌ Not verified |
| Inventory | `/inventory_create`, `/inventory_status` | `inventory_items` insert vs read | Status read path ok; create blocked | ⚠️ Partial |
| Procurement | `/purchase_request_create` | `workflow_sessions` → `purchase_requests` | No NL session | ❌ Not verified |
| Attendance | `/present`, `/absent` | `attendance` upsert | Golden pass (handler invoked; count not diff-checked) | ⚠️ Assumed |
| Tasks | `/tasks`, `/update`, `/complete`, `/assign`, mgr*, `/depart_assign` | `tasks`, `task_updates` | Issue create +1; depart_assign task count; mgr/assign/update errors | ⚠️ Partial |
| Issues | `/issue`, `/issues`, `/resolve` | `issues` insert/read/update | Create: count increased on golden `/issue` | ✅ Create verified |
| Reporting | `/report` | aggregated reads | Golden pass (read-only) | ✅ |
| Organization | `/members` | `users`, `factory_users` read | Golden pass | ✅ |

---

## Golden E2E database signals

| Intent | Table(s) | Check performed | Before → after | Result |
|--------|----------|-----------------|----------------|--------|
| `/business_discovery` | `workflow_sessions` | ACTIVE row `BUSINESS_DISCOVERY` | none → none | ❌ |
| `/continue_discovery` | `workflow_sessions` | ACTIVE row | none → none | ❌ |
| `/onboard_vendor` | `workflow_sessions` | ACTIVE `ONBOARD_VENDOR` | none → none | ❌ |
| `/onboard_worker` | `workflow_sessions` | ACTIVE `ONBOARD_WORKER` | none → none | ❌ |
| `/inventory_create` | `workflow_sessions` | ACTIVE `INVENTORY_CREATE` | none → none | ❌ |
| `/inventory_status` | `inventory_items` | Handler read | unchanged count | ✅ read path |
| `/purchase_request_create` | `workflow_sessions` | ACTIVE `PURCHASE_REQUEST_CREATE` | none → none | ❌ |
| `/present` | `attendance` | Factory attendance count | not diffed | ⚠️ assumed ok |
| `/absent` | `attendance` | same | not diffed | ⚠️ assumed ok |
| `/tasks` | `tasks` | read | not diffed | ⚠️ assumed ok |
| `/update` | `task_updates` | insert | webhook error | ❌ |
| `/complete` | `tasks.is_completed` | update | not diffed | ⚠️ assumed ok |
| `/issue` | `issues` | open issues count | increased | ✅ |
| `/issues` | `issues` | read | not diffed | ⚠️ assumed ok |
| `/resolve` | `issues.is_resolved` | update | not diffed | ⚠️ assumed ok |
| `/report` | multiple | aggregate read | not diffed | ⚠️ assumed ok |
| `/assign` | `tasks` | insert | webhook error | ❌ |
| `/mgrassign` | `tasks.assigned_to` | update | webhook error | ❌ |
| `/mgrtransfer` | `tasks.department` | update | webhook error | ❌ |
| `/mgrreject` | `tasks` | reject fields | not diffed | ⚠️ assumed ok |
| `/mgrself` | `tasks.assigned_to` | manager self | webhook error | ❌ |
| `/depart_assign` | `tasks` | insert (dept task) | count ≥ before | ✅ |
| `/members` | `factory_users` | read | not diffed | ⚠️ assumed ok |
| `/help` | — | none | — | ✅ n/a |

---

## Manual session audit (2026-06-02)

Recent `workflow_sessions` for Owner phone after tests:

| id | workflow_type | status | step | Notes |
|----|---------------|--------|------|-------|
| 7 | `ONBOARD_VENDOR` | CANCELLED | `VENDOR_NAME` | Created by slash `/onboard_vendor` |
| 6 | `BUSINESS_DISCOVERY` | CANCELLED | `MENU` | Created by slash `/business_discovery` |
| 5 | `BUSINESS_DISCOVERY` | CANCELLED | `COLLECT` | Prior run |
| 4 | `PURCHASE_REQUEST_CREATE` | CANCELLED | `REQUEST_CREATION` | Prior run (2026-06-01) |
| 3 | `ONBOARD_VENDOR` | CANCELLED | `VENDOR_NAME` | Prior run |

NL phrases after `/cancel` produced **no new session ids** (7 remained latest after NL vendor/PR tests).

---

## Business discovery profile (log-derived)

When ACTIVE discovery session exists, NL messages update:

- `business_discovery_profiles.last_activity_at`, `next_reminder_at`  
- `business_discovery_profiles.bucket_data`  
- Occasionally `factories.name` / `factories.address` from free-text ingestion  

This is **profile capture inside an existing session**, not a substitute for workflow start on cold NL triggers.

---

## Tables not mutated in this sprint

| Table | Reason |
|-------|--------|
| `vendors` | Onboarding workflow never reached create step |
| `inventory_items` (new rows) | `INVENTORY_CREATE` never started |
| `purchase_requests` (new rows) | PR workflow never started |
| `task_updates` | `/update` golden failed |
| New `tasks` from `/assign` | webhook error |

---

## Database validation conclusion

- **Read-heavy command paths** (inventory status, tasks list, issues list, members, report) behave as expected when webhook returns `ok`.  
- **Write paths for workflows** (vendor, worker, inventory item, purchase request) were **not exercised end-to-end** via natural language in this sprint.  
- **Issue creation** is confirmed at DB level.  
- **Manager assignment writes** failed before reliable DB verification.

**Severity:** High for onboarding/procurement modules — no proof of insert/update on completion paths.

See `intent-failure-analysis.md` for remediation priorities.
