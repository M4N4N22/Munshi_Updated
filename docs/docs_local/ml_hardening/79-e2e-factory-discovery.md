# Phase 1 — E2E Factory Discovery

**Branch:** `feature/shantanu-ml-hardening-v1`  
**Validated:** 2026-06-11  
**Primary test factory:** `3` — **Munshi Dada**  
**Database:** `postgresql://munshi:***@65.1.128.181:5431/munshi_data`

---

## Factory inventory (all factories)

| ID | Name | Notes |
|----|------|-------|
| 1 | TBI GEU | Production tenant |
| 2 | SHRI TIRUPATI PAINTS AND VARNISH INDUSTRIES PRIVATE LIMITED | Production tenant |
| **3** | **Munshi Dada** | **Primary E2E / P0 validation factory** |
| 4 | Socic | Production tenant |
| 5 | ABC Manufacturing | Demo tenant |
| 6–125 | Phase0 Test * | Automated phase-0 test factories (ephemeral names with timestamps) |

**Total factories in DB:** 125

---

## Factory 3 — Munshi Dada (test inventory)

### Test personas (P0 / E2E scripts)

| Role (script) | Phone | DB user | DB role |
|---------------|-------|---------|---------|
| Owner | `918604856137` | Divyansh | OWNER |
| Manager | `917452897444` | Shantanu Garg | OWNER |
| Worker | `918950411406` | Anmol Paweriya | WORKER |

> **Note:** The "Manager" test phone maps to an OWNER in `factory_users`. Manager routing commands (`/mgrassign`, `/mgrself`, etc.) still execute because owners have manager privileges.

### Owners (factory 3)

| ID | Name | Phone |
|----|------|-------|
| 24 | ajay | 918295466423 |
| 19 | Debjyoti | 917060243009 |
| 18 | Divyansh | 918604856137 |
| 21 | Shantanu Garg | 917452897444 |

### Managers (factory 3)

| ID | Name | Phone |
|----|------|-------|
| 20 | Ayush Sharma | 918447242034 |
| 25 | Debapratim | 919958007208 |
| 34 | Rahul Verma | 919456157007 |
| 23 | shakya | 919992732261 |

### Workers (factory 3) — sample

| ID | Name | Phone |
|----|------|-------|
| 22 | Anmol Paweriya | 918950411406 |
| 29–33 | Evidence Worker * | 91989* |
| 35+ | P0 Worker *, Conc Worker * | Various |

**Total factory_users for factory 3:** 14+ (includes evidence/P0 test workers)

### Departments

Queried from `departments` where `factory_id = 3` (used in assign/transfer flows). Department names referenced in E2E tests: **sales**, **loading**, and others from onboarding.

### Vendors (factory 3)

| Count | Sample |
|-------|--------|
| **15+** | Runtime Test Vendor, P0 Vendor *, Evidence Vendor *, Conc Vendor * |

Recent sample:

| ID | Name | Phone |
|----|------|-------|
| 1 | Runtime Test Vendor | 919876543210 |
| 2 | P0 Vendor 1780390083238 | 9876543210 |
| 3 | Evidence Vendor 1780391375924 | 9876501234 |

### Inventory items (factory 3)

| Count | Notes |
|-------|-------|
| **17** SKUs | Mix of demo, evidence, and P0 test items |

| SKU | Name | Qty | Reorder threshold |
|-----|------|-----|-------------------|
| DEMO-STEEL-001 | Steel Sheets | 120 | 20 |
| ST-001 | Steel sheets | 0 | 100 |
| MP_001 | Metal parts | 0 | 50 |
| CO* / EVD* | Conc/Evidence test items | 0 | 5–15 |

**Categories / locations:** Active categories and warehouse locations exist (used by `INVENTORY_CREATE` workflow steps).

### Purchase requests (factory 3)

| Count | Sample statuses |
|-------|-----------------|
| **10+** | Includes P0 PR *, evidence PRs |

### Tasks & issues (factory 3)

| Entity | Total | Open |
|--------|-------|------|
| Tasks | 101 | 83 |
| Issues | 10 | 6 |

### Attendance (today)

| Records for factory 3 on validation date | 0 at discovery; E2E run created present record for worker |

### Active workflows (test phones)

| At discovery | After E2E cleanup |
|--------------|-------------------|
| 0 active sessions on test phones | 0 (cancel paths verified) |

---

## Environment used for discovery

| Service | Endpoint | Status |
|---------|----------|--------|
| Backend | `http://127.0.0.1:4001` | Up (remote PG, `SKIP_MIGRATION_BOOTSTRAP=1`) |
| ML | `http://127.0.0.1:8000` | Up |
| Webhook test route | `POST /webhook/test` | Requires `ENABLE_WEBHOOK_TEST_ROUTE=true` + `x-secret` |

---

## Raw data

Machine-readable discovery output: `e2e-validation-results.json` → `factory_discovery` section, and script `backend/scripts/e2e-factory-discovery.mjs`.
