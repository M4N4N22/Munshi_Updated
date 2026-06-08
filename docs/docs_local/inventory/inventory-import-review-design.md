# Inventory Import Review — Design

**Date:** 2026-06-08  
**Scope:** WhatsApp `/inventory_import_csv` UX enhancement

---

## Problem

Fresh factories have no categories or locations. The Munshi template references names like `Building Materials` and `Main Warehouse` that do not exist, so import rows fail with `Category "…" nahi mila`.

---

## Solution

Insert a **review + confirmation** step between CSV parse and import execution for the WhatsApp command flow.

```
/inventory_import_csv
  → upload CSV
  → parse + validate (unchanged)
  → build import review
  → owner replies CONFIRM or CANCEL
  → on CONFIRM: provision missing categories/locations, then processImport()
```

---

## Session Model

| Field | Purpose |
|---|---|
| `phase` | `awaiting_upload` \| `awaiting_confirm` |
| `factoryId` | Target factory |
| `ownerUserId` | Acting user |
| `rows` | Parsed CSV rows (in-memory) |
| `review` | New/existing categories, locations, items |
| `batchId` | Ledger reference id |
| `expiresAt` | TTL timestamp |

**TTL:** 15 minutes (`INVENTORY_CSV_REVIEW_TTL_MS`)

---

## Review Payload

```typescript
InventoryImportReview {
  newCategories: string[]
  existingCategories: string[]
  newLocations: string[]
  existingLocations: string[]
  newItems: { sku, name }[]
  existingItems: { sku, name }[]
}
```

Built by `InventoryImportService.buildImportReview()` — read-only, no DB writes.

---

## Confirmation Actions

On **CONFIRM**:

1. `ensureMasterData()` — create missing categories/locations (idempotent)
2. `processImport()` — existing import core (unchanged validation per row)

On **CANCEL**:

- Clear session, no DB changes

---

## Backward Compatibility

| Path | Behavior |
|---|---|
| WhatsApp `/inventory_import_csv` | Review flow (new) |
| WhatsApp auto-import (no command) | Direct import (unchanged) |
| REST `POST /inventory/import/csv` | Direct import (unchanged) |
| Parser + validation | Unchanged |
| `processImport()` row logic | Unchanged |

---

## Out of Scope

- Schema changes
- REST review API (future optional)
- Document parsing path
