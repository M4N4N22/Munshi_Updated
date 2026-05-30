# Prompt 6 — Inventory Foundation Report

**Date:** 2026-05-29  
**Status:** Complete

---

## 1. Pre-implementation schema analysis

Reviewed Prompt 2 entities in `inventory.schema.ts` and migration `001`.

| Finding | Action |
|---------|--------|
| `category_id` / `location_id` nullable on items | **Migration `004`** — set NOT NULL |
| `current_quantity` column exists | Kept — updated **only** via transactions (Option B) |
| Location has `address` not `description` | API uses `address` for optional location notes |
| Transaction types were `IN`/`OUT` | Replaced with `STOCK_IN`, `STOCK_OUT`, `ADJUSTMENT` |
| Skeleton service returned stubs | Replaced with full implementation |

No new tables required.

---

## 2. What was implemented

### Category CRUD
- Create, list, update, deactivate
- Factory-scoped; unique name per factory
- Fields: `name`, `description`, `is_active`

### Location CRUD
- Create, list, update, deactivate
- Factory-scoped; unique name per factory
- Fields: `name`, `code`, `address`, `is_active`

### Item CRUD
- Create, get, list (paginated), update, deactivate
- Required: `category_id`, `location_id`, `sku`, `name`, `unit`
- SKU unique per factory
- Items created with `current_quantity = 0`

### Status & low stock
- `getInventoryStatus()` / `getInventoryStatusBySku()`
- `getCurrentQuantity()`
- `isLowStock()` — `current_quantity < reorder_threshold`
- `listLowStockItems()`

---

## 3. REST API (`/inventory`)

| Method | Path |
|--------|------|
| GET/POST | `/inventory/categories` |
| PATCH | `/inventory/categories/:id`, `.../deactivate` |
| GET/POST | `/inventory/locations` |
| PATCH | `/inventory/locations/:id`, `.../deactivate` |
| GET/POST | `/inventory/items` |
| GET | `/inventory/items/:id`, `.../status`, `.../quantity`, `/by-sku`, `/low-stock` |
| PATCH | `/inventory/items/:id`, `.../deactivate` |
| GET | `/inventory/transactions` |
| POST | `/inventory/transactions/stock-in`, `stock-out`, `adjustment` |

Swagger tag: `@ApiTags('inventory')`

---

## 4. Files created

| File | Purpose |
|------|---------|
| `migrations/004_inventory_master.sql` | NOT NULL constraints |
| `inventory.validation.ts` | Normalization + selection helpers |
| `inventory-transaction.service.ts` | Transaction engine |
| `inventory.validation.spec.ts` | Validation tests |
| `inventory.service.spec.ts` | Service tests |
| `inventory-transaction.service.spec.ts` | Transaction tests |
| `handlers/inventory-create.handler.ts` | Workflow handler |
| `handlers/inventory-create.handler.spec.ts` | Workflow tests |

---

## 5. Files modified

| File | Change |
|------|--------|
| `inventory.service.ts` | Full CRUD + status |
| `inventory.repository.ts` | Repository methods |
| `inventory.controller.ts` | REST endpoints |
| `inventory.dto.ts` | Update + transaction DTOs |
| `inventory.constants.ts` | Transaction types, limits |
| `inventory.interfaces.ts` | Status records |
| `inventory.schema.ts` | NOT NULL + `created_at` on transactions |
| `inventory.module.ts` | Export transaction service |
| `workflow.*` | Registry + `/inventory_create` |
| `whatsapp.service.ts` | `/inventory_status` foundation |

---

## 6. Factory isolation

All queries filter by `factory_id`. Cross-factory category/location/item access returns `NotFoundException`.

---

## 7. Tests

```
yarn test → 14 suites, 80 tests passed (+13 inventory-related)
```

---

*See also: [prompt-6-quantity-strategy-report.md](./prompt-6-quantity-strategy-report.md)*
