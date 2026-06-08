# Inventory Import Review — Database Validation

**Date:** 2026-06-08  
**Target:** Staging Postgres `65.1.128.181:5431/munshi_data`

---

## Connection Status

| Endpoint | Status |
|---|---|
| `localhost:5432` (from `backend/.env`) | **DOWN** — ECONNREFUSED |
| `65.1.128.181:5431` (staging) | **UP** — queries succeed |

---

## Migration Status

```json
{
  "applied_count": 15,
  "pending_count": 0,
  "up_to_date": true,
  "latest_applied": "013_push_delivery_retry.sql"
}
```

Inventory-relevant migrations applied include `004_inventory_master.sql`, `010_task_inventory_lines.sql`.

---

## Inventory Schema Tables

Verified present on staging:

| Table |
|---|
| `inventory_categories` |
| `inventory_items` |
| `inventory_locations` |
| `inventory_transactions` |

---

## Real-DB Evidence (Integration Case 1)

Executed on staging during `inventory-import-review.integration.spec`:

1. Created fresh test factory via `seedPhase0Fixture`
2. `buildImportReview()` detected new categories/locations/items
3. `processImportWithProvisioning()` created master data + items
4. Assertions:
   - `addedCount: 2`
   - `categoriesCreatedCount: 2`
   - `locationsCreatedCount: 2`
   - `failedCount: 0`
   - Items retrievable via `findItemBySku()`

---

## Real-DB Evidence (Integration Case 3 — Idempotency)

Second `ensureMasterData()` call on same factory:

- `categoriesCreated: 0`
- `locationsCreated: 0`

Proves no duplicate category/location rows on re-provision.

---

## Gaps

| Scenario | Real-DB executed? |
|---|---|
| CONFIRM via `InventoryBulkImportService` | **Unit tests only** |
| CANCEL session | **Unit tests only** |
| Session expiry | **Unit tests only** |
| Duplicate full CSV re-import | **Not executed on real DB** |
| Live WhatsApp webhook | **Not executed** (backend not running) |
