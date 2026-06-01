# Procurement API Validation

**Date:** 2026-06-01  
**Script:** `node scripts/procurement-api-verify.mjs`  
**Factory:** 3 | **Requester/approver:** user 18 (OWNER)

## Endpoint matrix

| Method | Path | Expected | Actual | Persistence / notes |
|--------|------|----------|--------|---------------------|
| GET | `/purchase-requests?factory_id=3` | 200 | 200 | Paginated list with items join |
| GET | `/purchase-requests/:id?factory_id=3` | 200 | 200 | Single record + line items |
| POST | `/purchase-requests` | 201 | 201 | Creates PR, request_number, audit CREATED (+ SUBMITTED if `submit: true`) |
| PATCH | `/purchase-requests/:id` | 200 | 200 | Draft/pending only; audit UPDATED |
| POST | `/purchase-requests/:id/approve` | 201 | 201 | Owner/manager; status APPROVED |
| POST | `/purchase-requests/:id/reject` | 201 | 201 | Owner/manager; status REJECTED |
| POST | `/purchase-requests/:id/assign-vendor` | 201 | 201 | Requires APPROVED; sets ASSIGNED_TO_VENDOR |
| POST | `/purchase-requests/:id/remove-vendor` | — | Not in verify script | Same role gate as assign |
| POST | `/purchase-requests/:id/close` | 201 | 201 | From ASSIGNED_TO_VENDOR → CLOSED |
| GET | `/purchase-requests/:id/audit?factory_id=3` | 200 | 200 | Ordered audit trail |
| GET | `/purchase-requests/suggestions/low-stock?factory_id=3` | 200 | (smoke) | Returns suggestions array |

## Create DTO validation (`CreatePurchaseRequestDto`)

| Field | Required | Type | Swagger example |
|-------|----------|------|-----------------|
| `factory_id` | yes | number | 3 |
| `requested_by` | yes | number | 18 |
| `title` | yes | string | Restock cement bags |
| `description` | no | string | — |
| `priority` | no | enum | NORMAL |
| `notes` | no | string | — |
| `items` | no | array | `{ item_name, requested_quantity, unit? }` |
| `submit` | no | boolean | moves to PENDING_APPROVAL |

**Not accepted:** `requester_id` (legacy smoke-test field).

## Workflow

WhatsApp `/purchase_request_create` handler unchanged; uses `requested_by` via service layer. No workflow regression tested in this sprint beyond service-layer create path.

## Role gates

- Create/update: factory member (`assertFactoryMember`)
- Approve/reject/assign/close: OWNER or MANAGER (`assertCanApprove`)

## Latency (verification run)

| Step | ms |
|------|-----|
| List | 48 |
| Create | 479 |
| Get by id | 48 |
| Patch | 319 |
| Approve | 318 |
| Assign vendor | 384 |
| Audit list | 91 |
| Close | 325 |
