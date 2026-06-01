# Procurement Runtime Audit

**Date:** 2026-06-01  
**Scope:** Prompt 10 Procurement Foundation — runtime failures only  
**Factory:** `factory_id=3` (Munshi Dada)  
**API base:** `http://localhost:4001`

## Executive summary

Two procurement smoke-test failures were investigated with live stack traces and SQL logs. Both were **application bugs**, not missing migrations or invalid DTO design.

| Endpoint | Before | Root cause class |
|----------|--------|------------------|
| `GET /purchase-requests?factory_id=3` | 500 | Sequelize association FK mismatch |
| `POST /purchase-requests` | 400 (smoke) / 500 (after GET fix) | Smoke payload bug + transaction reload bug |

## Phase 1 — Module review

Reviewed: controller, service, repository, DTOs, schema, migration `006_procurement_foundation.sql`, workflow handler.

### Failure 1: GET list → 500

**Captured API response:**

```json
{
  "meta": {
    "failures": {
      "message": "column PurchaseRequest.requester_id does not exist"
    }
  }
}
```

**Captured SQL (after association fix):** query correctly selects `requested_by`, joins `purchase_request_items` as `items`.

**Root cause:** Legacy Sequelize associations on related models still referenced pre-migration column names:

- `User.hasMany(PurchaseRequest, { foreignKey: 'requester_id' })` in `users.schema.ts`
- `Vendor.hasMany(PurchaseRequest, { foreignKey: 'vendor_id' })` in `vendors.schema.ts`

Migration `006` renamed DB columns to `requested_by` and `assigned_vendor_id`. The PurchaseRequest model already used the new names, but inverse associations forced Sequelize to SELECT non-existent `requester_id`.

### Failure 2: POST create

**Smoke test payload (invalid):**

```json
{ "factory_id": 3, "requester_id": 1, "title": "Smoke PR" }
```

**DTO requires:** `factory_id`, `requested_by`, `title` (`CreatePurchaseRequestDto`).

**400 cause:** Smoke test bug — wrong field name (`requester_id` vs `requested_by`). ValidationPipe rejects missing `requested_by`.

**500 cause (valid payload):** After fixing GET, POST with valid body failed with:

```json
{ "message": "Cannot read properties of null (reading 'items')" }
```

**SQL evidence:** transaction started, INSERT succeeded, then `findById` ran on `(default)` connection (outside transaction), returned `null`, transaction **ROLLBACK**.

**Root cause:** `PurchaseRequestService.createPurchaseRequest` (and other mutating methods) called `findById` without passing the active Sequelize `transaction`, so uncommitted rows were invisible.

## Phase 2 — Database validation

Script: `node scripts/procurement-db-check.mjs`

| Table | Status | Notes |
|-------|--------|-------|
| `purchase_requests` | EXISTS | 16 columns incl. `requested_by`, `assigned_vendor_id`, `request_number`, `priority` |
| `purchase_request_items` | EXISTS | Line items + timestamps |
| `purchase_request_audit` | EXISTS | Singular table name (not `purchase_request_audits`) — matches entity |

Migration `006` applied: legacy `requester_id` / `vendor_id` renamed. Indexes present on factory, status, priority, item FKs.

**Entity alignment:** Sequelize models match migrated schema. Audit table name is `purchase_request_audit` in both SQL and `PurchaseRequestAudit` model.

## Files implicated

| File | Issue |
|------|-------|
| `src/services/users/users.schema.ts` | Stale FK `requester_id` |
| `src/services/vendors/vendors.schema.ts` | Stale FK `vendor_id` |
| `src/services/purchase-requests/purchase-requests.service.ts` | `findById` without transaction |
| `src/services/purchase-requests/purchase-requests.repository.ts` | `findById` missing transaction param |
| `scripts/swagger-smoke-test.mjs` | Invalid POST payload |

## Out of scope (confirmed)

No new procurement features, quotations, invoices, or GRN work was performed.
