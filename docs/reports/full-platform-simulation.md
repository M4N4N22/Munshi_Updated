# Full Platform Simulation — Sharma Packaging Industries

**QA role:** Customer simulation (natural language only, no slash commands)  
**Test company:** Sharma Packaging Industries, Faridabad  
**Environment tested:** 2026-06-01  
**Backend:** `http://localhost:4001`  
**ML (production path):** `http://13.126.57.78:8000` (configured in `.env.local` as `ML_URL`)  
**Factory scope:** `factory_id=3` (existing test factory — Sharma scenario not pre-seeded)

---

## Phase 0 — Environment Validation

| Check | Result |
|-------|--------|
| `GET /health` | **PASS** — Postgres up |
| `GET /health/migrations` | **PASS** — `pending_count: 0`, `up_to_date: true` |
| Migration 001 | Applied |
| Migration 002 | Applied |
| Migration 003 | Applied |
| Migration 004 | Applied |
| Migration 005 | Applied |
| Migration 006 | Applied |
| Migration 007 | Applied |
| Business Discovery tables | **PASS** — `GET /business-discovery?factory_id=3` returns profile |
| Procurement tables | **PASS** — `GET /purchase-requests?factory_id=3` returns 6 PRs |
| Inventory tables | **PASS** — API responds; **0 items** on factory 3 |
| Vendor tables | **PASS** — 1 vendor (`Runtime Test Vendor`) |

**Environment status: HEALTHY — testing proceeded.**

---

## Simulation method

Customer path modeled as:

```
User Message → POST ML /classify → Intent → WhatsApp router → Workflow/API → DB
```

- **No slash commands** used in test utterances.
- **No direct workflow/API invocation** for user actions (read-only verification of resulting state where noted).
- **Production ML** used for classification (same as live WhatsApp backend).

**Limitation:** End-to-end WhatsApp delivery was not exercised (no live WhatsApp session). Intent + backend state verification used instead.

---

## Phase summary

| Phase | Focus | NL Intent Pass Rate (prod ML) | Backend State | Verdict |
|-------|--------|-------------------------------|---------------|---------|
| 1 | Business Discovery | **0/5** | APIs OK (92% readiness on factory 3) | **FAIL** — discovery intents not on prod ML |
| 2 | Owner operations | **4/6** | Reports API works | **PARTIAL** |
| 3 | Manager operations | **5/5** | Not executed E2E | **PASS** (intent only) |
| 4 | Worker operations | **5/5** | Not executed E2E | **PASS** (intent only) |
| 5 | Vendor operations | **0/2** | Vendor master exists | **FAIL** — onboard misclassified; no vendor chat role |
| 6 | Inventory operations | **0/4** | 0 inventory items | **FAIL** |
| 7 | Document workflows | **0/1** | 0 documents | **BLOCKED** — requires file upload channel |
| 8 | Procurement | **0/4** | 6 draft PRs exist | **FAIL** — NL misroutes to `/depart_assign` |
| 9 | Reporting | **4/4** (intent) | `/reports` returns data | **PARTIAL** |
| 10 | General chat | **3/4** | N/A | **PASS** |
| 11 | Intent validation | **21/36 (58%)** | See intent-validation-report | **FAIL** |

---

## Critical finding: Production ML drift

Local LLM repo (`bot_engine.py`) classifies discovery, inventory, procurement, and vendor phrases correctly via pre-classifier.

**Deployed ML at `13.126.57.78:8000` does not match.** Examples:

| Message (Hinglish) | Expected (contract) | Production ML | Local pre-classifier |
|--------------------|---------------------|---------------|----------------------|
| mera business Sharma Packaging Industries hai Faridabad mein | `/business_discovery` | `general_chat` | `/business_discovery` |
| setup continue karo | `/continue_discovery` | `/depart_assign` | `/continue_discovery` |
| inventory status batao | `/inventory_status` | `general_chat` | `/inventory_status` |
| purchase request bana do | `/purchase_request_create` | `/depart_assign` | `/purchase_request_create` |
| naya vendor ABC Paper Traders add karo | `/onboard_vendor` | `/depart_assign` | `/onboard_vendor` |

**Customer impact:** A real owner using natural language on WhatsApp today would **not** reach Business Discovery, Inventory Status, Vendor Onboarding, or Purchase Request workflows for most phrases tested.

---

## Sharma Packaging scenario notes

The scripted company (Rajesh Sharma, 2 managers, 5 workers, 3 vendors, 4 inventory SKUs) was **not provisioned** in the test database. Simulation used **natural language only** against factory 3 legacy smoke-test data. This limits realism for inventory/procurement/document phases but does not change intent-classification findings.

---

## Vendor role clarification

There is **no Vendor WhatsApp user role** in the current platform. "Vendor operations" means **owner/manager onboarding and lookup of vendor master data**, not suppliers chatting with Munshi directly.

---

## Document workflow (Phase 7)

Cannot be validated in pure NL simulation without WhatsApp file upload or equivalent. Factory 3 has **0 documents**. Parsing, suggestions, approval workflow, and discovery contribution from documents were **not exercised**.

---

## Reminder behavior (Phase 1)

Discovery profile on factory 3 shows `next_reminder_at` scheduled (+24h). **24h / 7d reminder firing was not observed** in this session (time-bound). API structure supports scheduled lookup per design.

---

## Overall product verdict

Munshi **backend and migrations are healthy**. **Manager and worker natural-language paths classify reliably** on production ML. **Owner-facing discovery, inventory, procurement, and vendor flows fail at the first step (intent classification)** on the deployed ML service.

**Platform is not ready for a natural-language-first customer rollout** until production ML is redeployed to match the backend/LLM contract.

See companion reports for role-specific experience scores and detailed interaction logs.

---

## LOCAL VALIDATION RESULTS

**Sprint:** Local Full Platform Validation — continuous Sharma Packaging story  
**Date:** 2026-06-01

### Phase 0 — Local environment

| Component | Status |
|-----------|--------|
| Local backend (:4001) | ✅ Running |
| Local ML (:8000) | ✅ Running (started for sprint) |
| Database | ✅ Connected — remote Postgres, migrations 001–007 applied |
| `pending_migrations` | **0** |

**Note:** `consumer-journey-simulation.md` was not present in repo; this file remains the master journey record. Local results appended here and in role reports.

### Continuous business story (Hindi/Hinglish, no slash commands)

**Role mapping (factory 3 test users):**

| Story role | Simulated user | Phone |
|------------|----------------|-------|
| Rajesh Sharma (Owner) | Divyansh | 918604856137 |
| Amit Verma (Manager) | Shantanu | 917452897444 |
| Suresh Gupta (Manager) | shakya | 919992732261 |
| Rahul (Worker) | Anmol | 918950411406 |

**Story arc executed:** Discovery intro → continue → reports → manager assign → worker present/issue → vendor add → inventory add/status → PR create → general chat.

**Path:** `POST /webhook/test` → backend → **prod ML** (per `.env.local`) → workflow/API → DB.

### Story outcome summary

| Phase | Local ML intent | Webhook (prod ML) | Business outcome |
|-------|-----------------|-------------------|------------------|
| Discovery | ✅ Entry intents pass | ❌ general_chat / depart_assign | Profile unchanged (92%) |
| Owner reports | Mixed | Partial (`/report` works on prod) | `/reports` API OK |
| Manager ops | ❌ Hindi assign → general_chat | Partial transfer OK | Tasks 29→31 |
| Worker ops | ❌ present/issue local; ✅ prod | ✅ present + issue persisted | Present 1, open issue 1 |
| Vendor | ✅ local `/onboard_vendor` | ❌ depart_assign | Still 1 vendor |
| Inventory | ✅ local intents | ❌ prod fail | 0 items |
| Procurement | ✅ PR create local | ❌ depart_assign | 6 PRs unchanged |
| Documents | — | — | **Not tested** (no NL upload) |

### Deployment vs product (local sprint conclusions)

| Question | Answer |
|----------|--------|
| Which failures are deployment? | Prod ML missing discovery/inventory/PR/vendor pre-classifiers; webhook uses prod ML not local |
| Which failures are product? | Hindi worker present/issue pre-classifier gaps locally; manager Hindi assign; mid-workflow re-classification; incomplete story DB mutations; no vendor chat role |
| Are local ML and backend aligned? | **Code yes, runtime config no** — local ML classifies owner flows; backend webhook still calls prod |
| Could a real customer operate? | **Not yet** — story did not stand up Sharma Packaging end-to-end |

### Local overall verdict

**Partial progress:** Local ML proves owner-entry intents are implemented. **Prod ML drift** remains the primary blocker for default dev/prod WhatsApp path. **Product gaps** remain in Hindi worker/manager phrases and workflow continuation.

**See:** `intent-validation-report.md`, `product-readiness-report.md` for detailed local ratings.
