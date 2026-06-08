# Phase 3 — Procurement Flow Discovery

**Date:** 2026-06-07  
**Scope:** Discovery only

---

## Executive Summary

Munshi procurement is **Purchase Request (PR) centric**. There is **no Purchase Order entity** in the codebase.

Procurement can be initiated via:
- REST API
- WhatsApp `/purchase_request_create`
- ML intent → workflow
- Low-stock alert button → prefilled workflow
- REST low-stock suggestions (`/purchase-requests/from-suggestion`)

Vendor management is a supporting module (`vendors` table + `/onboard_vendor` workflow).

---

## 1. Domain Model & Database

| Table | Migration | Purpose |
|-------|-----------|---------|
| `purchase_requests` | `001_traderos_foundation.sql`, `006_procurement_foundation.sql` | PR header |
| `purchase_request_items` | `006_procurement_foundation.sql` | Line items |
| `purchase_request_audit` | `006_procurement_foundation.sql` | Lifecycle audit |
| `vendors` | `001`, `002_vendors_master.sql` | Vendor master |
| `workflow_sessions` | `003_workflow_sessions.sql` | Active WA procurement state |
| `inventory_items.reorder_threshold` | `001` | Low-stock detection input |

**Key PR columns:** `factory_id`, `request_number`, `title`, `description`, `status`, `requested_by`, `approved_by`, `assigned_vendor_id`, `priority`, timestamps, `notes`.

---

## 2. Services & Controllers

### Purchase Requests module

| Layer | Path |
|-------|------|
| Module | `purchase-requests.module.ts` |
| Controller | `purchase-requests.controller.ts` — base path `purchase-requests` |
| Service | `purchase-requests.service.ts` |
| Repository | `purchase-requests.repository.ts` |
| Validation | `purchase-requests.validation.ts` |
| Suggestions | `purchase-request-suggestion.service.ts` |
| Prefill | `purchase-request-prefill.service.ts` |
| Helpers | `purchase-request-prefill.helper.ts` |

### Vendors module

| Layer | Path |
|-------|------|
| Controller | `vendors.controller.ts` — `vendors` |
| Service | `vendors.service.ts` |

---

## 3. REST Entry Points

| Method | Route | Function |
|--------|-------|----------|
| POST | `/purchase-requests` | Create PR (`submit: true` → PENDING_APPROVAL) |
| POST | `/purchase-requests/from-suggestion` | Create from low-stock suggestion key |
| GET | `/purchase-requests/suggestions/low-stock` | List auto-generated suggestions |
| GET | `/purchase-requests/prefill/low-stock` | Read-only prefill + `workflow_command` |
| PATCH | `/purchase-requests/:id` | Update draft/pending |
| PATCH | `/purchase-requests/:id/approve` | Approve |
| PATCH | `/purchase-requests/:id/reject` | Reject |
| PATCH | `/purchase-requests/:id/assign-vendor` | Assign vendor |
| PATCH | `/purchase-requests/:id/close` | Close |
| POST | `/vendors` | Create vendor |

**Verification scripts:** `backend/scripts/procurement-api-verify.mjs`, `procurement-db-check.mjs`

---

## 4. WhatsApp Entry Points

### Slash commands

| Command | Workflow | Handler |
|---------|----------|---------|
| `/purchase_request_create` | `PURCHASE_REQUEST_CREATE` | `PurchaseRequestCreateWorkflowHandler` |
| `/purchase_request_create?itemId=N` | Same + low-stock prefill | `WorkflowRouterService.startWorkflowFromCommand()` |
| `/onboard_vendor` | `ONBOARD_VENDOR` | `VendorOnboardingWorkflowHandler` |
| `/cancel` | — | Cancels any active workflow |

**Constants:** `whatsapp.constants.ts`, `contracts/intent-types.json`, `contracts/workflow-types.json`

### ML / natural language

```
User free text
  → ML POST /classify
  → intent e.g. /purchase_request_create
  → workflowRouter.startWorkflowIfRegistered()
```

Procurement phrases also appear in `business-discovery.hygiene.ts` (filtered during discovery, not a separate NL engine).

### Low-stock button (procurement bridge)

```
inventory.low_stock event
  → InventoryLowStockAlertHandler
  → button id: /purchase_request_create?itemId={id}
  → (on tap) startWorkflowFromCommand with prefill
```

---

## 5. WhatsApp Workflow State Machine (PR Create)

**Handler:** `purchase-request-create.handler.ts`  
**Type:** `PURCHASE_REQUEST_CREATE`

| Step | Constant | Purpose |
|------|----------|---------|
| Request creation | `REQUEST_CREATION` | Title, item, qty OR prefill confirm |
| Approval | `APPROVAL` | Owner/manager YES/NO on PENDING_APPROVAL PR |
| Vendor assignment | `VENDOR_ASSIGNMENT` | Pick vendor or SKIP |
| Close | `CLOSE` | YES to close PR |

**Session data:** `IPurchaseRequestCreateSessionData` in `workflow.interfaces.ts`

| Field | Low-stock prefill |
|-------|-------------------|
| `prefill_source` | `'low_stock_alert'` |
| `prefill_pending_confirm` | `true` |
| `prefill_context` | Full `IPurchaseRequestPrefill` |
| `inventory_item_id` | From alert |
| `item_quantity` | Suggested qty formula |

**PR creation from workflow:** `PurchaseRequestService.createFromWorkflowSession()` called on YES/submit.

---

## 6. Suggested Quantity Formula

Shared in `purchase-request-suggestion.service.ts` and `purchase-request-prefill.helper.ts`:

```
suggested = max(threshold * 2 - current, threshold, 1)
```

---

## 7. How Procurement Is Currently Initiated

| Channel | Supported | Entry |
|---------|-----------|-------|
| REST API | ✅ | Full CRUD + approve lifecycle |
| WhatsApp slash | ✅ | `/purchase_request_create` |
| WhatsApp NL (ML) | ✅ | Intent → workflow |
| Low-stock CTA button | ✅ (code exists) | Button → prefill workflow |
| REST suggestion accept | ✅ | `POST /from-suggestion` |
| Document OCR → PR | ❌ | Type defined, execution stub |
| Purchase Order | ❌ | Not in codebase |
| Auto-reorder job | ❌ | Only threshold + alerts |

---

## 8. Inventory Replenishment Surfaces (Related)

| Surface | Behavior |
|---------|----------|
| `inventory-transaction.service.ts` | Publishes `inventory.low_stock` on threshold cross (STOCK_OUT only) |
| `inventory.service.ts` | `listLowStockItems()` — query only |
| `/inventory_status` WhatsApp | Lists low-stock items — informational |
| `tasks.inventory-stock-warning.helper.ts` | Warns on delivery assign — **no PR creation** |

---

## 9. Vendor Flow

| Channel | Entry |
|---------|-------|
| REST | `POST /vendors` |
| WhatsApp | `/onboard_vendor` multi-step workflow |

Vendor assignment is step 3 of PR WhatsApp workflow after approval.

---

## 10. Contracts & Intent Registry

| File | Contents |
|------|----------|
| `contracts/intent-types.json` | `/purchase_request_create`, `/onboard_vendor` |
| `contracts/workflow-types.json` | `PURCHASE_REQUEST_CREATE` mapping |
| `contracts/suggestion-types.json` | `CREATE_PURCHASE_REQUEST` (not executed) |

---

## 11. Integration Tests

| Test file | Coverage |
|-----------|----------|
| `inventory-low-stock-alert.integration.spec.ts` | Alert + button payload |
| `inventory-low-stock-purchase-prefill.integration.spec.ts` | CTA → prefill → YES → PR |
| `inventory-low-stock-manager-alert.integration.spec.ts` | Manager recipients |

---

## 12. Answer: How is procurement currently initiated?

**Primary paths:**

1. **Manual WhatsApp:** User types `/purchase_request_create` or ML maps natural language → multi-step workflow → PR in `PENDING_APPROVAL` → approval → vendor → close.

2. **Low-stock driven:** Stock-out crosses `reorder_threshold` → alert with button → (if inbound routing succeeds) prefilled confirm → same PR workflow.

3. **REST driven:** Dashboard/API clients use `purchase-requests` endpoints directly; suggestions API offers parallel low-stock path without WhatsApp.

**No separate "procurement engine"** — PR workflow **is** the procurement engine for Munshi today.
