# Phase 2.0 — Zoho Implementation Roadmap

**Run date:** 2026-06-06  
**Scope:** Phase 2 breakdown — analysis only

---

## Overview

```text
Phase 2.1 Integration Foundation (tables + models)
        ↓
Phase 2.2 OAuth Connect / Disconnect
        ↓
Phase 2.3 Zoho Pull Sync (manual + service)
        ↓
Phase 2.4 Scheduled Sync (cron)
        ↓
Phase 2.5 Async Stock Push (domain events)
```

**Dependency rule:** Each phase has its own PR. Phase 0/1 regression must stay green after every merge.

---

## Phase 2.1 — Integration Foundation

**Goal:** Persist connections, mappings, and sync audit without calling Zoho.

### Deliverables

| Item | Detail |
|------|--------|
| Migration | `011_integration_foundation.sql` — `integration_connections`, `integration_item_mappings`, `integration_sync_runs` |
| Sequelize models | Under `backend/src/services/integrations/` |
| Repository | CRUD scoped by `factory_id` |
| Constants | `INTEGRATION_PROVIDER`, `SYNC_DIRECTION`, `SYNC_STATUS` |
| Reference types | `ZOHO_PULL`, `ZOHO_PUSH` in `inventory.constants.ts` (additive only) |

### Dependencies

- Phase 0/1 complete
- Next migration number after `010_task_inventory_lines.sql`

### Risks

- Token column security deferred to 2.2 (store nullable placeholders only)
- Over-scoping push queue table — defer to 2.5 unless idempotency needed early

### Expected files

```text
backend/migrations/011_integration_foundation.sql
backend/src/services/integrations/integration.module.ts
backend/src/services/integrations/integration-connection.schema.ts
backend/src/services/integrations/integration-item-mapping.schema.ts
backend/src/services/integrations/integration-sync-run.schema.ts
backend/src/services/integrations/integration.repository.ts
backend/src/services/inventory/inventory.constants.ts  (reference types only)
```

### Expected tests

- Migration applies on empty DB
- Repository factory scoping unit tests
- Phase 0 + Phase 1 integration regression (28/28)

### Expected reports

- `29-integration-foundation-analysis.md`
- `29-integration-foundation-implementation.md`
- `29-integration-foundation-validation.md`

---

## Phase 2.2 — OAuth Flow

**Goal:** Owner connects Zoho Inventory via web; tokens stored securely.

### Deliverables

| Item | Detail |
|------|--------|
| Web UI | Connect / disconnect button (owner-only) |
| Backend | `GET /integrations/zoho/authorize`, `GET /integrations/zoho/callback` |
| Token storage | Encrypt `access_token` / `refresh_token` before persist |
| Token refresh | Service method `refreshConnectionIfNeeded(connectionId)` |
| Env | `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REDIRECT_URI`, `ZOHO_ACCOUNTS_URL` |

### Dependencies

- **2.1** tables and models
- Zoho developer app registered (DevOps)
- Web app route for redirect

### Risks

- Redirect URI mismatch across dev/staging/prod
- No existing encryption utility — must introduce minimal AES/KMS wrapper
- CSRF via OAuth `state` parameter

### Expected files

```text
backend/src/services/integrations/zoho/zoho-oauth.service.ts
backend/src/services/integrations/zoho/zoho-oauth.controller.ts
backend/src/services/integrations/token-crypto.service.ts
web/app/.../integrations/page.tsx (or settings)
backend/.env.example
```

### Expected tests

- OAuth state validation unit tests
- Token refresh mock HTTP tests
- Callback stores connection row (integration test with mocked Zoho)

### Expected reports

- `30-zoho-oauth-*` series

---

## Phase 2.3 — Zoho Pull Sync

**Goal:** Pull items + stock from Zoho; map to Munshi inventory via public ledger APIs.

### Deliverables

| Item | Detail |
|------|--------|
| `ZohoInventoryClient` | HTTP wrapper (items list, stock on hand) |
| `ZohoPullSyncService` | Paginated pull → upsert items → mappings → optional `recordStockIn(ZOHO_PULL)` |
| Manual trigger | `POST /integrations/zoho/sync/pull` (owner-only) |
| Audit | Row in `integration_sync_runs` per run |
| Summary | JSON response + optional WhatsApp (reuse import summary pattern) |

### Dependencies

- **2.1** foundation
- **2.2** valid OAuth tokens
- Category/location masters seeded (or auto-create policy decision)

### Risks

- SKU mismatch with existing CSV items
- Zoho multi-warehouse vs single Munshi location
- Rate limits on large catalogs

### Expected files

```text
backend/src/services/integrations/zoho/zoho-inventory.client.ts
backend/src/services/integrations/zoho/zoho-pull-sync.service.ts
backend/src/services/integrations/zoho/zoho-sync.controller.ts
backend/test/integration/zoho-pull-sync.integration.spec.ts (mocked HTTP)
```

### Expected tests

- Mock Zoho: 3 items → 3 mappings + STOCK_IN rows
- Existing SKU → metadata update + additive qty
- Unmapped category → partial failure
- Phase 0/1 regression unchanged

### Expected reports

- `31-zoho-pull-*` series

---

## Phase 2.4 — Scheduled Sync

**Goal:** Nightly (or configurable) automatic pull for active connections.

### Deliverables

| Item | Detail |
|------|--------|
| Cron | `@Cron` job — e.g. 2 AM IST — iterates active connections |
| Locking | Skip if previous run `running` for same connection |
| Failure notify | Publish `INTEGRATION_SYNC_FAILED` domain event (handler in 2.5 or Phase 3) |
| Config | `ZOHO_SYNC_CRON_ENABLED`, `ZOHO_SYNC_CRON_EXPRESSION` env |

### Dependencies

- **2.3** pull service (reuse same core method)
- Token refresh from **2.2**

### Risks

- Long-running cron blocks Nest event loop — batch per factory
- Overlapping manual + cron runs — use advisory lock or status gate

### Expected files

```text
backend/src/services/integrations/zoho/zoho-sync.cron.ts
```

### Expected tests

- Cron invokes pull for active connections (mocked)
- Skips disconnected / expired token connections
- Creates `integration_sync_runs` row

### Expected reports

- `32-zoho-scheduled-sync-*` series

---

## Phase 2.5 — Async Stock Push

**Goal:** Mirror Munshi ledger movements to Zoho after task completion (and optionally CSV import).

### Deliverables

| Item | Detail |
|------|--------|
| Event publish | After successful task inventory movements → `DomainEventsService.publish(ZOHO_STOCK_PUSH_REQUESTED)` |
| Handler | Wire `DomainEventsService.dispatch()` registry (first real handler) |
| `ZohoPushService` | Map transaction → Zoho adjustment API |
| Idempotency | Track pushed `(connection_id, inventory_transaction_id)` — optional queue table or payload hash |
| Audit | `integration_sync_runs` direction=`push` |

### Dependencies

- **2.1** mappings (must have `external_id`)
- **2.2** tokens
- **2.3** items exist in Zoho or push creates adjustment only for mapped items
- Domain event dispatch wiring (minimal registry)

### Risks

- Push failure after task complete — acceptable per P2; must log + retry
- Double push on event replay — idempotency required
- Modifying `tasks.inventory.helper` — **only add publish call after movements**, do not change movement logic

### Expected files

```text
backend/src/services/integrations/zoho/zoho-push.service.ts
backend/src/services/domain-events/handlers/zoho-push.handler.ts
backend/src/services/domain-events/domain-events.service.ts  (dispatch registry only)
backend/src/services/tasks/tasks.inventory.helper.ts  (publish event only — minimal)
```

### Expected tests

- Task complete → ledger row → event published → mock Zoho called
- Unmapped item → event skipped / failed gracefully
- Idempotent replay does not double Zoho adjustment
- Phase 0 regression 12/12

### Expected reports

- `33-zoho-push-*` series
- Phase 2 final signoff document

---

## Implementation order summary

| Order | Phase | PR suggestion | Blocks |
|-------|-------|---------------|--------|
| 1 | **2.1** Foundation | `feat/integration-foundation` | — |
| 2 | **2.2** OAuth | `feat/zoho-oauth` | 2.1 |
| 3 | **2.3** Pull sync | `feat/zoho-pull-sync` | 2.1, 2.2 |
| 4 | **2.4** Scheduled sync | `feat/zoho-sync-cron` | 2.3 |
| 5 | **2.5** Stock push | `feat/zoho-stock-push` | 2.1–2.3, domain events |

---

## Parallel work (optional)

- Web connect UI (2.2) can start once 2.1 API contracts are frozen.
- Domain event handler registry scaffolding can start in 2.1 alongside tables (no Zoho calls until 2.5).

---

## Out of scope (P2 v1 — unchanged)

- Tally / Busy live API
- Bidirectional real-time sync
- Zoho webhooks
- Multi-warehouse transfer workflows
- Barcode scanning
- Web inventory analytics dashboard
