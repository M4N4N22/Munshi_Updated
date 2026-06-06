# Phase 3A — Domain Events & Alerts Gap Analysis

**Run date:** 2026-06-06  
**Scope:** Remaining Phase 3 work after Phase 2 completion  
**Status:** Analysis only — no code changes

---

## Executive Summary

Phase 2 delivered a **working domain events pipeline** for Zoho stock push (`zoho.stock_push.requested`). The P2 assumption that `dispatch()` is a no-op is **obsolete**.

Phase 3 remaining scope is **narrower** on infrastructure (outbox + cron exist) but **unchanged** on user-facing alerts:

| P2 Phase 3 requirement | Status after Phase 0 + 2 |
|------------------------|--------------------------|
| Dispatch registry | **Partially implemented** — single-handler if/else, not extensible registry |
| `INVENTORY_LOW_STOCK` event + WhatsApp | **Not implemented** |
| `TASK_COMPLETED_WITH_STOCK` event + WhatsApp | **Partially implemented** — Phase 0 direct notification, not event-driven |
| `INTEGRATION_SYNC_FAILED` event + WhatsApp | **Not implemented** |
| Purchase request from low-stock alert | **Partially implemented** — REST suggestions API only |

**Estimated Phase 3 net-new work:** ~3 event types, ~3 handlers, WhatsApp templates, dedup logic, tests. **Do not redo** Zoho push, task inventory movements, or low-stock detection math.

---

## Part 1 — Current Domain Events Architecture

See companion doc: [`40-domain-events-architecture.md`](./40-domain-events-architecture.md)

**Key facts:**
- Outbox table since migration `007`
- `DomainEventsProcessorCron` runs every minute
- `dispatch()` routes **one** handler: `ZohoStockPushHandler`
- `onboarding.registered` is published but has no handler
- Outbox retries up to 5 attempts on handler throw; Zoho push uses separate delivery retry (Phase 2.5.5)

---

## Part 2 — Phase 3 Requirements Audit

Original P2 Layer 3 table (`docs/p2-inventory-task-integrations.md`):

| Event type | When (P2 spec) | Handler (P2 spec) | Status | Evidence |
|------------|----------------|-------------------|--------|----------|
| `INVENTORY_LOW_STOCK` | After STOCK_OUT, qty < reorder_threshold | WhatsApp to owner + dept manager | **Not Implemented** | No constant, no publish in `applyMovement()`, no handler |
| `TASK_COMPLETED_WITH_STOCK` | Task with lines completed | WhatsApp summary to assigner/owner | **Partially Implemented** | Phase 0: `notifyTaskCompleted()` → `buildTaskInventoryCompletionOwnerText()` sends stock summary via direct `MessagingService.sendText()` — not via domain event |
| `INTEGRATION_SYNC_FAILED` | Zoho pull/push error | WhatsApp to owner (once per run) | **Not Implemented** | Failures logged to `integration_sync_runs` + logger; push failures in `integration_push_deliveries` API only (Phase 2 audit limitation #2) |

### Phase 3 checklist items (P2 doc)

| Item | Status | Notes |
|------|--------|-------|
| 3.1 Implement `dispatch()` registry | **Partial** | If/else in `dispatch()`; only Zoho wired |
| 3.2 Publish `INVENTORY_LOW_STOCK` from `applyMovement` | **Not done** | `applyMovement()` has no domain event publish |
| 3.3 Handler → WhatsApp | **Partial** | Task stock WhatsApp exists (Phase 0); low-stock + sync failure alerts missing |
| 3.4 Optional: pre-fill purchase request from low-stock | **Partial** | `PurchaseRequestSuggestionService.generateLowStockSuggestions()` + REST endpoints exist; not triggered by proactive alert |

---

## Part 3 — Inventory Event Review

### InventoryTransactionService

**File:** `backend/src/services/inventory/inventory-transaction.service.ts`

| Method | Calls | Domain events? |
|--------|-------|----------------|
| `recordStockIn` | `applyMovement()` | **No** |
| `recordStockOut` | `applyMovement()` | **No** |
| `recordAdjustment` | `applyMovement()` | **No** |

`applyMovement()` updates `inventory_items.current_quantity` and creates ledger row. **No event publish, no low-stock check after movement.**

### Task completion flow

**File:** `backend/src/services/tasks/tasks.service.ts`

```text
completeTaskWithAtomicInventory()
  → transaction: executeTaskInventoryMovements() + task update
  → post-commit: publishZohoStockPushRequestedEvents()   [Phase 2.5.1]
  → parallel: notifyTaskCompleted()                        [Phase 0]
```

### Events that already exist

| Event | Producer | Handler | Purpose |
|-------|----------|---------|---------|
| `zoho.stock_push.requested` | Task completion (inventory lines) | `ZohoStockPushHandler` | Outbound Zoho sync |
| `onboarding.registered` | `OnboardingService` | None | Placeholder / future use |

### Events P2 specified but missing

| Event | Expected producer | Status |
|-------|-------------------|--------|
| `inventory.low_stock` | `applyMovement()` after STOCK_OUT | Not defined |
| `task.completed_with_stock` | `completeTask()` | Functionality via direct WhatsApp only |
| `integration.sync_failed` | Pull/push sync services | Not defined |

---

## Part 4 — Alerts Review

### WhatsApp — task completion with stock

| Aspect | Current state |
|--------|---------------|
| Trigger | Direct call in `TasksService.completeTask()` / admin paths |
| Recipient | `owner_id ?? assigned_by` (single phone) |
| Content | Hindi/Hinglish template with pehle→ab qty, movement type |
| Template | `buildTaskInventoryCompletionOwnerText()` in `whatsapp.templates.ts` |
| Domain event | **Not used** |
| Dept manager copy | **Not sent** (P2 spec mentions owner + dept manager for low stock; task spec says assigner/owner) |

**Verdict:** User-facing alert **works** for task completion. Phase 3 event migration is **optional** unless decoupling or multi-recipient expansion is required.

### WhatsApp — low stock

| Aspect | Current state |
|--------|---------------|
| Proactive alert after STOCK_OUT | **No** |
| On-demand query | `/inventory_status` lists low-stock items (`whatsapp.service.ts`) |
| REST API | `GET /inventory/items/low-stock` |
| Detection logic | `InventoryService.isLowStock()` / `listLowStockItems()` — **ready to reuse** |
| Purchase request path | `GET /purchase-requests/suggestions/low-stock` + create-from-suggestion — **ready to reuse** |
| P2 example message with `/purchase_request_create` CTA | **Not implemented** as proactive push |

**Verdict:** Detection and downstream APIs exist; **proactive WhatsApp alert is the gap**.

### WhatsApp — integration failures

| Failure type | Current behavior | Owner alert? |
|--------------|------------------|--------------|
| Manual pull sync fail | `integration_sync_runs.status=failed`, exception to REST caller | **No** (caller sees error) |
| Scheduled cron pull fail | Logger warn, `{ outcome: 'failed' }` in batch result | **No** |
| Push delivery fail | `integration_push_deliveries` row + retry cron | **No** — API only (`39-phase2-final-audit.md` limitation #2) |
| Terminal push fail (4 attempts) | Stays `failed`, `next_retry_at=null` | **No** |

**Verdict:** Audit trail exists; **proactive owner WhatsApp is the gap**.

### Other notifications (context, not Phase 3 gaps)

- Task assigned / deadline reminders — existing, unrelated
- CSV import summary — Phase 1, unrelated
- Inventory create workflow — WhatsApp handler, unrelated

---

## Part 5 — Gap Matrix

| Requirement | Current state | Gap | Recommended action |
|-------------|---------------|-----|-------------------|
| **Outbox infrastructure** | `domain_events` + cron + publish API | None | Reuse as-is |
| **Dispatch routing** | If/else, one handler | No extensible registry | Add handler map or inject handler array; register alert handlers alongside Zoho |
| **`ZOHO_STOCK_PUSH_REQUESTED`** | Full pipeline Phase 2.5.1–2.5.5 | None | **Do not redo** |
| **`INVENTORY_LOW_STOCK` publish** | Not published | No event after movement | Publish from `applyMovement()` when STOCK_OUT crosses below threshold |
| **`INVENTORY_LOW_STOCK` handler** | Not exists | No WhatsApp | Handler → owner (+ dept manager per P2) with Hindi template + optional PR CTA |
| **Low-stock dedup** | Not exists | Risk of alert spam | Track last alert per item or debounce window |
| **`TASK_COMPLETED_WITH_STOCK` publish** | Not published | Not event-driven | **Optional** — migrate `notifyTaskCompleted` stock branch to handler, or mark done |
| **`TASK_COMPLETED_WITH_STOCK` WhatsApp** | Phase 0 direct send | Works without events | **No action required** unless event-driven architecture desired |
| **`INTEGRATION_SYNC_FAILED` publish** | Not published | Pull fail silent to owner | Publish from `zoho-pull-sync.service` / scheduled sync on run failure |
| **Push failure alert** | Delivery ledger + retry | Terminal fail invisible to owner | Publish event on terminal push fail OR extend sync-failed handler |
| **`INTEGRATION_SYNC_FAILED` handler** | Not exists | No WhatsApp | Handler → owner once per sync run (dedupe by `sync_run_id`) |
| **Purchase request from alert** | REST suggestions | No WhatsApp CTA flow | Link low-stock message to existing suggestion key / slash command |
| **Dept manager on low stock** | Not implemented | Owner-only paths today | Resolve dept manager phone from item/task context |
| **Phase 3 tests** | 92 integration tests, none for alerts | No coverage | Add unit + integration tests per new event type |
| **Onboarding event handler** | Published, no handler | Orphan events accumulate COMPLETED... actually they complete with debug log | Out of Phase 3 scope unless finance onboarding needs wiring |

---

## Part 6 — What Phase 2 Already Satisfied (Do Not Duplicate)

| P2 Phase 3 assumption | Phase 2 reality | Action |
|-----------------------|-----------------|--------|
| "Wire dispatch from no-op" | Dispatch active for Zoho | Extend, don't replace |
| "Async push on task complete" | Done via domain events | Out of Phase 3 scope |
| "Event after stock movement" | Only Zoho push events (task-scoped) | Low-stock is different event — add separately |
| "Integration failure logging" | `integration_sync_runs` + push deliveries | Add alert layer only |

---

## Part 7 — Scope Boundary

### In Phase 3 scope

- Alert domain events (low stock, sync failed)
- WhatsApp handlers for those events
- Dispatch registry extension
- Dedup / rate limiting for alerts
- Tests

### Out of Phase 3 scope (other P2 phases)

- Phase 4 — ML / NL task assign
- Phase 5 — Weekly stats digest
- Zoho webhooks / bidirectional sync
- New inventory movement logic
- Rebuilding task completion notifications (unless explicitly migrating to events)

---

## Part 8 — Risk Notes for Phase 3 Implementation

1. **Alert fatigue** — publishing on every `applyMovement` STOCK_OUT without dedup will spam owners.
2. **CSV / REST stock movements** — low-stock event from `applyMovement` fires for all STOCK_OUT sources, not just tasks (P2 spec says "after STOCK_OUT" — likely intentional).
3. **Dual notification paths** — if task completion moves to events while direct WhatsApp remains, duplicate messages possible.
4. **Handler failure vs business failure** — follow Zoho pattern: alert handlers should not throw on WhatsApp send failure if delivery should be retried via outbox.
5. **Dept manager resolution** — need clear rule: which department when movement is not task-linked?

---

## Conclusion

**Phase 3 is not empty** — proactive low-stock and integration-failure WhatsApp alerts remain. **Phase 3 is smaller than originally planned** on infrastructure because Phase 2 built the outbox dispatch path and Phase 0 built task-completion stock WhatsApp.

**Net remaining:** ~2–3 new event types, ~2–3 handlers, registry refactor, dedup, tests, optional purchase-request CTA wiring.

See [`40-phase3-roadmap.md`](./40-phase3-roadmap.md) for minimal implementation plan.
