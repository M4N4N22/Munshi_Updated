# Phase 0.5 — Runtime Validation — Implementation Report

## Summary

Phase 0.5 adds **integration tests** for the full task ↔ inventory Phase 0 chain. Tests exercise real Postgres, applied migrations, and NestJS service wiring (`TasksModule` + `InventoryModule` + `DbModule`).

**No production code was modified.**

---

## Tests Created

| File | Purpose |
|------|---------|
| `backend/test/integration/task-inventory-phase0.integration.spec.ts` | 12 integration cases covering Phases 0.1–0.4 |
| `backend/test/integration/helpers/db-env.ts` | Postgres probe, migration apply/status |
| `backend/test/integration/helpers/phase0-fixtures.ts` | Factory/user/item seeding, quantity/reference helpers |
| `backend/test/integration/setup-env.ts` | Loads `.env.local` / `.env`, extends Jest timeout |
| `backend/test/jest-integration.json` | Jest config for `*.integration.spec.ts` |

---

## Fixtures Created

**`seedPhase0Fixture`** creates per-scenario:

- Factory
- Owner + 2 workers (`FactoryUser` rows)
- Inventory category + location

**`createInventoryItemWithStock`** creates item + optional `STOCK_IN` seed quantity.

**Helpers:** `getItemQuantity`, `countTaskReferences`, `countInventoryLines`.

---

## Test Module Wiring

```text
ConfigModule (global)
  → DbModule
  → UserModule
  → DepartmentsModule
  → InventoryModule
  → TasksModule
```

Services under test: `TasksService`, `InventoryService`, `InventoryTransactionService`.

---

## Scenarios Mapped

| # | Scenario | Phase |
|---|----------|-------|
| 0.1 | Schema + model + association | 0.1 |
| 1 | Single STOCK_OUT completion | 0.3 |
| 2 | Single STOCK_IN completion | 0.3 |
| 3 | Multi-line success | 0.4 |
| 4 | Multi-line failure rollback | 0.4 |
| 5 | Insufficient stock | 0.3 |
| 6 | Reopen inventory-linked task blocked | 0.4 |
| 7 | Reopen generic task allowed | 0.4 |
| 8 | assignToAll + inventory_lines rejected | 0.3 |
| 9 | TRANSFER rejected | 0.3 |
| 10 | Duplicate completion idempotent | 0.3 |
| 0.2 | Persist, retrieve, delete cleanup | 0.2 |

---

## Environment Used

| Setting | Value |
|---------|-------|
| Connection string source | `backend/.env.local` → `postgresql://munshi:munshi@localhost:5432/munshi_data` |
| Postgres runtime | **Not running** during validation session |
| Docker | **Not available** (`Docker Desktop` daemon not running) |
| Node | v22.22.0 |
| Command | `yarn test:integration` |

---

## How to Run

```bash
# Start Postgres (example)
docker compose -f docker-compose.example.yml up postgres -d

# Apply migrations
cd backend && yarn migrate

# Run integration tests
yarn test:integration
```

---

## NEXT IMPLEMENTATION TARGETS

1. Run `yarn test:integration` in CI with Postgres service container.
2. Phase 0.6 — UX/notifications after all scenarios **PASS** locally and in CI.
3. Optional: mark tests `skip` when `INTEGRATION_SKIP=1` for dev without DB (not implemented — tests fail explicitly today).
