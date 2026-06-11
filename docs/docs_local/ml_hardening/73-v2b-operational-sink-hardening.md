# ML Hardening V2B — Operational Intent Sink Elimination

**Date:** 2026-06-11  
**Branch:** `feature/shantanu-ml-hardening-v1`  
**Basis:** Doc 72 boundary failure analysis  
**Scope:** Assign-family sink elimination — no role, confidence tiers, or intent hierarchy

---

## Summary

V2B eliminates the primary failure mode identified in doc 72: **operational phrase → regex miss → `general_chat`**. Assign-family recall on smoke rose from **33% to 100%**; overall smoke accuracy from **81% to 97.5%**.

| Metric | V1 (pre-V2B) | V2B | Delta |
|--------|--------------|-----|-------|
| Smoke accuracy | 81.0% | **97.5%** | +16.5 pp |
| Smoke failures | 38 | **5** | −33 |
| `/assign` recall (smoke) | 33% (8/24) | **100%** (24/24) | +67 pp |
| assign_depart slice | ~56% | **100%** | +44 pp |
| assign_clarify slice | ~53% | **100%** | +47 pp |
| stock_linked slice | ~52% | **100%** | +48 pp |
| assign-family → `general_chat` | ~14 cases | **0** | eliminated |
| Workflow eval accuracy | 96.04% | **96.04%** | 0 (no regression) |
| ML pytest | 79 passed | **91 passed** | +12 tests |
| Contract drift (ML + backend) | pass | **pass** | 0 |

---

## Files changed

| File | Change |
|------|--------|
| `ml/bot_engine.py` | Delegation regex expansion, dept detection, vendor/report collision fixes, anti-sink policy, stock worker extraction, passive-future guards |
| `ml/tests/test_v2b_sink_hardening.py` | **New** — V2B regression tests for person/dept/stock/anti-sink |
| `docs/docs_local/ml_hardening/73-v2b-operational-sink-hardening.md` | This report |

---

## Phase 1 — General_chat sink audit

### Sink path (pre-V2B)

```
Message
  → CommandParser (slash only)
  → workflow_pre_classify
  → operational_pre_classify
  → assign_clarify_pre_classify
  → deterministic_pre_classify
  → [use_llm=False] → general_chat   ← 60% of assign-family failures
```

### Mapped fall-through causes (pre-V2B)

| Cause | Examples | V2B fix |
|-------|----------|---------|
| Narrow `_ASSIGN_PERSON_RE` | `call kare`, `file bhejo`, `cleaning karo` | `_ASSIGN_KO_INSTRUCT_RE` + helpers |
| `_ASSIGN_EXCLUDE_RE` whole-message block | `priya client ko call kare` | Third-party object pattern; name-only exclude |
| `_REPORT_RE` before assign | `ajay ko report bhejo` | Person-report guard before report block |
| `_VENDOR_NOTIFICATION_RE` early return | `quotation bhejo` | Conditional barrier `_is_vendor_notification_barrier` |
| Dept slug/team gaps | `sales team ko target do` | `_DEPT_TEAM_RE`, `_DEPT_SLUG_DIRECT_RE`, expanded `_DEPT_ACTION_RE` |
| Passive future → inventory_status | `inventory check karna hai` | `_PASSIVE_FUTURE_TASK_RE` guard in workflow + operational |
| Stock worker order | `50 bolt bhejo anil ko` | Extended `_extract_mgr_worker` + `_STOCK_ITEM_RE` |
| Residual delegation signals | `sabko training do` | `delegation_anti_sink_pre_classify` → `/assign_clarify` |

---

## Phase 2 — Delegation vocabulary expansion

### Person assignment patterns added

- **Ko + generic verbs:** call, file, list, email, cleaning, audit, sample, training, bol dena, report do
- **Third-party object:** `priya client ko call kare` → assignee `priya`
- **Se construction:** `priya se packing karwao`, `meeting setup karo ram se`
- **Passive future + person:** `ajay ko website banani hai`
- **Bare ko tail:** `meena ko training`

### Functions

- `_extract_person_assignee()` — multi-pattern extractor
- `_PERSON_ASSIGN_EXCLUDE_NAMES` — replaces whole-message `_ASSIGN_EXCLUDE_RE`

---

## Phase 3 — Department vocabulary expansion

- `_DEPT_SLUG_DIRECT_RE` — `operations ko`, `purchase ko vendor call`
- `_DEPT_TEAM_RE` — `sales team`, `dispatch team`
- `_DEPT_ACTION_RE` expanded — target, call, load, dena, followup, karwao
- Passive-future guard prevents `inventory check karna hai` → `/depart_assign`

---

## Phase 4 — Report / vendor collision review

### Report

- Person-directed report instructions classified **before** `_REPORT_RE`
- `_is_person_directed_report()` helper for report-block guard

### Vendor

- `_is_vendor_notification_barrier()` — dept routing (`quotation bhejo`) overrides vendor keyword match
- `_VENDOR_STATUS_NOTIFY_RE` — preserves notification barrier for `order status update karo` (no `/update` regression)

### Procurement guard

- `order karo` + procurement intent → workflow purchase path preserved (`packaging tape order karo`)

---

## Phase 5 — Anti-sink policy

`delegation_anti_sink_pre_classify()` runs when `use_llm=False` and all prior stages abstain.

**Safest fallback:** `/assign_clarify` (not wrong `/assign` or `/depart_assign`).

Triggers on delegation signals (`ko`, `se`, `sabko`, dept team/slug) + instruction verbs or draft patterns.

Does **not** fire for attendance, tasks, reports, issues, manager phrases, or workflow hits.

---

## Phase 6 — Benchmarking

### Smoke (`smoke-v1.1.jsonl`, deterministic)

| Slice | V1 | V2B |
|-------|-----|-----|
| assign_depart (25) | ~56% | **100%** |
| assign_clarify (15) | ~53% | **100%** |
| stock_linked (25) | ~52% | **100%** |
| import_boundary (25) | 100% | **100%** |
| regression (15) | — | **100%** |
| mgr_boundary (35) | — | 97.1% |
| complete_update (15) | — | 80% |

### Workflow eval

- **96.04%** unchanged (17 failures — pre-existing, outside V2B scope)

### Manager eval

- `tests/test_manager_intent_hardening.py` — all pass
- No manager workflow regressions in targeted regression class

### Regression suites

- ML pytest: **91 passed** (was 79)
- Backend contract drift: **43 passed**
- ML contract drift: **passed** (compliance 1.0)

---

## Phase 7 — Validation

| Criterion | Result |
|-----------|--------|
| assign recall improved | **Yes** — 33% → 100% |
| general_chat leakage decreased | **Yes** — assign-family 14 → 0 |
| manager workflows unaffected | **Yes** — manager tests pass; 1 pre-existing mgrself smoke miss remains |
| import inventory unaffected | **Yes** — import_boundary 100% |
| contract parity preserved | **Yes** — drift tests pass |
| no V2/V3 scope introduced | **Yes** — no role, confidence, or hierarchy |

---

## Remaining failure modes (5 smoke cases)

| ID | Message | Expected | Got | Slice | Notes |
|----|---------|----------|-----|-------|-------|
| SMOKE-CA-004 | band karo | `/cancel` | `general_chat` | contract_gap | Cancel regex gap — out of V2B scope |
| SMOKE-S6-015 | main task 3 | `/mgrself` | `general_chat` | mgr_boundary | Manager self-assign shorthand |
| SMOKE-S9-011 | 80 percent done task 5 | `/update` | `/mgrassign` | complete_update | Task-id + progress → mgr intercept |
| SMOKE-S9-013 | status update task 7 | `/update` | `/mgrassign` | complete_update | Same |
| SMOKE-S9-015 | half complete task 2 | `/update` | `/mgrassign` | complete_update | Same |

**None of the remaining failures are assign-family → general_chat.**

---

## General_chat reduction (assign cluster)

| Intent family | V1 FN → general_chat | V2B FN → general_chat |
|---------------|----------------------|------------------------|
| `/assign` | 14 | **0** |
| `/depart_assign` | 4 | **0** |
| `/assign_clarify` | 1+ | **0** |
| `/assign_delivery` | 0 | **0** |
| `/task_inventory_nl` | 0 | **0** |

---

## Readiness for next hardening wave

**Ready.** V2B objectives met. Recommended next wave (V2C):

1. **Update vs mgrassign** — 3 smoke failures in `complete_update` slice (task-id progress phrases)
2. **Cancel vocabulary** — `band karo` → `/cancel`
3. **Manager shorthand** — `main task 3` → `/mgrself`
4. **LLM-on smoke slice** — measure production path for residual ambiguous cases
5. **Role-aware classify** (V3) — deferred per scope

---

## References

- Analysis: `72-boundary-failure-analysis.md`
- V1 completion: `70-ml-hardening-v1-completion-report.md`
- Smoke report: `ml/eval/reports/smoke_intent_eval_deterministic.json`
