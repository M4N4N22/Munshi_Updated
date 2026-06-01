# Procurement Bug Fix Report

**Date:** 2026-06-01  
**Sprint:** Procurement Runtime Validation & Bug Fix

## Fixes applied

### 1. Sequelize association foreign keys (GET 500)

**Problem:** `column PurchaseRequest.requester_id does not exist`

**Change:**

```typescript
// users.schema.ts
foreignKey: 'requested_by'  // was requester_id

// vendors.schema.ts
foreignKey: 'assigned_vendor_id'  // was vendor_id
```

**Why:** Migration 006 renamed columns; inverse `hasMany` associations must match the PurchaseRequest model and database.

### 2. Transaction-scoped reload (POST 500)

**Problem:** `Cannot read properties of null (reading 'items')` — create rolled back after successful INSERT.

**Change:**

- `PurchaseRequestRepository.findById(..., transaction?)` accepts optional transaction.
- All post-mutation `findById` calls inside `sequelize.transaction` blocks now pass `transaction`.

**Affected methods:** `createPurchaseRequest`, `updatePurchaseRequest`, `approvePurchaseRequest`, `rejectPurchaseRequest`, `assignVendor`, `removeVendor`, `closePurchaseRequest`.

### 3. Smoke test payload (POST 400)

**Problem:** Smoke test sent `requester_id` (legacy name).

**Change:** `scripts/swagger-smoke-test.mjs` now:

- Resolves `requested_by` from `GET /factories/{id}/users`
- Sends `requested_by`, `title`, and a minimal valid `items` array

**Also updated:** `scripts/swagger-full-audit.mjs` POST body uses `requested_by`.

## Verification

| Check | Result |
|-------|--------|
| `GET /purchase-requests?factory_id=3` | 200 |
| `POST /purchase-requests` (valid body) | 201 |
| Jest `purchase-requests` specs | 5/5 pass |
| `node scripts/procurement-api-verify.mjs` | 10/10 pass |

## Sample persisted row (post-fix)

```json
{
  "id": 4,
  "factory_id": 3,
  "requested_by": 18,
  "status": "CLOSED",
  "request_number": "PR-3-20260601-4"
}
```

Audit events recorded for CREATED → SUBMITTED → APPROVED → VENDOR_ASSIGNED → CLOSED on verification run.
