# Workflow Validation Report

**Scope:** Validate that classified intents map to registered backend workflows and expected step behavior (design-level; E2E WhatsApp not executed).

---

## Registered workflows (backend)

| Workflow Type | Start Command | Alias | Handler | Role gate |
|---------------|---------------|-------|---------|-----------|
| `ONBOARD_VENDOR` | `/onboard_vendor` | — | vendor-onboarding | Owner/Manager |
| `ONBOARD_WORKER` | `/onboard_worker` | — | worker-onboarding | Owner/Manager |
| `INVENTORY_CREATE` | `/inventory_create` | — | inventory-create | Owner/Manager |
| `SUGGESTION_APPROVAL` | `/suggestion_approve` | — | suggestion-approval | Owner/Manager |
| `PURCHASE_REQUEST_CREATE` | `/purchase_request_create` | — | purchase-request-create | Owner/Manager |
| `BUSINESS_DISCOVERY` | `/business_discovery` | `/continue_discovery` | business-discovery | Owner/Manager |

Workers **cannot** start workflows (`ForbiddenException`).

---

## Workflow reachability via natural language (production ML)

| Workflow | NL reachable today? | Evidence |
|----------|---------------------|----------|
| Task assign/transfer/reject/self | **Yes** | Manager phrases → correct intents |
| Attendance present/absent | **Yes** | Worker phrases → correct intents |
| Task complete / issue | **Yes** | Worker phrases → correct intents |
| Reports / issues list | **Yes** | Owner phrases → `/report`, `/issues` |
| Business Discovery | **No** | Discovery phrases → `general_chat` or `/depart_assign` |
| Vendor onboarding | **No** | Vendor add → `/depart_assign` |
| Inventory create | **No** | Item add → `/depart_assign` |
| Inventory status | **No** | Status phrases → `general_chat` |
| Purchase request | **No** | PR phrases → `/depart_assign` |
| Suggestion approval | **Not tested** | Requires document upload path |
| Worker onboarding | **Not tested** | No phrase in simulation matrix |

---

## Session persistence (design validation)

Per prior architecture reports and migration 003:

- Workflow state stored in `workflow_sessions` table
- No in-memory-only sessions
- `/cancel` supported globally
- Business Discovery supports pause/resume via profile + session

**Not validated E2E** in this QA run (no active WhatsApp session created).

---

## Dangerous misroutes

When production ML returns `/depart_assign` for owner procurement or vendor messages:

1. Backend creates/routes a **department task**, not a PR or vendor record
2. User believes they ordered stock or registered a vendor
3. **Silent wrong outcome** — worse than an error message

Examples:

- "purchase request bana do" → `/depart_assign` (purchase department task, not PR)
- "naya vendor ABC Paper Traders add karo" → `/depart_assign` (not vendor onboarding)

---

## Document → workflow chain (design only)

Expected path:

```
Upload → Parse → Suggestions → Queue → /suggestion_approve workflow → Execute → Discovery boost
```

**Status:** Not executed — 0 documents on factory 3; file upload channel not in QA scope.

---

## Procurement workflow steps (backend design)

`REQUEST_CREATION` → `APPROVAL` → `VENDOR_ASSIGNMENT` → `CLOSE`

Unreachable via NL until `/purchase_request_create` intent fires.

---

## Verdict

Workflow **engine and handlers appear complete** for implemented domains. **Natural-language workflow entry is broken** for discovery, inventory, vendor, and procurement on production ML. Task/attendance/issue workflows **entry layer passes** QA.

---

## LOCAL VALIDATION RESULTS

**Method:** Continuous story via `POST /webhook/test` — simulates Message → Intent → Workflow → Backend → DB.

### Workflows observed

| Workflow | Local ML would start? | Webhook actually started? | DB changed? |
|----------|----------------------|---------------------------|-------------|
| BUSINESS_DISCOVERY | Yes (first message) | Unlikely (prod → general_chat) | No — profile unchanged |
| ONBOARD_VENDOR | Yes | No (prod → depart_assign) | No new vendor |
| INVENTORY_CREATE | Yes | No | 0 items |
| PURCHASE_REQUEST_CREATE | Yes | No | 6 PRs unchanged |
| Attendance `/present` | No (local) | Yes (prod) | Present count +1 |
| Issue `/issue` | No (local) | Yes (prod) | Open issues +1 |
| Task `/complete` | Yes | Yes | Pending tasks remain |

### Workflow continuation

Multi-step discovery (menu `1`, business name, address, `pause`, resume) — all mid-session replies returned webhook `ok` but local ML classified each as `general_chat`. **Workflow session continuation not validated** from responses (webhook returns only `ok`/`error`).

Tasks total increased **29 → 31** during sprint — side effect of misrouted `/depart_assign` from prod ML.

### Local workflow reliability: **5/10**

Backend executes when prod ML intent correct (attendance, issue). Owner workflows blocked by prod ML on default path. Local ML correct at entry but not wired to webhook.
