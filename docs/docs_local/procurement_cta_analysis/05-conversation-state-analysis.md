# Phase 5 — Conversation State Discovery

**Date:** 2026-06-07  
**Scope:** Discovery only

---

## Executive Summary

Munshi uses **three state patterns** for multi-turn WhatsApp conversations:

1. **PostgreSQL workflow sessions** — durable, 24h TTL (procurement, onboarding, task-inventory NL)
2. **In-memory awaiting maps** — ephemeral CSV upload/review (15–30 min TTL)
3. **Stateless interactive routing** — owner home buttons (no session row)

Procurement CTA integration should use pattern #1 — already implemented for low-stock prefill.

---

## 1. Workflow Sessions (Primary)

### Schema

**Table:** `workflow_sessions`  
**Model:** `backend/src/services/workflow/workflow.schema.ts`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | int PK | |
| `factory_id` | int | Tenant scope |
| `phone_number` | varchar(32) | **One active session per phone** |
| `workflow_type` | varchar(64) | e.g. `PURCHASE_REQUEST_CREATE` |
| `current_step` | varchar(64) | Step machine position |
| `session_data` | JSONB | Workflow-specific payload |
| `status` | varchar(32) | ACTIVE, COMPLETED, CANCELLED, EXPIRED |
| `created_at`, `updated_at` | timestamp | TTL based on `updated_at` |

### Services

| File | Key APIs |
|------|----------|
| `workflow-session.service.ts` | `createSession`, `getActiveSession`, `resolveActiveSession`, `updateSession`, `completeSession`, `cancelSession`, `expireSession` |
| `workflow-session.repository.ts` | DB access |
| `workflow-engine.service.ts` | `WorkflowEngineService` (step dispatch), `WorkflowRouterService` (routing) |
| `workflow.registry.ts` | Command → handler map |
| `workflow-expiry.cron.ts` | Hourly stale session expiry |

### TTL

**Config:** `WORKFLOW_SESSION_TTL_HOURS` env (default **24 hours**)  
**Lazy expiry:** On `resolveActiveSession(phone)` access  
**Cron:** `expireStaleActiveSessions()` hourly

### Conflict rule

`createSession()` throws `ConflictException` if phone already has ACTIVE session:

> "You already have an active workflow. Please complete or cancel it before starting a new one."

**Risk for CTA:** User with open onboarding/inventory workflow cannot start PR from low-stock button until `/cancel`.

---

## 2. Registered Workflow Types

**File:** `workflow.constants.ts`

| Type | Start command | Handler |
|------|---------------|---------|
| `ONBOARD_VENDOR` | `/onboard_vendor` | Vendor onboarding |
| `ONBOARD_WORKER` | (workflow start) | Worker onboarding |
| `INVENTORY_CREATE` | `/inventory_create` | Add stock item |
| `SUGGESTION_APPROVAL` | `/suggestion_approve` | Document suggestion |
| **`PURCHASE_REQUEST_CREATE`** | **`/purchase_request_create`** | **Procurement** |
| `BUSINESS_DISCOVERY` | `/business_discovery` | Owner discovery |
| `ASSIGN_CLARIFY` | assign clarify | Missing @worker |
| `TASK_INVENTORY_CREATION` | NL-driven | Delivery/issue tasks |

---

## 3. Session Resolution in WhatsApp Router

**File:** `whatsapp.service.ts` (~449–470)

```
resolveActiveSession(phone)
  ├─ expired? → return expired message
  ├─ session exists? → handleActiveWorkflowMessage() [takes priority over new workflow start]
  └─ no session → matchWorkflowStartCommand() → startWorkflowFromCommand()
```

**Implication:** Active session **blocks** new workflow starts including low-stock CTA — unless user sends direct slash bypass or `/cancel` first.

---

## 4. Purchase Request Session Data (Low-Stock CTA)

**Interface:** `IPurchaseRequestCreateSessionData` in `workflow.interfaces.ts`

| Field | Low-stock CTA value |
|-------|---------------------|
| `prefill_source` | `'low_stock_alert'` |
| `prefill_pending_confirm` | `true` |
| `prefill_context` | `IPurchaseRequestPrefill` object |
| `title` | Auto-generated from item |
| `description` | Low stock summary string |
| `item_name` | From inventory item |
| `item_quantity` | Suggested qty |
| `item_unit` | From inventory item |
| `inventory_item_id` | From button `itemId` |
| `purchase_request_id` | Set after YES submit |

**Steps after CTA tap:**

```
REQUEST_CREATION (prefill_pending_confirm)
  → user YES → create PR → APPROVAL
  → user NO → manual entry
  → user qty → adjust → re-prompt
APPROVAL → VENDOR_ASSIGNMENT → CLOSE
```

---

## 5. In-Memory Awaiting States

### Inventory CSV import

**File:** `inventory-bulk-import.service.ts`

| Phase | Trigger | Confirm |
|-------|---------|---------|
| `awaiting_upload` | `/inventory_import_csv` or `home_add_stock` | Send CSV file |
| `awaiting_confirm` | After review summary | `CONFIRM` / `CANCEL` |

**Storage:** `Map<phone, PendingCsv>` in process memory  
**TTL:** 15 min (`INVENTORY_CSV_PENDING_TTL_MS`, `INVENTORY_CSV_REVIEW_TTL_MS`)  
**Routing priority:** Checked **before** workflow session in `handleIncomingMessage`

### Team CSV import

**File:** `team-bulk-import.service.ts`

| Phase | Trigger |
|-------|---------|
| `awaiting_upload` | `home_bulk_csv` |

**TTL:** 30 min — no CONFIRM step (imports on upload).

---

## 6. Confirmation Flow Patterns

| Flow | Storage | Confirm tokens | Cancel |
|------|---------|----------------|--------|
| PR prefill (low-stock CTA) | `workflow_sessions` | YES / NO / numeric qty | `/cancel` |
| PR approval step | `workflow_sessions` | YES / NO (approve/reject) | `/cancel` |
| Inventory CSV review | In-memory | CONFIRM / CANCEL | `/cancel` |
| Suggestion approval | `workflow_sessions` | YES / NO | `/cancel` |
| Task-inventory NL | `workflow_sessions` | CONFIRM/YES/haan/ok vs CANCEL/NO | `/cancel` |
| Vendor onboarding | `workflow_sessions` | Field-by-field + SKIP | `/cancel` |

**Shared validation:** `purchase-requests.validation.ts` → `isYes()`, `isNo()`  
**Shared skip:** `WORKFLOW_SKIP_KEYWORDS`

---

## 7. Context Tracking

| Context | How resolved |
|---------|--------------|
| User + factory + role | `WorkflowRouterService.resolveUserContext(phone)` via `UsersService.findByPhone()` |
| Factory name | `MessagingService.getFactoryName()` |
| Workflow handler | `WorkflowRegistry.getHandlerByCommand()` |

No separate "conversation context" table beyond `workflow_sessions.session_data`.

---

## 8. Domain Events (Async, Not Conversation State)

**Table:** `domain_events`  
**Statuses:** PENDING → PROCESSING → COMPLETED / FAILED

Low-stock alerts originate here but do **not** store per-user conversation state — only the downstream `workflow_sessions` row does after CTA tap.

---

## 9. Reusable Patterns for Procurement CTA

| Pattern | Applicable? | Notes |
|---------|-------------|-------|
| Workflow session + JSONB `session_data` | ✅ | Already used |
| Prefill + `prefill_pending_confirm` | ✅ | Low-stock path complete |
| `/cancel` global escape | ✅ | Works today |
| One session per phone | ⚠️ | May block CTA if other workflow active |
| In-memory awaiting | ❌ | Wrong durability model for PR |
| Title→id interactive mapping | ❌ Missing for Purchase karein | See gap analysis |

---

## 10. Key Files Index

| Concern | Path |
|---------|------|
| Session service | `workflow-session.service.ts` |
| Session schema | `workflow.schema.ts` |
| Router | `workflow-engine.service.ts` |
| PR session interface | `workflow.interfaces.ts` |
| WhatsApp session priority | `whatsapp.service.ts` |
| Inventory CSV state | `inventory-bulk-import.service.ts` |
| Team CSV state | `team-bulk-import.service.ts` |
