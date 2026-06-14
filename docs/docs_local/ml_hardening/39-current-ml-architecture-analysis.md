# Phase 3.5 — Current ML Architecture Analysis

**Date:** 2026-06-10  
**Scope:** As-implemented trace — no proposed fixes

---

## End-to-end path

```
WhatsApp (Olli/Meta)
    ↓ webhook POST
backend: WhatsAppController → WhatsAppService.handleIncomingMessage()
    ↓ routing layers (pre-ML)
    ├─ Interactive buttons → OwnerHomeService / team setup
    ├─ isHelpRequest → deliverHelpCommand (no ML)
    ├─ isCancelCommand → cancel workflow + bulk import sessions
    ├─ inventory import review (CONFIRM) → InventoryBulkImportService
    ├─ active workflow_sessions → handleActiveWorkflowMessage OR slash → processCommand
    ├─ slash bypass (mgr*, assign_delivery) → processCommand
    ├─ workflow start commands → WorkflowRouter.startWorkflowFromCommand
    ├─ low-stock CTA → purchase workflow (no ML)
    ├─ taskInventoryNl.tryHandleFreeText → POST /extract/task-inventory (separate ML path)
    └─ routeMlFallback → POST ML_URL/classify?message=...
            ↓
ml: main.py classify()
    ├─ CommandParser.parse() (slash prefix only)
    └─ IntentClassifier.classify()
            ↓
backend: parseMlClassifyResponse → normalizeIntentCommand
    ├─ general_chat → routeGeneralChat (role-based home/hints)
    ├─ startWorkflowIfRegistered → workflow handler
    └─ processCommand → role enforcement + services
```

---

## Entry points

| Entry | File | ML invoked? |
|-------|------|-------------|
| WhatsApp text | `whatsapp.service.ts` `handleIncomingMessage` | Sometimes |
| WhatsApp document | `handleIncomingDocument` | No (import/session) |
| Interactive CTA | `resolveInteractiveActionId` | No |
| Direct slash | `parseDirectSlashCommand` | No |
| NL free text (stock task) | `task-inventory-nl.orchestrator.ts` | `/extract/task-inventory` only |
| ML classify API | `ml/main.py` `/classify` | Yes (standalone) |

---

## Services involved

| Layer | Service | Role |
|-------|---------|------|
| Backend | `WhatsAppService` | Routing orchestration |
| Backend | `WorkflowRouterService` | Multi-step workflows |
| Backend | `InventoryBulkImportService` | CSV session (non-workflow table) |
| Backend | `TaskInventoryNlOrchestratorService` | Parallel NL stock-task path |
| ML | `CommandParser` | Slash command passthrough |
| ML | `IntentClassifier` | Hybrid regex + LLM |
| ML | `TaskInventoryExtractor` | Separate endpoint for task_kind |
| ML | `DateTimeExtractor` | Deadline slot extraction |

---

## API contracts

### `POST /classify?message={text}`

**Request:** Query param `message` only — no body, no role, no session.

**Response** (`ClassifyResponse` / `classify-response.json`):

| Field | Type | Purpose |
|-------|------|---------|
| intent | string | Slash intent or `general_chat` |
| id | int/string/null | Task/issue id |
| worker_slug | string/null | Assignee |
| depart_slug | enum/null | operations, sales, purchase, it |
| deadline | string/null | ISO datetime |
| reject_reason | string/null | mgrreject |
| message | string/null | general_chat reply text |
| task_description | string/null | assign_clarify |

**No confidence field in contract.**

### `POST /extract/task-inventory?message={text}`

Separate extraction for `task_kind`, SKU, qty, worker — used before main classify on backend.

---

## Backend routing after ML

1. `general_chat` → LLM chat reply; owner/manager get home menu
2. Workflow intents → `startWorkflowIfRegistered`
3. Other intents → `processCommand` with slots
4. Role checks in `ensureManager` / `ensureWorker` **after** ML

---

## Key files

| File | Purpose |
|------|---------|
| `backend/src/modules/whatsapp/whatsapp.service.ts` | Inbound routing |
| `ml/main.py` | FastAPI entry |
| `ml/bot_engine.py` | Classifier implementation |
| `backend/contracts/intent-types.json` | Contract catalog (partially consumed) |
| `ml/contracts/intent-types.json` | Mirror catalog |
