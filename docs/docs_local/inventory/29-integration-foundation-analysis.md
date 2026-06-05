# Phase 2.1 — Integration Foundation Analysis

**Run date:** 2026-06-04  
**Scope:** Persistence foundation only — no OAuth, no Zoho API

---

## 1. Existing Model Patterns

Munshi Sequelize models follow a consistent pattern in `*.schema.ts`:

| Pattern | Example |
|---------|---------|
| Class extends `Model<InferAttributes, InferCreationAttributes>` | `InventoryCategory` |
| Static `setup(sequelize)` calls `Model.init()` | All inventory models |
| Static `associate(models)` for relations | `belongsTo` / `hasMany` |
| Registration in `SQL_MODELS` map | `backend/src/core/services/db-service/models.ts` |
| `underscored: true`, `timestamps: true` | Standard across modules |
| Factory scoping via `factory_id` column + repository `where` | `InventoryRepository` |

Phase 2.1 mirrors this in `backend/src/services/integrations/integration.schema.ts` with three models in one file (same layout as `inventory.schema.ts`).

Repositories are `@Injectable()`, inject `DbService`, expose model handles via constructor, and scope every query with `factory_id`.

Modules are thin NestJS wrappers exporting repository providers only — no controllers until Phase 2.2+.

---

## 2. Migration Design

**File:** `backend/migrations/011_integration_foundation.sql`

### Table hierarchy

```text
factories
    └── integration_connections (factory_id FK)
            ├── integration_item_mappings (connection_id FK, inventory_item_id FK)
            └── integration_sync_runs (connection_id FK)
```

### Key design choices

| Decision | Rationale |
|----------|-----------|
| Partial unique index on `(factory_id, provider) WHERE status = 'active'` | One live Zoho connection per factory per provider; disconnected rows allowed for history |
| Unique `(connection_id, external_id)` on mappings | Stable Zoho item join key per connection |
| Index `(factory_id, inventory_item_id)` on mappings | Reverse lookup for push sync (Phase 2.5) |
| `metadata JSONB` on connections | org_id, dc, account_email without schema churn |
| Nullable token columns | Phase 2.2 adds encryption; placeholders only now |
| FK to `factories` and `inventory_items` | User requirement; aligns with tenant isolation |

Migration index updated in `backend/migrations/README.md`.

---

## 3. Repository Design

**File:** `backend/src/services/integrations/integration.repository.ts`

| Method | Factory scope | Purpose |
|--------|---------------|---------|
| `createConnection()` | `factory_id` on insert | Persist new provider connection |
| `getConnection(id, factoryId)` | `where: { id, factory_id }` | Single connection lookup |
| `listConnectionsByFactory(factoryId)` | `where: { factory_id }` | Owner settings list (Phase 2.2) |
| `createMapping()` | `factory_id` on insert | Link Zoho item → Munshi item |
| `findMapping(factoryId, criteria)` | `where: { factory_id, ... }` | Lookup by external_id or inventory_item_id |
| `createSyncRun()` | `factory_id` on insert | Audit trail start |
| `updateSyncRun(id, factoryId, patch)` | `where: { id, factory_id }` | Complete/fail run |

No cross-factory reads or writes. Wrong `factoryId` returns `null` (not found), not another tenant's data.

---

## 4. Risks

| ID | Risk | Mitigation | Phase |
|----|------|------------|-------|
| R-P21-01 | Token columns stored plaintext | Deferred — nullable only; encryption in 2.2 | 2.2 |
| R-P21-02 | Partial unique index bypass if status typo | Constants `INTEGRATION_CONNECTION_STATUS`; integration test asserts constraint | 2.1 |
| R-P21-03 | Denormalized `factory_id` on mappings/runs could drift from connection | Always set from same factory context in repository callers; future service layer validates | 2.3 |
| R-P21-04 | `SYNC_STATUS` vs mapping `sync_status` naming overlap | Separate `ITEM_MAPPING_SYNC_STATUS` constant for mapping rows | 2.1 |
| R-P21-05 | Scope creep into OAuth/sync in same PR | Explicit forbidden list enforced; no controllers or HTTP clients | 2.1 |

---

## 5. Isolation from Phase 0/1

No changes to:

- `InventoryTransactionService`
- `InventoryImportService`
- `InventoryBulkImportService`
- `InventoryRepository`
- Task inventory helpers or movement logic

Only additive change to inventory: `ZOHO_PULL` / `ZOHO_PUSH` reference type constants (unused until Phase 2.3/2.5).
