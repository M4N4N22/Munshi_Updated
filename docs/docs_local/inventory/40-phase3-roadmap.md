# Phase 3 — Domain Events & Alerts Roadmap

**Run date:** 2026-06-06  
**Scope:** Smallest plan to complete Phase 3 after Phase 0 + Phase 2  
**Prerequisite:** Phase 2 COMPLETE (92/92 integration tests)

---

## Principles

1. **Extend, don't rebuild** — reuse `domain_events`, cron, `MessagingService`, existing low-stock detection.
2. **No duplicate work** — do not touch Zoho push handler, delivery retry, or task inventory movement logic.
3. **One PR per sub-phase** — match P2 rollout style.
4. **WhatsApp-first** — Hindi/Hinglish templates in `whatsapp.templates.ts`.

---

## Recommended Sub-Phases

### Phase 3.1 — Handler Registry (foundation)

**Goal:** Replace if/else `dispatch()` with extensible registration without breaking Zoho routing.

| Task | Detail |
|------|--------|
| Add registry | Map `event_type → handler[]` or inject tagged handlers |
| Migrate Zoho | Register existing `ZohoStockPushHandler` via registry |
| Tests | Extend `domain-events.service.spec.ts` — unknown type logs, known type invokes |

**Files (estimated):**
- `domain-events.service.ts`
- Optional: `domain-event-handler.interface.ts`
- `domain-events.service.spec.ts`

**Acceptance:** Existing 92 integration tests pass unchanged.

**Effort:** Small (0.5 day)

---

### Phase 3.2 — Low Stock Alert (core Phase 3 deliverable)

**Goal:** Proactive WhatsApp when stock drops below reorder threshold after STOCK_OUT.

#### 3.2.1 Event type + publish

| Task | Detail |
|------|--------|
| Constant | `INVENTORY_LOW_STOCK: 'inventory.low_stock'` |
| Publish site | `InventoryTransactionService.applyMovement()` — after successful commit path |
| Condition | `transactionType === STOCK_OUT` AND `isLowStock(item)` after update |
| Payload | `{ factory_id, inventory_item_id, sku, name, current_quantity, reorder_threshold, previous_quantity, reference_type, reference_id }` |
| Dedup | Skip publish if item already low before movement OR use `last_low_stock_alert_at` on item / separate dedup table / 24h window per item |

**Design note:** Inject `DomainEventsService` into `InventoryTransactionService` (or publish via thin helper to avoid circular deps).

#### 3.2.2 Handler + WhatsApp

| Task | Detail |
|------|--------|
| Handler | `InventoryLowStockAlertHandler` |
| Recipients | Factory owner phone + department manager (if resolvable from item location/dept — define rule) |
| Template | P2 example: item name, current qty, threshold, optional `/purchase_request_create` or suggestion key CTA |
| Register | In dispatch registry (3.1) |

#### 3.2.3 Optional purchase request CTA

| Task | Detail |
|------|--------|
| Reuse | `PurchaseRequestSuggestionService.generateLowStockSuggestions()` |
| WhatsApp | Include `suggestion_key` in message or deep-link to existing purchase request workflow |

#### 3.2.4 Tests

| Test | Scenario |
|------|----------|
| Integration | STOCK_OUT crosses threshold → event row created |
| Integration | Handler sends WhatsApp (mock MessagingService) |
| Integration | Dedup — second movement while still low does not re-alert (within window) |
| Unit | Publish skipped when no reorder_threshold |

**Acceptance criteria (maps to P2 3.2 + 3.3):**
- Event published from `applyMovement` on threshold cross
- Owner receives WhatsApp with Hindi copy
- No duplicate alerts on repeated movements (dedup)

**Effort:** Medium (2–3 days)

---

### Phase 3.3 — Integration Sync Failed Alert

**Goal:** Owner WhatsApp when Zoho pull sync or terminal push fails (once per run).

#### 3.3.1 Event type + publish

| Task | Detail |
|------|--------|
| Constant | `INTEGRATION_SYNC_FAILED: 'integration.sync_failed'` |
| Pull fail | Publish from `ZohoPullSyncService` catch block when sync run marked FAILED |
| Scheduled fail | Publish from `ZohoScheduledSyncService` when `outcome === 'failed'` |
| Push terminal (optional) | Publish when push delivery reaches terminal FAILED (`retry_count >= 4`) — separate sub-event or same type with `direction: push` in payload |
| Payload | `{ factory_id, connection_id, sync_run_id?, direction, provider, error_summary }` |
| Dedup | `aggregate_id = sync_run_id` or delivery id — one alert per failed run |

#### 3.3.2 Handler + WhatsApp

| Task | Detail |
|------|--------|
| Handler | `IntegrationSyncFailedAlertHandler` |
| Recipient | Factory owner (resolve via `FactoryUser` role OWNER) |
| Template | Connection provider, direction (pull/push), short error, timestamp |
| Register | In dispatch registry |

#### 3.3.3 Tests

| Test | Scenario |
|------|----------|
| Integration | Pull sync failure → event + handler mock |
| Integration | Scheduled sync failure path |
| Unit | Dedup — same sync_run_id not double-alerted |

**Acceptance criteria (maps to P2 INTEGRATION_SYNC_FAILED):**
- Failed pull logged **and** owner notified once per run
- Push terminal failure visible to owner (optional but recommended per Phase 2 audit gap)

**Effort:** Medium (1.5–2 days)

---

### Phase 3.4 — Task Completion Event (optional / defer)

**Status:** **Defer unless architectural consistency required.**

Phase 0 already sends stock summary WhatsApp via `notifyTaskCompleted()`. Migrating to `task.completed_with_stock` domain event is **refactor-only** with duplicate-message risk.

| If deferred | Rationale |
|-------------|-----------|
| Mark P2 `TASK_COMPLETED_WITH_STOCK` as **done via Phase 0** | User-facing requirement satisfied |
| Document in signoff | Event-driven pattern optional for Phase 4+ |

| If implemented | Steps |
|----------------|-------|
| Publish | After task commit in `completeTaskWithAtomicInventory` (alongside Zoho events) |
| Handler | Move stock notification logic from `notifyTaskCompleted` to handler |
| Remove | Direct stock branch in `notifyTaskCompleted` to prevent duplicates |

**Effort:** Medium (1–2 days) — **not recommended for minimal Phase 3**

---

## Implementation Order

```text
3.1 Registry          ← prerequisite, low risk
    ↓
3.2 Low stock alert   ← highest user value, P2 core
    ↓
3.3 Sync failed alert ← closes Phase 2 observability gap
    ↓
3.4 Task event (opt)  ← defer
```

---

## Files Touched (estimated, net-new)

| Area | New files | Modified files |
|------|-----------|----------------|
| 3.1 | `domain-event-handler.interface.ts` (optional) | `domain-events.service.ts`, `domain-events.module.ts` |
| 3.2 | `inventory-low-stock-alert.handler.ts`, helper, spec | `domain-events.constants.ts`, `inventory-transaction.service.ts`, `inventory.module.ts`, `whatsapp.templates.ts` |
| 3.3 | `integration-sync-failed-alert.handler.ts`, spec | `zoho-pull-sync.service.ts`, `zoho-scheduled-sync.service.ts`, optionally `zoho-push-execution.service.ts` |
| Tests | `inventory-low-stock-alert.integration.spec.ts`, `integration-sync-failed-alert.integration.spec.ts` | — |

**No new migrations required** for minimal path (use existing `domain_events` table). Dedup may need optional migration for `last_alerted_at` on `inventory_items` — evaluate in 3.2 design.

---

## Testing Gate (each sub-phase)

```bash
cd backend
npm run build
npm run test:integration -- --runInBand
```

Target after Phase 3 complete: **~100+ integration tests** (92 existing + ~8–12 new alert tests).

---

## Success Criteria Mapping

| P2 success criterion | Roadmap item |
|---------------------|--------------|
| Dispatch registry | 3.1 |
| `INVENTORY_LOW_STOCK` publish | 3.2.1 |
| WhatsApp handler | 3.2.2, 3.3.2 |
| Purchase request from alert | 3.2.3 (optional) |
| `INTEGRATION_SYNC_FAILED` | 3.3 |
| No duplicate Phase 2 work | Explicit exclusions in principles |
| Full regression green | Gate after each sub-phase |

---

## Phase 3 Signoff Checklist (future)

- [ ] Handler registry with Zoho + alert handlers registered
- [ ] Low-stock proactive WhatsApp after STOCK_OUT threshold cross
- [ ] Integration sync failure WhatsApp (pull + optional push terminal)
- [ ] Dedup prevents alert spam
- [ ] Hindi templates reviewed
- [ ] Integration tests pass
- [ ] Phase 0/1/2 regression unchanged
- [ ] Reports: `41-phase3-*` (implementation + validation)

---

## Explicit Non-Goals (Phase 3)

- Zoho push pipeline changes
- New schedulers or queue systems
- Weekly stats digest (Phase 5)
- ML / NL assign (Phase 4)
- Web dashboards
- Rebuilding `notifyTaskCompleted` unless 3.4 explicitly approved

---

## Summary

**Minimal Phase 3 = 3.1 + 3.2 + 3.3** (~4–6 dev days).

Phase 2 eliminated the "wire dispatch from scratch" work. Phase 0 eliminated the "task stock WhatsApp from scratch" work. What remains is **proactive alerting** for low stock and integration failures, built on infrastructure that already exists.
