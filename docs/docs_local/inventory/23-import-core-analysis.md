# Phase 1.2 — Import Processing Core Analysis

**Run date:** 2026-06-06  
**Scope:** CSV row processing engine only (no upload, WhatsApp, or template download)

---

## 1. Existing Inventory APIs

### Services reused (public surface only)

| API | Role in import |
|-----|----------------|
| `InventoryRepository.findFactoryById()` | Factory existence gate before processing |
| `InventoryRepository.findCategoryByName()` | Resolve `category` column → `category_id` (case-insensitive `iLike`) |
| `InventoryRepository.findLocationByName()` | Resolve `location` column → `location_id` |
| `InventoryRepository.findItemBySku()` | Upsert lookup key `(factory_id, sku)` |
| `InventoryRepository.createItem()` | New SKU path — always `current_quantity = 0` |
| `InventoryRepository.itemModel.update()` | Existing SKU metadata patch (within row transaction) |
| `InventoryTransactionService.recordStockIn()` | **Only** path for quantity additions (R-D01) |
| `inventory.validation` helpers | `normalizeSku`, `normalizeInventoryName`, `normalizeUnit`, `formatQuantity`, `assertFactoryId` |

### Explicitly not modified

| Component | Status |
|-----------|--------|
| `InventoryTransactionService` internals | Unchanged |
| `InventoryRepository` transaction/movement logic | Unchanged |
| Task inventory integration (`tasks.service`, `tasks.inventory.helper`) | Unchanged |
| Phase 0 runtime behavior | Unchanged |

### Input contract

`processImport()` accepts **validated** `InventoryCsvRow[]` from `parseInventoryCsvText()` (Phase 1.1). The import service additionally normalizes SKU/name/unit defensively so programmatic callers and integration tests behave consistently with parser output.

---

## 2. Upsert Design

**Key:** `(factory_id, sku)` after `normalizeSku()`.

### Case 1 — SKU does not exist

```text
createItem(current_quantity = 0)
  → if quantity > 0: recordStockIn(reference_type = CSV_IMPORT, reference_id = batchId)
  → status: added
```

### Case 2 — SKU exists

```text
update metadata: name, category_id, location_id, unit, reorder_threshold
  → if quantity > 0: recordStockIn(CSV_IMPORT, batchId)
  → status: updated
```

### Case 2b — SKU exists, qty = 0, metadata unchanged

```text
no DB writes
  → status: skipped
```

### Re-import semantics (Option C from Phase 1.0 analysis)

CSV `quantity` is **additive stock**, never an overwrite of `current_quantity`. Re-importing the same SKU with qty 5 when on-hand is 10 yields 15 via a second ledger row.

---

## 3. Transaction Design

| Aspect | Decision |
|--------|----------|
| Granularity | **One Sequelize transaction per CSV row** |
| Row failure | Rollback that row only; continue remaining rows |
| Global rollback | **None** — partial success by design |
| Stock-in atomicity | `createItem` / metadata `update` + `recordStockIn` share the same row transaction |
| Category/location miss | Early return `{ status: 'failed' }` inside transaction — no writes committed |

This mirrors the team bulk-import partial-success pattern documented in Phase 1.0.

---

## 4. Risk Mitigations

| Risk ID | Mitigation in Phase 1.2 |
|---------|-------------------------|
| **R-D01** (qty overwrite) | **Mandatory:** never SET `current_quantity` from CSV; new items created at 0; all qty via `recordStockIn()` only. Integration scenario 7 verifies additive ledger. |
| **R-D02** (duplicate SKU in file) | Handled upstream in parser (Phase 1.1); import receives deduped rows. |
| **R-D03** (race with task completion) | Per-row `FOR UPDATE` in `recordStockIn` serializes on item row; failed row reported in summary. |
| **R-T01** (category/location miss) | Fail row with Hinglish detail; other rows continue (scenarios 4–6). |
| **R-T03** (OLLI outbound) | Out of scope — no WhatsApp send in Phase 1.2. |

### Reference type

`INVENTORY_REFERENCE_TYPE.CSV_IMPORT = 'CSV_IMPORT'` added to `inventory.constants.ts`. Stored on ledger rows as `reference_type`; `reference_id` = caller-supplied `batchId` for batch traceability.

---

## 5. Result Model

```typescript
InventoryImportRowResult { line, sku, status, detail }
  status ∈ added | updated | failed | skipped

InventoryImportSummary {
  addedCount, updatedCount, failedCount, skippedCount,
  rowResults[]
}
```

---

## 6. Architecture Diagram

```text
InventoryCsvRow[]  (validated parser output)
        │
        ▼
InventoryImportService.processImport(factoryId, userId, rows, batchId)
        │
        ├── per row ──► sequelize.transaction()
        │                 ├── resolve category / location (fail row if missing)
        │                 ├── findItemBySku(factory_id, normalizedSku)
        │                 ├── create OR update metadata
        │                 └── recordStockIn if qty > 0
        │
        ▼
InventoryImportSummary
```
