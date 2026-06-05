# Phase 0.5 — Runtime Validation — Impact Analysis

## Defects Discovered

| ID | Defect | Root cause | Fix | Production risk |
|----|--------|------------|-----|-----------------|
| — | **None in application code** | Integration tests could not connect to Postgres | N/A | Unknown until runtime PASS |

### Test harness fix (non-production)

| Issue | Fix |
|-------|-----|
| `import pg from 'pg'` → `pg.Client` undefined under Jest/ts-jest | Changed to `import { Client } from 'pg'` in `db-env.ts` |

---

## Production Risk Assessment

| Risk | Level | Notes |
|------|-------|-------|
| Undetected Phase 0 bugs | **HIGH** | No scenario reached live DB |
| Inventory corruption in prod | **UNKNOWN** | Static + unit tests only from prior phases |
| False confidence from test file existence | **MEDIUM** | Tests must PASS before deploy |

---

## Recommended Fixes

None required in production code based on this validation session.

**Before deployment:**

1. Start local or CI Postgres.
2. Run `yarn migrate && yarn test:integration` — all 12 scenarios must **PASS**.
3. Archive Jest output in `10-runtime-validation-results.md`.

---

## Deployment Readiness

| Criterion | Status |
|-----------|--------|
| Integration tests exist | **YES** |
| Integration tests PASS | **NO** |
| NOT VERIFIED items closed | **NO** |
| Phase 0.6 (UX/notifications) | **Blocked** until runtime PASS |

**Recommendation:** **Hold Phase 0.6** until integration suite passes in CI or local Docker environment.

---

## Files Added (test only)

```text
backend/test/jest-integration.json
backend/test/integration/setup-env.ts
backend/test/integration/helpers/db-env.ts
backend/test/integration/helpers/phase0-fixtures.ts
backend/test/integration/task-inventory-phase0.integration.spec.ts
```

**Modified:** `backend/package.json` — `"test:integration"` script only.

---

## Future Impact

| Item | Impact |
|------|--------|
| CI pipeline | Add Postgres service + `yarn test:integration` |
| Developer workflow | Document Docker prerequisite for inventory tests |
| Phase 0.6 | Safe to start after green integration run |

---

## NEXT IMPLEMENTATION TARGETS

1. CI: Postgres 16 + migrate + integration tests on every PR touching tasks/inventory.
2. Re-run validation and flip all scenarios from NOT VERIFIED → PASS.
3. Phase 0.6 — WhatsApp/Hindi insufficient-stock UX and completion stock summary (p2 §0.5–0.6).
