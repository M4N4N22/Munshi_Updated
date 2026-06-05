# Local Runtime Defects Report

**Run date:** 2026-06-05  
**Scope:** Defects found during local execution — no fixes applied

---

## DEF-PROD-001 — FOR UPDATE incompatible with LEFT OUTER JOIN

| Field | Detail |
|-------|--------|
| **Defect ID** | DEF-PROD-001 |
| **Affected file** | `backend/src/services/inventory/inventory.repository.ts` (lines 138–158) |
| **Called from** | `backend/src/services/inventory/inventory-transaction.service.ts:126` |

### Failure Description

Any transactional stock movement (`recordStockIn`, `recordStockOut`, task completion movements) fails when `findItemById` runs with a Sequelize transaction and row lock. Integration test fixture `createInventoryItemWithStock` fails at the seed `recordStockIn` step, blocking 10 of 12 Phase 0 scenarios.

### Error Message

PostgreSQL (confirmed via direct `psql`):

```text
ERROR: FOR UPDATE cannot be applied to the nullable side of an outer join
```

Jest stack trace (representative):

```text
inventory-transaction.service.ts:126
  const item = await this.repository.findItemById(
    params.inventory_item_id,
    params.factory_id,
    transaction,
  );

at Query.run (sequelize/.../postgres/query.js:76:25)
at run (inventory-transaction.service.ts:126:20)
at createInventoryItemWithStock (phase0-fixtures.ts:134:5)
```

SQL emitted before ROLLBACK:

```sql
SELECT ... FROM "inventory_items" AS "InventoryItem"
LEFT OUTER JOIN "inventory_categories" AS "category" ...
LEFT OUTER JOIN "inventory_locations" AS "location" ...
WHERE "InventoryItem"."id" = ? AND "InventoryItem"."factory_id" = ?
FOR UPDATE;
```

### Root Cause Hypothesis

`findItemById` combines `Transaction.LOCK.UPDATE` with `include` joins (LEFT OUTER JOIN on category and location). PostgreSQL rejects `FOR UPDATE` on queries where nullable outer-join sides are present. The lock should apply to `inventory_items` only, without joined includes, when a transaction is active.

### Severity

**Critical** — blocks all inventory stock mutations inside transactions, including task completion → inventory movement.

### Reproduction Steps

1. Start Postgres: `docker compose -f docker-compose.example.yml up postgres -d`
2. Ensure migrations applied: `cd backend && yarn migrate`
3. Run: `yarn test:integration`
4. Observe 10 failures at `findItemById` during `createInventoryItemWithStock`

Or directly in psql:

```sql
SELECT i.id FROM inventory_items i
LEFT JOIN inventory_categories c ON i.category_id = c.id
LEFT JOIN inventory_locations l ON i.location_id = l.id
WHERE i.id = 1 FOR UPDATE;
```

### Recommended Fix

When `transaction` is provided, query `inventory_items` without includes (or use `findByPk` + lock on base table only). Load category/location separately if needed for read paths.

---

## DEF-LOCAL-001 — Full application fails to bootstrap (WhatsAppModule DI)

| Field | Detail |
|-------|--------|
| **Defect ID** | DEF-LOCAL-001 |
| **Affected file** | `backend/src/modules/whatsapp/whatsapp.module.ts` (and/or `whatsapp.service.ts`) |

### Failure Description

`yarn dev` compiles successfully and connects to Postgres, but NestJS throws during provider initialization. The HTTP server never starts listening.

### Error Message

```text
UnknownDependenciesException [Error]: Nest can't resolve dependencies of the WhatsAppService
(... InventoryService, ?, TeamBulkImportService, OlliMediaService).
Please make sure that the argument OwnerHomeService at index [10]
is available in the WhatsAppModule context.
```

### Stack Trace

```text
at Injector.lookupComponentInParentModules (nestjs/core/injector/injector.js:262:19)
at async Injector.resolveComponentInstance (injector.js:215:33)
at async resolveParam (injector.js:129:38)
...
type: 'WhatsAppService'
name: OwnerHomeService (index 10)
```

### Root Cause Hypothesis

Nest cannot inject `OwnerHomeService` into `WhatsAppService` despite `OwnerHomeService` appearing in `WhatsAppModule.providers`. Possible causes: circular dependency between `WhatsAppService` and `OwnerHomeService`, missing module export/import for a transitive dependency of `OwnerHomeService`, or provider registration order issue. Requires DI graph analysis — not inventory-related.

### Severity

**High** — full local dev server (`yarn dev`) cannot start; blocks manual API/WhatsApp testing.

### Reproduction Steps

1. Start Postgres
2. `cd backend && yarn install && yarn dev`
3. Wait for compilation; observe `UnknownDependenciesException` before listen

### Recommended Fix

Resolve NestJS DI for `OwnerHomeService` in `WhatsAppModule` (e.g. `forwardRef`, correct module imports, or export from dedicated module). Separate from inventory Phase 0 scope.

---

## DEF-LOCAL-002 — Jest open handles after integration suite

| Field | Detail |
|-------|--------|
| **Defect ID** | DEF-LOCAL-002 |
| **Affected file** | `backend/test/integration/task-inventory-phase0.integration.spec.ts` (teardown) |

### Failure Description

After tests complete, Jest warns that async operations were not stopped. Suite still exits with failure code from test assertions, not hang.

### Error Message

```text
Jest did not exit one second after the test run has completed.
Consider running Jest with --detectOpenHandles to troubleshoot.
```

### Root Cause Hypothesis

Sequelize connection pool or NestJS app not fully closed in `afterAll`.

### Severity

**Low** — does not affect test pass/fail; CI log noise only.

### Recommended Fix

Ensure `app.close()` drains DB connections; optional `--forceExit` in CI script.

---

## Summary

| ID | Severity | Blocks |
|----|----------|--------|
| DEF-PROD-001 | Critical | Inventory runtime (10/12 tests) |
| DEF-LOCAL-001 | High | Full backend startup |
| DEF-LOCAL-002 | Low | Clean Jest exit |

**Production inventory defect count:** 1 (DEF-PROD-001)  
**Local-only defects:** 2 (DEF-LOCAL-001, DEF-LOCAL-002)
