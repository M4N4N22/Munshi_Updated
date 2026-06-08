# Phase 6 — Workflow Trace

**Date:** 2026-06-08

---

## If routing succeeds (Option A only)

**Entry:** `WorkflowRouterService.startWorkflowFromCommand(phone, '/purchase_request_create?itemId=42')`

### Trace

| Step | Function | Output |
|------|----------|--------|
| 1 | `matchWorkflowStartCommand` | `/purchase_request_create` |
| 2 | `resolveUserContext(phone)` | factory_id, role |
| 3 | `ensureCanRunWorkflow(role)` | pass for OWNER/MANAGER |
| 4 | `parsePurchaseRequestItemIdFromCommand` | `42` |
| 5 | `buildLowStockPrefill(factoryId, 42)` | `IPurchaseRequestPrefill` |
| 6 | `buildPurchaseRequestPrefillSessionData` | `prefill_source: low_stock_alert` |
| 7 | `startWorkflowWithSessionData` | `workflow_sessions` INSERT |
| 8 | `buildPurchaseRequestPrefillPrompt` | YES/NO/qty prompt text |
| 9 | `finish(result)` | WhatsApp outbound to user |

### Integration test proof

`inventory-low-stock-purchase-prefill.integration.spec.ts` — passes end-to-end when command string is supplied directly (simulates Option A).

---

## Actual workflow triggered on live staging (DB evidence)

**Query:** `workflow_sessions WHERE workflow_type = 'PURCHASE_REQUEST_CREATE'`

| Phone pattern | prefill_source | Interpretation |
|---------------|----------------|----------------|
| `+9100xxxxx` (masked) | `low_stock_alert` | Integration tests — **not real users** |
| `917452897444` | `null` | Manual PR workflows (completed) — **not CTA** |
| `918604856137` (owner) | — | **No row found** |
| `919456157007` (manager) | — | **No row found** |

**Actual workflow triggered by CTA on real owner/manager phones:** **NONE** (in examined DB history).

---

## If routing fails (Option B/C — production path)

| Step | Executed? |
|------|-----------|
| `startWorkflowFromCommand` | ❌ No |
| `buildLowStockPrefill` | ❌ No |
| `createSession` | ❌ No |
| `PurchaseRequestCreateWorkflowHandler` | ❌ No |

**Workflow trace length:** 0 steps.

---

## Low-stock alert → workflow linkage (upstream — works)

| Step | Status (staging DB) |
|------|---------------------|
| `inventory.low_stock` events | ✅ `COMPLETED` (ids 32–41 on 2026-06-08) |
| Alert handler dispatch | ✅ (events don't stay PENDING) |
| Outbound button attached | ✅ (integration tests + code) |
| Inbound CTA → workflow | ❌ **Broken for title-echo path** |

---

## Where execution terminates (failure path)

```
WorkflowRouterService.startWorkflowFromCommand — NEVER CALLED
```

Termination occurs in **`WhatsAppService.handleIncomingMessage`** at ML fallback branch, before workflow engine.
