# Feature Regression Audit

**Run date:** 2026-06-08  
**Method:** Code presence + targeted test suites (no live service replay)

---

## Phase 0 — Task system, attendance, departments, workflow

| Feature | Status | Evidence |
|---------|--------|----------|
| Task system | **PRESENT** | `inventory.service`, task handlers, integration specs |
| Attendance (`/present`) | **PRESENT** | ML classify + workflow routing |
| Departments | **PRESENT** | `departments-owner-head.spec.ts` passes |
| Workflow engine | **PRESENT** | `workflow.registry.spec.ts`, `workflow-hardening.spec.ts` — 8 handlers |

**Tests:** Workflow registry + hardening pass in full 340 suite.

---

## Phase 1 — Document parsing, inventory ingestion, CSV imports

| Feature | Status | Evidence |
|---------|--------|----------|
| Document parsing | **PRESENT** | `document-processing.orchestrator`, ML `/parse` adapter |
| Inventory ingestion | **PRESENT** | `inventory-import-upload.service`, migrations `004` |
| CSV imports | **PRESENT** | `inventory-bulk-import.service.spec.ts` passes |
| WhatsApp CSV template | **PRESENT** | `inventory-csv.template.spec.ts` passes |

**Tests:** Document ingestion scenarios, CSV parse specs pass.

---

## Phase 2 — Zoho integration foundation

| Feature | Status | Evidence |
|---------|--------|----------|
| OAuth flow | **PRESENT** | `zoho-oauth.service.ts`, state service specs pass |
| Integration storage | **PRESENT** | `token-crypto.service`, migrations `011` |
| Stock push | **PRESENT** | `zoho-stock-push.handler.spec.ts` passes |
| Scheduled sync | **PRESENT** | `zoho-scheduled-sync.constants`, pull sync service |

**Tests:** Zoho handler, OAuth state, inventory client specs pass.

---

## Phase 3 — Inventory workflows, purchase requests, alerts

| Feature | Status | Evidence |
|---------|--------|----------|
| Inventory workflows | **PRESENT** | Low stock, domain events, suggestion queue |
| Purchase requests | **PRESENT** | `purchase-requests.service.spec.ts` passes |
| Low stock events | **PRESENT** | `inventory.low-stock.helper.spec.ts` passes |
| Notifications | **PRESENT** | `inventory-low-stock-alert.recipients` specs |
| Purchase prefill | **PRESENT** | `purchase-request-prefill.helper.spec.ts` passes |

---

## Phase 4 — Task inventory NL workflow

| Feature | Status | Evidence |
|---------|--------|----------|
| Task inventory extraction | **PRESENT** | ML `/extract/task-inventory`, resolution service |
| Inventory resolution | **PRESENT** | `inventory-resolver.service.spec.ts` passes |
| Worker disambiguation | **PRESENT** | `disambiguation.util.spec.ts`, orchestrator specs |
| Workflow sessions | **PRESENT** | `workflow-session.service.spec.ts` — expiry on `updated_at` |
| Confirmation flows | **PRESENT** | `theek hai` + synonym tests in handler spec |
| Delivery task creation | **PRESENT** | `task-inventory-creation.service.spec.ts` — STOCK_OUT E2E |
| Slash command bypass | **PRESENT** | `parseDirectSlashCommand()` + whatsapp.constants spec |

**Phase 4 test count:** 88/88 in targeted replay.

---

## Security regression check

| Control | Status |
|---------|--------|
| `/webhook/test` gated | **PRESENT** |
| `/resolve/*` x-secret guard | **PRESENT** |
| No live API keys in examples | **PRESENT** |

---

## Verdict

**Feature regression audit: PASS**

No missing functionality detected relative to prior phase signoffs. All phase artifacts and targeted tests confirm behavior preserved.
