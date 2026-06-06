# Phase 3.1 — Low Stock Alert Risk Review

**Run date:** 2026-06-06

---

## Risk Register

| ID | Risk | Severity | Mitigation | Status |
|----|------|----------|------------|--------|
| R-01 | Alert spam on repeated low stock-outs | Medium | Threshold-cross only (`didCrossLowStockThreshold`) | **Mitigated** |
| R-02 | Event before commit (lost or premature) | High | `transaction.afterCommit()` | **Mitigated** |
| R-03 | Inventory math regression | Critical | Alert code isolated from delta/qty logic | **Mitigated** |
| R-04 | Duplicate WhatsApp on event replay | Low | Outbox marks COMPLETED; cross-only publish | **Accepted** |
| R-05 | Owner without phone | Low | Handler logs warn and skips | **Accepted** |
| R-06 | Circular module dependency | Medium | forwardRef on Inventory/DomainEvents/Integration | **Mitigated** |
| R-07 | ADJUSTMENT drops below threshold unnoticed | Low | By design — STOCK_OUT only per spec | **Accepted** |
| R-08 | Dept manager not notified | Low | P2 mentions manager; this task owner-only | **Deferred** |
| R-09 | WhatsApp send failure | Medium | Outbox retries up to 5 if handler throws | **Mitigated** |

---

## Compliance

| Rule | Status |
|------|--------|
| No inventory calculation changes | **COMPLIANT** |
| Reuse existing infrastructure | **COMPLIANT** |
| CTA only for purchase request | **COMPLIANT** |
| No registry refactor | **COMPLIANT** |

---

## Remaining Limitations

1. **Owner only** — department managers not copied on alert.
2. **No dedup window** — restock above threshold then cross again re-alerts (intentional).
3. **STOCK_OUT only** — adjustment-driven threshold cross does not alert.
4. **Single owner phone** — first OWNER role link used.

---

## Overall Assessment

**LOW** risk. Additive alerting on proven outbox path with threshold-cross guard.

**Risk review:** **PASS**
