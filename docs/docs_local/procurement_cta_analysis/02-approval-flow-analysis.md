# Phase 2 — Approval Flow Discovery

**Date:** 2026-06-07  
**Scope:** Discovery only

---

## Executive Summary

Munshi has **two approval layers**:

1. **Purchase Request status machine** — fully implemented (REST + WhatsApp workflow)
2. **Generic `approval_requests` table** — schema exists; service is a **stub** (`NOT_IMPLEMENTED`)

Document-suggestion approval uses a separate lightweight workflow (`SUGGESTION_APPROVAL`).

Reusable YES/NO/SKIP/cancel patterns exist across workflows and can inform procurement CTA integration.

---

## 1. Purchase Request Approval (Primary)

### Status state machine

**File:** `backend/src/services/purchase-requests/purchase-requests.constants.ts`  
**Enforcement:** `PurchaseRequestValidationService.assertStatusTransition()` in `purchase-requests.validation.ts`

```
DRAFT
  → PENDING_APPROVAL (submit)
  → APPROVED | REJECTED (owner/manager)
APPROVED
  → ASSIGNED_TO_VENDOR | CLOSED
ASSIGNED_TO_VENDOR
  → CLOSED | APPROVED (vendor removed)
REJECTED, CLOSED = terminal
```

### REST approval actions

**Controller:** `backend/src/services/purchase-requests/purchase-requests.controller.ts`  
**Service:** `PurchaseRequestService`

| Action | Method | Role gate |
|--------|--------|-----------|
| Submit | `createPurchaseRequest(submit: true)` | Requester |
| Approve | `approvePurchaseRequest()` | OWNER or MANAGER |
| Reject | `rejectPurchaseRequest()` | OWNER or MANAGER |
| Assign vendor | `assignVendor()` | OWNER or MANAGER |
| Close | `closePurchaseRequest()` | OWNER or MANAGER |

**Audit:** Every transition → `purchase_request_audit` via `PurchaseRequestRepository.appendAudit()`.

### WhatsApp approval step

**Handler:** `backend/src/services/workflow/handlers/purchase-request-create.handler.ts`  
**Step:** `PURCHASE_REQUEST_CREATE_STEP.APPROVAL` → `handleApproval()`

After PR is created with `submit: true` → status `PENDING_APPROVAL`, workflow advances to APPROVAL step and prompts approver (owner/manager in session) with YES/NO.

**Confirmation tokens** (`purchase-requests.validation.ts`):

| YES | NO |
|-----|-----|
| yes, y, ha, haan, approve, ok | no, n, nahi, reject, cancel |

---

## 2. Low-Stock Prefill Confirmation (Pre-approval)

Before PR creation, low-stock CTA path uses **prefill confirmation**:

**Files:**
- `purchase-request-prefill.helper.ts` — `buildPurchaseRequestPrefillPrompt()`
- `purchase-request-create.handler.ts` — `handlePrefillConfirmation()`

| User reply | Behavior |
|------------|----------|
| YES | Create PR from session (`createFromWorkflowSession`, submit=true) → PENDING_APPROVAL |
| NO | Clear prefill, restart manual title entry |
| Numeric qty | Adjust `item_quantity`, re-prompt |

**Session flag:** `prefill_pending_confirm: true` in `workflow_sessions.session_data`.

---

## 3. Generic Approval Requests (Stub)

| Layer | Path | Status |
|-------|------|--------|
| Schema | `backend/src/services/approvals/approvals.schema.ts` → `approval_requests` | Table exists |
| Constants | `approvals.constants.ts` → `APPROVAL_ENTITY_TYPE.PURCHASE_REQUEST` | Defined, unused |
| Service | `approvals.service.ts` | All methods return `NOT_IMPLEMENTED_RESPONSE` |

**Conclusion:** Do not plan integration through `approval_requests` until service is implemented.

---

## 4. Document Suggestion Approval

**Handler:** `backend/src/services/workflow/handlers/suggestion-approval.handler.ts`  
**Workflow type:** `SUGGESTION_APPROVAL`  
**Step:** Single `CONFIRM` step

**Trigger:** `POST documents/suggestions/:suggestionId/approve-workflow` via `suggestion-workflow-trigger.service.ts`

**Tokens:** `SUGGESTION_CONFIRM_YES` / `SUGGESTION_CONFIRM_NO` from `documents.constants.ts`

**Note:** `CREATE_PURCHASE_REQUEST` suggestion type exists in contracts but **execution is not implemented** in `SuggestionExecutionService`.

---

## 5. Task-Inventory NL Confirmation

**Files:**
- `task-inventory-confirmation.service.ts`
- `task-inventory-nl.constants.ts` — `TASK_INVENTORY_CONFIRM_REPLIES` / `TASK_INVENTORY_CANCEL_REPLIES`

Pattern: multi-step workflow ending in explicit CONFIRM/YES before side effects.

---

## 6. Inventory CSV Import Confirmation

**File:** `backend/src/modules/whatsapp/inventory-bulk-import.service.ts`

| Phase | User action |
|-------|-------------|
| `awaiting_upload` | Send CSV file |
| `awaiting_confirm` | Reply `CONFIRM` or `CANCEL` |

**Storage:** In-memory per phone (15 min TTL).  
**Routing:** Checked in `handleIncomingMessage` **before** workflow session resolution.

---

## 7. Global Cancel Pattern

| Mechanism | File |
|-----------|------|
| `/cancel` command | `workflow.constants.ts` → `WORKFLOW_CANCEL_COMMAND` |
| Router | `WorkflowRouterService.cancelWorkflow()` |
| WhatsApp | Clears workflow + inventory CSV + team CSV awaiting |

Used consistently across all multi-step flows.

---

## 8. SKIP Pattern

**Constant:** `WORKFLOW_SKIP_KEYWORDS` in `workflow.constants.ts`

Used in:
- Vendor onboarding (optional fields)
- PR vendor assignment step (`handleVendorAssignment`)

---

## 9. Reusable Patterns Summary

| Pattern | Reuse for procurement CTA |
|---------|---------------------------|
| Workflow session + step machine | ✅ Already used by PR create |
| YES/NO Hindi tokens | ✅ Already in prefill + approval |
| `/cancel` escape hatch | ✅ Already global |
| Status transition guard | ✅ PR service |
| Audit trail per action | ✅ `purchase_request_audit` |
| Prefill + confirm before write | ✅ Low-stock path exists |
| In-memory awaiting (CSV) | ❌ Not applicable to PR CTA |
| Generic `approval_requests` | ❌ Not ready |

---

## 10. Role Gates

**File:** `workflow-engine.service.ts` → `ensureCanRunWorkflow()`

Only **OWNER** and **MANAGER** can start procurement workflows. **WORKER** receives `ForbiddenException`.

Low-stock alerts are sent to owners + managers — aligned with this gate.

---

## 11. Key Files Index

| Concern | Path |
|---------|------|
| PR validation / YES-NO | `purchase-requests.validation.ts` |
| PR service lifecycle | `purchase-requests.service.ts` |
| PR workflow handler | `handlers/purchase-request-create.handler.ts` |
| Prefill prompt | `purchase-request-prefill.helper.ts` |
| Suggestion approval | `handlers/suggestion-approval.handler.ts` |
| Approvals stub | `approvals.service.ts` |
| Workflow cancel | `workflow-engine.service.ts` |
