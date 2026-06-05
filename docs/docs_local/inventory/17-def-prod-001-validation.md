# DEF-PROD-001 Validation Report

**Run date:** 2026-06-05  
**Command:** `cd backend && yarn test:integration`  
**Post-fix verification**

---

## 1. Integration Test Results

```text
Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
Snapshots:   0 total
Time:        16.716 s
Exit code:   0
```

Full output: `docs/docs_local/inventory/_def-prod-001-test-output.txt`

---

## 2. Runtime Evidence

Post-fix SQL pattern (from test logs): transactional selects hit `inventory_items` only with `FOR UPDATE` — no LEFT OUTER JOIN before lock.

Pre-fix failure (resolved):

```text
ERROR: FOR UPDATE cannot be applied to the nullable side of an outer join
```

Post-fix: all movement scenarios complete without query errors; stock quantities and TASK references asserted by tests.

---

## 3. Pass Count

| Metric | Value |
|--------|-------|
| Total tests | 12 |
| Passed | **12** |
| Failed | **0** |

---

## 4. Fail Count

**0**

---

## 5. Remaining Failures

None.

**Warning (non-blocking):**

```text
Jest did not exit one second after the test run has completed.
```

This is DEF-LOCAL-002 (open handles) — out of scope for this fix.

---

## 6. Final Verdict

### Scenario classification

| Scenario | Phase | Result |
|----------|-------|--------|
| 0.1 Foundation | 0.1 | **PASS** |
| 1 STOCK_OUT completion | 0.3 | **PASS** |
| 2 STOCK_IN completion | 0.3 | **PASS** |
| 3 Multi-line success | 0.4 | **PASS** |
| 4 Multi-line rollback | 0.4 | **PASS** |
| 5 Insufficient stock | 0.3 | **PASS** |
| 6 Reopen inventory-linked | 0.4 | **PASS** |
| 7 Reopen non-inventory | 0.4 | **PASS** |
| 8 assignToAll + lines | 0.3 | **PASS** |
| 9 TRANSFER rejection | 0.3 | **PASS** |
| 10 Duplicate completion | 0.3 | **PASS** |
| 0.2 Persist / retrieve / delete | 0.2 | **PASS** |

### Phase summary

| Phase | Verdict |
|-------|---------|
| 0.1 Foundation | **PASS** |
| 0.2 Persistence | **PASS** |
| 0.3 Movement | **PASS** |
| 0.4 Safety | **PASS** |

### DEF-PROD-001

**FIXED — PASS**

Integration suite validates task ↔ inventory Phase 0 behavior at runtime.
