# Prompt 6 — Inventory Workflow Report

**Date:** 2026-05-29  
**Status:** Complete

---

## 1. Command

**`/inventory_create`** — registered in `WorkflowRegistry` (third workflow)

---

## 2. Steps

| Step | ID | Prompt |
|------|-----|--------|
| 1 | `ITEM_NAME` | Item name? |
| 2 | `ITEM_SKU` | SKU? |
| 3 | `ITEM_CATEGORY` | Category (list shown) |
| 4 | `ITEM_LOCATION` | Location (list shown) |
| 5 | `ITEM_UNIT` | Unit? |
| 6 | `ITEM_REORDER_THRESHOLD` | Threshold or SKIP |
| 7 | (implicit) | `InventoryService.createItem()` |

---

## 3. Example conversation

```text
/inventory_create
→ Item name? → Cement
→ SKU? → CEM001
→ Category? [list] → Raw Material
→ Location? [list] → Warehouse A
→ Unit? → bags
→ Reorder threshold? → 50
→ Item created successfully (qty 0 — use stock-in to add stock)
```

---

## 4. Integration

| Aspect | Detail |
|--------|--------|
| Engine | Generic `WorkflowEngineService` — no inventory-specific routing |
| Handler | `InventoryCreateWorkflowHandler` |
| Business logic | `InventoryService.createItem()` only |
| Access | OWNER / MANAGER (same as vendor/worker workflows) |
| Cancel / expiry | Uses Prompt 5 hardening (`/cancel`, 24h TTL) |

---

## 5. Prerequisites

Active **categories** and **locations** must exist (via REST). If none, workflow cancels with guidance.

---

## 6. Registry state

```text
/onboard_vendor   → VendorOnboardingWorkflowHandler
/onboard_worker   → WorkerOnboardingWorkflowHandler
/inventory_create → InventoryCreateWorkflowHandler
```

---

## 7. `/inventory_status` (foundation)

Not a workflow — command mapped in `processCommand`:

- `/inventory_status CEM001` → single item status
- `/inventory_status` → list low-stock items (up to 15)

Managers/owners only.

---

## 8. Tests

`inventory-create.handler.spec.ts` — happy path workflow test  
Registry spec — verifies third handler registration

---

*Vendor and worker onboarding regression: all prior workflow tests pass.*
