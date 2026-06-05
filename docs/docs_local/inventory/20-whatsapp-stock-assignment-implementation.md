# Phase 0.7 — WhatsApp Assign With Stock Implementation

**Run date:** 2026-06-06

---

## 1. Files Modified

| File | Change |
|------|--------|
| `backend/src/modules/whatsapp/whatsapp.constants.ts` | Added `ASSIGN_DELIVERY`, command hint |
| `backend/src/modules/whatsapp/whatsapp.templates.ts` | Error/success Hinglish templates |
| `backend/src/modules/whatsapp/whatsapp.service.ts` | Slash bypass, parser, `handleAssignDelivery()` |

### Not modified (per scope)

- `InventoryRepository`, `InventoryTransactionService`
- `task_inventory_lines` schema / migrations
- `tasks.inventory.helper.ts`
- Integration test file
- Domain events, CSV, Zoho, ML contracts

---

## 2. Commands Added

| Constant | Command | Hint |
|----------|---------|------|
| `COMMANDS.ASSIGN_DELIVERY` | `/assign_delivery` | `/assign_delivery @<worker> <SKU> <qty>` |

Registered in `COMMAND_HINTS` for owner home / help surfaces.

---

## 3. Validation Logic

| Input | Validation | Error (Hinglish) |
|-------|------------|------------------|
| Format | `@worker SKU qty` after command token | `waAssignDeliveryInvalidFormat()` |
| Role | Owner or manager | `ForbiddenException` (existing guard) |
| Worker | `resolveMention()` | `❌ Worker nahi mila.` / ambiguous list |
| SKU | `findItemBySku(factoryId, sku)` | `❌ SKU nahi mila.` |
| Quantity | `parsePositiveQuantity()` | `❌ Quantity valid number hona chahiye.` |
| `@all` | Rejected | Invalid format |

On success → `assignToUser()` with one `STOCK_OUT` inventory line.

---

## 4. Task / Line Creation

Uses existing `TasksService.assignToUser()`:

```typescript
inventory_lines: [{
  inventory_item_id: item.id,
  quantity_expected: formatQuantity(quantity),
  movement_type: TASK_INVENTORY_MOVEMENT_TYPE.STOCK_OUT,
}]
```

Description: `[DELIVERY] {name} {unit} ({sku}) x{qty}`

---

## 5. Success Response

```text
✅ Delivery task create ho gaya.

👤 Worker: Ramesh
📦 Item: Cement 50kg
🔢 Qty: 5

Task worker ko assign kar diya gaya hai.
```

Worker still receives standard assignment notification via existing `notifyWorkerTaskAssigned()`.

---

## 6. Backward Compatibility

| Path | Impact |
|------|--------|
| `/assign` | **Unchanged** |
| `/complete` + inventory movement | **Unchanged** |
| Phase 0.6 completion notifications | **Unchanged** |
| Admin task APIs | **Unchanged** |
| Integration tests | **Unchanged** — 12/12 PASS |

New command is additive; no existing command signatures altered.

---

## 7. Validation Results

| Check | Result |
|-------|--------|
| `yarn test:integration` | **12/12 PASS** |
| `npx nest start` bootstrap | **PASS** (Nest application successfully started; port 4001 in use if dev server running) |
