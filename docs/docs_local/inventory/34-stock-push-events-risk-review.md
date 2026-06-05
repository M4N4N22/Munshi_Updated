# Phase 2.5.1 — Stock Push Event Capture Risk Review

**Run date:** 2026-06-04

---

## R-P05-02 — Publish After Commit

| Item | Status |
|------|--------|
| Events inside transaction? | **No** |
| Publish location | After `sequelize.transaction()` resolves |
| Rollback suppresses events? | **Yes** — verified in tests 3 and 4 |
| Task incomplete on failure? | **Yes** |

**Verdict:** R-P05-02 **MITIGATED**

---

## TASK-Only Filtering

| Path | Publishes events? | Verified |
|------|-------------------|----------|
| Task completion (`TASK`) | Yes | Test 1, 2 |
| CSV import (`CSV_IMPORT`) | No | Test 5 |
| Zoho pull (`ZOHO_PULL`) | No | Test 6 |
| REST / document paths | No | Structural — no publish call outside task completion |

**Verdict:** TASK-only filtering **PRESERVED**

---

## Scope Boundaries (2.5.1)

| Forbidden item | Present? |
|----------------|----------|
| Idempotency table | **No** |
| Push delivery table | **No** |
| Zoho API client for push | **No** |
| `ZohoPushService` | **No** |
| `ZohoPushHandler` | **No** |
| Dispatch registry | **No** |
| Stock push execution | **No** |

---

## Residual Risks (Deferred to 2.5.2+)

| ID | Risk | Notes |
|----|------|-------|
| R-P05-04 | Duplicate push on event replay | Requires `integration_push_deliveries` idempotency |
| R-P05-05 | Event publish failure after commit | Outbox retry + handler in 2.5.2; task/inventory already committed |
| R-P05-07 | STOCK_IN push scope | Events captured for STOCK_IN; Zoho push handler may filter in 2.5.2 |
| R-P05-08 | Unmapped items | Handler must skip/log; not addressed in capture phase |

---

## Summary

Phase 2.5.1 satisfies capture-phase risk controls. R-P05-02 and TASK-only filtering are implemented and tested. Push execution risks remain appropriately deferred until Phase 2.5.2.
