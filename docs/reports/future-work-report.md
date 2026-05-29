# Future Work Report — Post Prompt 2

**Date:** 2026-05-29  
**Baseline:** TraderOS foundation schema + API skeletons complete

---

## Prompt 3.0 — Recommended Implementation Order

### Phase A: Data layer hardening

| Task | Priority | Rationale |
|------|----------|-----------|
| Apply `001_traderos_foundation.sql` to all environments | P0 | Unblocks all CRUD |
| Add `002_add_foreign_keys.sql` | P1 | Referential integrity |
| Add `sequelize-cli` or Umzug migration runner | P2 | Automated migration tracking |
| Add staging environment + DB | P1 | Safe testing |

### Phase B: Vendor module (first business logic)

| Task | Priority |
|------|----------|
| Implement `VendorService` CRUD with factory scoping | P0 |
| Soft-delete via `is_active` | P1 |
| List/search pagination | P2 |
| Admin UI integration | P2 |

### Phase C: Inventory foundation logic

| Task | Priority |
|------|----------|
| Category + location CRUD | P0 |
| Item CRUD with SKU uniqueness per factory | P0 |
| Transaction recording service (single write path for quantity) | P0 |
| Reorder threshold alerts (WhatsApp or dashboard) | P2 |
| **Do not** allow direct `current_quantity` patch without transaction | P0 |

### Phase D: Approval engine

| Task | Priority |
|------|----------|
| `ApprovalService.create` / `approve` / `reject` / `cancel` | P0 |
| Status transition validation | P0 |
| Link to `PurchaseRequest` status changes | P1 |
| Notification via `MessagingService` | P2 |

### Phase E: Procurement skeleton → workflow

| Task | Priority |
|------|----------|
| Purchase request CRUD | P0 |
| Submit → creates `ApprovalRequest` | P1 |
| Purchase order table (new migration) | P2 |
| Goods receipt → `inventory_transactions` IN | P2 |

---

## Modules Not Started (Explicitly Out of Scope for Prompt 2)

| Module | Depends on |
|--------|--------------|
| Financial Ledger | inventory_transactions, new ledger tables |
| Expense Tracking | approval_requests, ledger |
| Account Aggregator Integration | external APIs, ledger |
| Purchase Orders (full) | purchase_requests, vendors, approvals |
| Goods Receipts (full) | PO + inventory_transactions |
| WhatsApp commands for TraderOS | stable REST + ML intent additions |
| Multi-factory per user | schema change to `factory_users` |

---

## WhatsApp / AI Integration (Future)

When ready, add ML intents (without breaking existing):

- `vendor_list`, `stock_check`, `create_purchase_request`
- Extend `parseMlClassifyResponse` for new entity fields
- Route in `WhatsAppService.processCommand` delegating to new services

**Prerequisite:** REST APIs tested and factory-scoped authorization defined.

---

## Infrastructure Future Work

From [infrastructure-dependency-audit.md](../infrastructure-dependency-audit.md):

- Transfer Docker Hub / EC2 / Postgres ownership
- Add Redis for job queues at scale
- Add auth layer to admin + TraderOS routes
- Audit FastAPI ML service separately

---

## Scalability Roadmap

| Factories | Work required |
|-----------|---------------|
| 30 | Current schema OK |
| 100 | Pagination, DB connection pool, index review |
| 1000 | Read replicas, optional partitioning, cron leader election, multi-factory user model |

---

## Technical Debt Introduced (Intentional)

| Item | Resolution prompt |
|------|-------------------|
| Skeleton endpoints return static message | Prompt 3 |
| No FK constraints in DB | Prompt 3 migration 002 |
| No auth on new routes | Prompt 3 or infra |
| `current_quantity` denormalized | Prompt 3 inventory service |
| Purchase request has no line items | Prompt 4+ |

---

## Success Criteria for Prompt 3.0

- [ ] Migration applied to dev DB
- [ ] Vendor CRUD fully implemented with tests
- [ ] At least one inventory write path (transaction → quantity)
- [ ] Approval approve/reject implemented
- [ ] No regression in WhatsApp task/attendance flows
- [ ] Documentation updated in `docs/reports/`

---

*End of future work report.*
