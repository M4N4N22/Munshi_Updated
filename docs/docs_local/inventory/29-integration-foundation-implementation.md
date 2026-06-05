# Phase 2.1 — Integration Foundation Implementation

**Run date:** 2026-06-04  
**Scope:** Persistence layer only

---

## 1. Files Created

| File | Purpose |
|------|---------|
| `backend/migrations/011_integration_foundation.sql` | Three integration tables + indexes |
| `backend/src/services/integrations/integration.constants.ts` | Provider, direction, status, trigger enums |
| `backend/src/services/integrations/integration.schema.ts` | Sequelize models (Connection, ItemMapping, SyncRun) |
| `backend/src/services/integrations/integration.repository.ts` | Factory-scoped CRUD |
| `backend/src/services/integrations/integration.module.ts` | NestJS module (repository export only) |
| `backend/test/integration/integration-foundation.integration.spec.ts` | Migration + repository tests |

---

## 2. Files Modified

| File | Change |
|------|--------|
| `backend/src/core/services/db-service/models.ts` | Register `IntegrationConnection`, `IntegrationItemMapping`, `IntegrationSyncRun` |
| `backend/src/services/inventory/inventory.constants.ts` | Add `ZOHO_PULL`, `ZOHO_PUSH` to `INVENTORY_REFERENCE_TYPE` |
| `backend/migrations/README.md` | Index entry for `011_integration_foundation.sql` |

**Not modified:** inventory services, import pipeline, WhatsApp module, task inventory logic.

---

## 3. Schema Design

### `integration_connections`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| factory_id | INTEGER FK → factories | Indexed |
| provider | VARCHAR(64) | e.g. `zoho_inventory` |
| status | VARCHAR(32) | `active`, `disconnected`, `error` |
| access_token | TEXT | Nullable placeholder |
| refresh_token | TEXT | Nullable placeholder |
| expires_at | TIMESTAMPTZ | Nullable |
| metadata | JSONB | Default `{}` |
| created_at, updated_at | TIMESTAMPTZ | |

**Indexes:** `factory_id`, `provider`, `status`, unique `(factory_id, provider) WHERE status = 'active'`

### `integration_item_mappings`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| connection_id | INTEGER FK → integration_connections | |
| factory_id | INTEGER FK → factories | Denormalized scope |
| external_id | VARCHAR(128) | Zoho item_id |
| external_sku | VARCHAR(128) | Snapshot |
| inventory_item_id | INTEGER FK → inventory_items | |
| last_synced_at | TIMESTAMPTZ | Nullable |
| sync_status | VARCHAR(32) | `ok`, `conflict`, `unmapped` |
| created_at, updated_at | TIMESTAMPTZ | |

**Indexes:** unique `(connection_id, external_id)`, `(factory_id, inventory_item_id)`

### `integration_sync_runs`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| connection_id | INTEGER FK → integration_connections | |
| factory_id | INTEGER FK → factories | |
| direction | VARCHAR(16) | `pull`, `push` |
| trigger | VARCHAR(64) | `manual`, `cron`, `task_complete`, `csv_import` |
| status | VARCHAR(32) | `running`, `completed`, `failed`, `partial` |
| items_processed | INTEGER | Default 0 |
| error_summary | TEXT | Nullable |
| started_at, finished_at | TIMESTAMPTZ | |
| created_at, updated_at | TIMESTAMPTZ | |

**Indexes:** `connection_id`, `factory_id`, `status`

---

## 4. Constants Added

### `integration.constants.ts`

```typescript
INTEGRATION_PROVIDER      // zoho_inventory | zoho_books | csv
INTEGRATION_CONNECTION_STATUS  // active | disconnected | error
SYNC_DIRECTION            // pull | push
SYNC_STATUS               // running | completed | failed | partial
SYNC_TRIGGER              // manual | cron | task_complete | csv_import
ITEM_MAPPING_SYNC_STATUS  // ok | conflict | unmapped
```

### `inventory.constants.ts` (reference types only)

```typescript
INVENTORY_REFERENCE_TYPE.ZOHO_PULL  // 'ZOHO_PULL'
INVENTORY_REFERENCE_TYPE.ZOHO_PUSH  // 'ZOHO_PUSH'
```

No behavior wired — reserved for Phase 2.3 (pull bootstrap) and Phase 2.5 (push audit).

---

## 5. Architecture Flow (foundation only)

```text
Factory
    ↓
IntegrationConnection  (provider, status, tokens placeholder)
    ↓
IntegrationItemMapping  (external_id ↔ inventory_item_id)
    ↓
IntegrationSyncRun      (direction, trigger, status audit)
```

No OAuth, HTTP clients, cron, or domain event handlers in this phase.
