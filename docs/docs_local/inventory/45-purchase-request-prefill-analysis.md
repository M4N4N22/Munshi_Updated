# Phase 3.4 — Purchase Request Prefill Analysis

**Run date:** 2026-06-06  
**Scope:** Context-aware prefill from low stock alert → existing purchase request workflow

---

## 1. Pre-Check — Purchase Request Module Exists

**Result:** **NOT BLOCKED** — full purchase request stack is implemented.

| Layer | Location |
|-------|----------|
| REST API | `purchase-requests.controller.ts` |
| Create DTO | `CreatePurchaseRequestDto` |
| Service | `purchase-requests.service.ts` — `createPurchaseRequest`, `createFromWorkflowSession`, approve/reject |
| Suggestions (auto-create — **not used for CTA**) | `purchase-request-suggestion.service.ts` — `createFromSuggestion()` |
| WhatsApp workflow | `handlers/purchase-request-create.handler.ts` |
| Session model | `IPurchaseRequestCreateSessionData` in `workflow.interfaces.ts` |
| Workflow start | `WorkflowRouterService.startWorkflowFromCommand()` |

---

## 2. Purchase Request Creation API

### REST — `POST /purchase-requests`

**Required fields (`CreatePurchaseRequestDto`):**

| Field | Type | Notes |
|-------|------|-------|
| `factory_id` | number | Tenant |
| `requested_by` | number | User id |
| `title` | string | Request title |

**Optional fields:**

| Field | Type | Notes |
|-------|------|-------|
| `description` | string | |
| `priority` | enum | LOW / NORMAL / HIGH / URGENT |
| `notes` | string | |
| `items[]` | array | `item_name`, `requested_quantity` required; `inventory_item_id`, `unit`, `notes` optional |
| `submit` | boolean | When true → `PENDING_APPROVAL` |

### WhatsApp workflow — `/purchase_request_create`

Multi-step flow in `PurchaseRequestCreateWorkflowHandler`:

1. Title → item name → quantity → add more (YES/NO)
2. On NO → `createFromWorkflowSession({ submit: true })`
3. If owner/manager → optional inline approve → vendor assign → close

**Approval:** `approvePurchaseRequest` / `rejectPurchaseRequest` — unchanged.

---

## 3. Low Stock Event Payload (Phase 3.1)

From `inventory.low-stock.helper.ts`:

| Field | Prefill use |
|-------|-------------|
| `factory_id` | Factory scope |
| `inventory_item_id` | **Primary CTA key** |
| `sku` | Display in alert + prefill prompt |
| `item_name` | `item_name`, `title` |
| `current_quantity` | Display + qty formula input |
| `reorder_threshold` | Suggested qty formula |
| `previous_quantity` | Display only |
| `reference_type` / `reference_id` | Not used for prefill |

**Not in payload:** location, category — available via `InventoryService.findItem()` if needed later.

---

## 4. Prefill Field Mapping

| Low stock source | Session / form field | Notes |
|------------------|----------------------|-------|
| `inventory_item_id` | `inventory_item_id` | Links PR line to inventory |
| `item_name` | `item_name`, `title` prefix | `Restock {name}` |
| `sku` | Prompt display | From item lookup |
| `current_quantity` + `reorder_threshold` | `item_quantity` | `max(threshold×2 − current, threshold, 1)` — same as suggestion service |
| `unit` | `item_unit` | From item record |
| — | `prefill_pending_confirm` | User must YES/NO/qty before submit |
| — | `prefill_source: low_stock_alert` | Traceability |

**Explicitly NOT mapped:** auto-submit, auto-approval, inventory writes.

---

## 5. Prefill Transport Contract

| Channel | Mechanism |
|---------|-----------|
| WhatsApp CTA | `/purchase_request_create?itemId={inventory_item_id}` |
| REST (read-only) | `GET /purchase-requests/prefill/low-stock?factory_id=&inventory_item_id=` |
| Workflow session | `startWorkflowWithSessionData()` — no DB writes until user confirms |

Command parsing: `parsePurchaseRequestItemIdFromCommand()` accepts `itemId` or `item_id` query param.

Registry: `matchWorkflowStartCommand()` extended for `?` suffix on slash commands.

---

## 6. UI Entry Points

| Entry | Behavior after 3.4 |
|-------|-------------------|
| Low stock WhatsApp alert | Contextual CTA with `itemId` |
| `/purchase_request_create` (no param) | Unchanged manual flow |
| `/purchase_request_create?itemId=N` | Prefilled confirm step |
| REST prefill endpoint | JSON for future web UI |
| `POST .../from-suggestion` | Unchanged — creates PR immediately (not alert path) |

---

## Conclusion

Prefill is a **transport + session** layer on top of the existing purchase request workflow. No new approval rules, no auto-creation, no inventory changes.
