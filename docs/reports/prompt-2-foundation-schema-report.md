# Prompt 2 — Foundation Schema Implementation Report

**Phase:** TraderOS Foundation (Prompt 2)  
**Date:** 2026-05-29  
**Status:** Complete — schema + skeleton only (no business logic)

---

## 1. Entities Added

| Entity | Table | Status |
|--------|-------|--------|
| Factory | `factories` | **Pre-existing** — associations extended only |
| Vendor | `vendors` | New |
| InventoryCategory | `inventory_categories` | New |
| InventoryLocation | `inventory_locations` | New |
| InventoryItem | `inventory_items` | New |
| InventoryTransaction | `inventory_transactions` | New |
| PurchaseRequest | `purchase_requests` | New |
| ApprovalRequest | `approval_requests` | New |

---

## 2. Migrations Created

| File | Description |
|------|-------------|
| `migrations/001_traderos_foundation.sql` | Creates all seven new tables + indexes |
| `migrations/README.md` | Apply instructions and verification |

---

## 3. Routes Created (Skeleton)

All routes return `{ message: "Not Implemented Yet" }` until Prompt 3+.

### Vendors — `/vendors`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/vendors?factory_id=` | List vendors |
| GET | `/vendors/:id` | Get vendor |
| POST | `/vendors` | Create vendor |
| PATCH | `/vendors/:id` | Update vendor |
| DELETE | `/vendors/:id` | Delete vendor |

### Inventory — `/inventory`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/inventory/categories` | List categories |
| POST | `/inventory/categories` | Create category |
| GET | `/inventory/locations` | List locations |
| POST | `/inventory/locations` | Create location |
| GET | `/inventory/items` | List items |
| GET | `/inventory/items/:id` | Get item |
| POST | `/inventory/items` | Create item |
| GET | `/inventory/transactions` | List transactions |
| POST | `/inventory/transactions` | Create transaction |

### Purchase Requests — `/purchase-requests`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/purchase-requests` | List |
| GET | `/purchase-requests/:id` | Get one |
| POST | `/purchase-requests` | Create |
| PATCH | `/purchase-requests/:id` | Update |

### Approvals — `/approvals`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/approvals` | List (factory_id, status query) |
| GET | `/approvals/:id` | Get one |
| POST | `/approvals` | Create |
| PATCH | `/approvals/:id` | Update |

**Existing routes unchanged:** `/webhook`, `/tasks`, `/users`, `/factories`, `/departments`, `/issues`, `/attendance`, `/reports`, `/health`.

---

## 4. Architecture Decisions

### 4.1 Preserve existing patterns

- Sequelize `setup()` / `associate()` model pattern unchanged
- `DbService` global provider unchanged
- Controller + service co-location pattern retained (vendors, purchase-requests, approvals) with separate controller for inventory (multi-resource module)
- Factory-scoped `factory_id` on all new entities

### 4.2 Factory entity not recreated

`Factory` already exists and powers all current workflows. Prompt 2 only added `hasMany` associations for new modules — **no column changes**.

### 4.3 Repository layer introduced (thin)

New `*.repository.ts` files expose Sequelize models via `DbService`. This prepares for business logic in Prompt 3 without coupling services directly to `DbService` long-term.

### 4.4 Polymorphic approvals

`approval_requests.entity_type` + `entity_id` supports future linkage to purchase requests, inventory adjustments, expenses, etc., without schema redesign per entity.

### 4.5 Inventory transaction log

`inventory_transactions` is append-only (`updated_at` disabled) to support audit trails and future ledger reconciliation.

### 4.6 No business logic in Prompt 2

Services return `NOT_IMPLEMENTED_RESPONSE` constant from `src/core/constants/not-implemented.constants.ts`.

---

## 5. Scalability Decisions

### Factory count targets

| Scale | Approach | Notes |
|-------|----------|-------|
| **30 factories** | Current design sufficient | Index on `factory_id` on all new tables |
| **100 factories** | Add connection pooling tuning; paginate list endpoints | Monitor Postgres table sizes per factory |
| **1000 factories** | Partitioning optional by `factory_id`; read replicas for reporting | May require relaxing `factory_users.user_id` UNIQUE for multi-factory staff |

### Index strategy

All list queries are expected to filter by `factory_id` first — composite indexes `(factory_id, status)` on transactional tables support approval and purchase request dashboards.

### Horizontal scaling

- Stateless NestJS API — scale replicas behind load balancer
- Cron jobs (attendance, deadlines) — require single-leader or distributed lock before multi-replica production
- No Redis yet — add for session/cache/queues at 100+ factory scale

---

## 6. Compatibility Analysis

| Area | Impact |
|------|--------|
| WhatsApp workflows | **None** — no changes to `WhatsAppModule` |
| Task routing | **None** |
| Department structure | **None** |
| Attendance | **None** |
| AI / ML classify | **None** |
| Reports | **None** |
| App bootstrap | **None** — new models register at init; no sync |
| Existing REST APIs | **None** |

**Requirement:** Run `001_traderos_foundation.sql` before implementing CRUD logic that queries new tables.

---

## 7. Future Module Dependencies

| Future module | Depends on |
|---------------|------------|
| Inventory Management (3.x) | `inventory_items`, `inventory_transactions`, `inventory_locations` |
| Vendor Management (3.x) | `vendors` |
| Procurement workflows | `purchase_requests`, `approval_requests`, `vendors` |
| Purchase Orders | `purchase_requests` + new `purchase_orders` table (future) |
| Goods Receipts | `inventory_transactions` (IN type) + PO linkage |
| Financial Ledger | `inventory_transactions.reference_*`, new ledger tables |
| Expense Tracking | `approval_requests` (entity_type EXPENSE) |
| Approvals Engine | `approval_requests` + status workflow service |
| Multi-factory ops | `factories` + potential `factory_users` constraint relaxation |

---

## 8. Files Created

### Migrations
- `migrations/001_traderos_foundation.sql`
- `migrations/README.md`

### Vendors
- `src/services/vendors/vendors.schema.ts`
- `src/services/vendors/vendors.dto.ts`
- `src/services/vendors/vendors.interfaces.ts`
- `src/services/vendors/vendors.repository.ts`
- `src/services/vendors/vendors.service.ts`
- `src/services/vendors/vendors.module.ts`

### Inventory
- `src/services/inventory/inventory.schema.ts`
- `src/services/inventory/inventory.constants.ts`
- `src/services/inventory/inventory.dto.ts`
- `src/services/inventory/inventory.interfaces.ts`
- `src/services/inventory/inventory.repository.ts`
- `src/services/inventory/inventory.service.ts`
- `src/services/inventory/inventory.controller.ts`
- `src/services/inventory/inventory.module.ts`

### Purchase Requests
- `src/services/purchase-requests/purchase-requests.schema.ts`
- `src/services/purchase-requests/purchase-requests.constants.ts`
- `src/services/purchase-requests/purchase-requests.dto.ts`
- `src/services/purchase-requests/purchase-requests.interfaces.ts`
- `src/services/purchase-requests/purchase-requests.repository.ts`
- `src/services/purchase-requests/purchase-requests.service.ts`
- `src/services/purchase-requests/purchase-requests.module.ts`

### Approvals
- `src/services/approvals/approvals.schema.ts`
- `src/services/approvals/approvals.constants.ts`
- `src/services/approvals/approvals.dto.ts`
- `src/services/approvals/approvals.interfaces.ts`
- `src/services/approvals/approvals.repository.ts`
- `src/services/approvals/approvals.service.ts`
- `src/services/approvals/approvals.module.ts`

### Core
- `src/core/constants/not-implemented.constants.ts`

### Documentation
- `docs/reports/current-database-analysis.md`
- `docs/reports/migration-notes.md`
- `docs/reports/prompt-2-foundation-schema-report.md` (this file)
- `docs/reports/architecture-impact-report.md`
- `docs/reports/future-work-report.md`

---

## 9. Files Modified

| File | Change |
|------|--------|
| `src/core/services/db-service/models.ts` | Register 7 new models |
| `src/services/factories/factories.schema.ts` | Add `hasMany` for TraderOS entities |
| `src/services/users/users.schema.ts` | Add `hasMany` for purchase/approval/transaction |
| `src/app/api/app.module.ts` | Import Vendor, Inventory, PurchaseRequest, Approval modules |
| `docs/implementation-report.md` | Updated for Prompt 2 |
| `docs/architecture-analysis.md` | Link to new reports |

---

## 10. Risks Found

1. **Migration not auto-applied** — operators must run SQL manually.
2. **No FK constraints** — orphan rows possible if application bugs occur.
3. **Skeleton endpoints are public** — same as existing admin REST (no auth guard applied).
4. **`current_quantity` on items** — field exists but no logic prevents drift vs transaction sum yet.

---

## 11. Recommendations Before Prompt 3.0

1. Apply `001_traderos_foundation.sql` to dev/staging databases.
2. Implement Vendor CRUD first (simplest, unblocks procurement).
3. Add `InternalCallGuard` or auth middleware to new + existing admin routes.
4. Add FK migration (`002_add_foreign_keys.sql`) after data validation.
5. Implement inventory quantity mutation only via `inventory_transactions` service (single write path).
6. Wire `ApprovalService` to `PurchaseRequest` status transitions before WhatsApp integration.
7. Keep WhatsApp/ML changes out until REST APIs are stable and tested.

---

*End of Prompt 2 foundation schema report.*
