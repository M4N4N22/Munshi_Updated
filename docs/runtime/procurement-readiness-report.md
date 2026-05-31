# Procurement Readiness Report

**Date:** 2026-05-31  
**Question:** Can Procurement development safely start?

**Short answer:** **Partially — core dependencies are unblocked after migrations, but Purchase Request / Approval APIs are stubs and document→workflow E2E is not fully validated.**

---

## Dependency evaluation

Procurement (next phase) depends on:

| Dependency | Required for Procurement | Status | Evidence |
|------------|-------------------------|--------|----------|
| **Vendor Module** | Vendor master, search, GST | ✅ **Ready** | GET/POST 200/201 after migration; vendor id=1 created in runtime test |
| **Inventory Module** | Stock levels, SKU lookup, transactions | ✅ **Ready (reads + master writes)** | All inventory GETs pass smoke test; categories/locations POST 201 |
| **Document Module** | Invoice/receipt ingestion | ⚠️ **Partial** | GET list fixed; upload/process not E2E tested; ML reachable |
| **Workflow Engine** | Multi-step WhatsApp flows | ⚠️ **Partial** | `workflow_sessions` table exists; session logic unit-tested; WhatsApp outbound blocked by Olli |
| **Suggestion Engine** | Approve/reject parsed actions | ⚠️ **Partial** | `document_suggestions` table exists; no runtime suggestion cycle tested |
| **Purchase Requests API** | PR CRUD | ❌ **Stub** | All routes return `"Not Implemented Yet"` |
| **Approvals API** | Approval workflow | ❌ **Stub** | All routes return `"Not Implemented Yet"` |

---

## Database foundation for Procurement

Tables required by Procurement design (from migration 001 + 005):

| Table | Exists (post-migration) | Used by |
|-------|---------------------------|---------|
| `vendors` | ✅ | PR vendor linkage |
| `inventory_items` | ✅ | Stock-in from PO/GRN |
| `inventory_transactions` | ✅ | STOCK_IN audit |
| `purchase_requests` | ✅ (schema only) | PR module — **no service impl** |
| `approval_requests` | ✅ (schema only) | Approval module — **no service impl** |
| `documents` | ✅ | Invoice ingestion |
| `document_suggestions` | ✅ | Suggested STOCK_IN / CREATE_VENDOR |

Schema is **ready**; application services for PR/Approval are **not**.

---

## Can Procurement safely start?

### Safe to start (green)

1. **Vendor CRUD integration** — runtime validated.
2. **Inventory reads and master data** — runtime validated.
3. **DB schema for PR/Approval** — tables exist; can implement services against them.
4. **Document registry and list APIs** — operational.

### Start with caution (yellow)

1. **Document upload → suggestion → approve workflow** — implement with staging tests; ML ok, storage not E2E verified.
2. **WhatsApp-triggered procurement flows** — fix Olli OAuth before relying on outbound notifications.
3. **Inventory transactions (stock-in from PO)** — code exists; not re-tested in this sprint with real item rows.

### Do not assume ready (red)

1. **Purchase Request REST API** — stub only; Procurement must **implement** module.
2. **Approval REST API** — stub only; must **implement** module.
3. **End-to-end Procurement without migration script** — any new environment needs `apply-migrations.mjs` first.

---

## Recommended gate before Procurement sprint

| Gate | Command / check | Target |
|------|-----------------|--------|
| Migrations | `node scripts/runtime-db-inspect.mjs` | All expected EXISTS |
| Smoke reads | `node scripts/swagger-smoke-test.mjs` | 23/23 |
| Vendor seed | POST `/vendors` | 201 |
| Inventory seed | POST category + location + item | 201 |
| Document E2E | POST `/documents/upload` + process | Manual staging test |
| Olli | POST `/webhook/test` | 200 or graceful dev mode |

---

## Verdict

| Criterion | Met? |
|-----------|------|
| Vendor module operational | ✅ Yes |
| Inventory module operational | ✅ Yes (reads + master) |
| Document module operational | ⚠️ Partial |
| Workflow engine operational | ⚠️ Partial (DB + code; WhatsApp blocked) |
| Suggestion engine operational | ⚠️ Partial (DB + code; no E2E) |
| PR/Approval implemented | ❌ No (stubs by design) |

**Procurement development may begin** for backend implementation of Purchase Requests and Approvals against existing schema, with parallel work to:

1. Complete document ingestion E2E in staging.
2. Refresh Olli credentials for WhatsApp.
3. Enforce migration script in all deployments.

**Procurement must not assume PR/Approval APIs are functional** — they are placeholders until implemented in the Procurement phase.
