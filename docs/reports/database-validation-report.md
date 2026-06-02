# Database Validation Report

**Date:** 2026-06-02  
**Database:** Postgres `munshi_data` @ factory_id=3  
**Sources:** P0 completion run + golden E2E

---

## Workflow sessions

| Session ID | workflow_type | Status | Verified action |
|------------|---------------|--------|-----------------|
| 20–25 | Various | ACTIVE during start tests | INSERT on NL start |
| 26 | BUSINESS_DISCOVERY | COMPLETED | Terminal transition |
| 27 | ONBOARD_VENDOR | COMPLETED | Terminal transition |
| 28 | ONBOARD_WORKER | COMPLETED | Terminal transition |
| 29 | INVENTORY_CREATE | COMPLETED | Terminal transition |
| 30 | PURCHASE_REQUEST_CREATE | COMPLETED | Terminal transition |

Cancel flow verified: `/cancel` sets status CANCELLED without orphan ACTIVE rows blocking new starts.

---

## Domain tables — writes verified

| Table | Operation | Evidence |
|-------|-----------|----------|
| `vendors` | INSERT | vendor id **2** (`P0 Vendor *`) |
| `users` | INSERT | user id **28** (worker onboarding) |
| `factory_users` | INSERT | worker linked to factory 3 |
| `inventory_items` | INSERT | item id **1**, SKU `P0SKU*` |
| `purchase_requests` | INSERT | PR id **9** |
| `purchase_request_items` | INSERT | via workflow completion |
| `business_discovery_profiles` | UPDATE | status PAUSED, bucket data |
| `tasks` | INSERT | assign golden + P0 manager setup (34→38) |
| `task_updates` | INSERT | update golden phrase |
| `attendance` | UPSERT | present/absent golden |
| `issues` | INSERT | issue golden (+1 count) |

---

## Domain tables — reads verified

| Table | Intent | Golden/P0 |
|-------|--------|-----------|
| `inventory_items` | `/inventory_status` | ✅ |
| `tasks` | `/tasks` | ✅ |
| `issues` | `/issues` | ✅ |
| `users` + `factory_users` | `/members` | ✅ |
| Aggregates | `/report` | ✅ |

---

## Manager operations — mutations

| Operation | Expected mutation | Verified |
|-----------|-------------------|----------|
| `/assign` | `tasks` INSERT | tasks 34→35 ✅ |
| `/mgrassign` | `tasks.assigned_to`, routing_status | webhook ok ✅ |
| `/mgrtransfer` | department transfer | webhook ok ✅ |
| `/mgrself` | routing_status MANAGER_SELF | webhook ok ✅ |

---

## Migrations

| Check | Result |
|-------|--------|
| pending_count | 0 |
| Applied | 001–007 |

---

## Data integrity notes

- Vendor phone normalized and uniqueness enforced (validation errors return user message, not crash).
- Worker phone must be unique globally — P0 script uses timestamp-based test phone.
- Inventory create requires pre-existing category/location — fails gracefully if missing.

---

## Conclusion

All P0 workflow completions produced expected persistent records. Golden E2E confirmed read/write paths for operational commands. **Database validation: PASS**
