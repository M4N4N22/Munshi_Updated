# Phase 4A — Implementation Risk Review

---

## Workstream summary

| Workstream | Phase | Complexity | Risk | Dependencies | Payoff |
|------------|-------|------------|------|--------------|--------|
| Contract Alignment | 4A | Medium | Medium | PR-1 harness | High |
| Role Awareness | 4B | High | High | 4A gates | High |
| Stock Unification | 5 | High | High | 4B, extract audit | High |
| Confidence | 5 | Medium | Medium | Eval volume | Medium |
| Hierarchy | 5 | Medium | Low–Med | Stock + role | Medium |

---

## Contract Alignment (4A — PR-2)

### Complexity: Medium

- 5 intents + phrase fix + 4-file sync + bot_engine prompt/regex
- `VALID_INTENTS` hardcoded today — sync burden

### Risk: Medium

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Phrase behavior change | High | Med | Smoke S2, release notes |
| Dual path task_inventory | Med | Med | Document; Phase 5 |
| Prompt bloat | Low | Low | Focused few-shots |
| Drift JSON vs Python | Med | High | Drift tests; load JSON |

### Dependencies

- PR-1 optional for tests
- Backend deploy with ML for phrase fix

### Payoff: **Highest ROI in 4A**

- Unblocks eval labels, reduces discovery false positives, aligns product commands

---

## Role Awareness (4B)

### Complexity: High

- API change, prompt injection, backend passes role, eval per role matrix

### Risk: High

| Risk | Impact |
|------|--------|
| Wrong role in WhatsApp context | Mis-routing mgr vs owner |
| Eval combinatorics | Roles × intents explosion |
| Backward compat | Default role behavior |

### Dependencies

- 4A complete; doc 22 matrix; session/role resolution in backend

### Payoff: High — fixes mgr* and assign boundaries under wrong persona

---

## Stock Unification (Phase 5)

### Complexity: High

- Merge `taskInventoryNl` pre-ML + `/extract/task-inventory` + classify
- assign_delivery vs assign vs task_inventory_nl

### Risk: High

| Risk | Impact |
|------|--------|
| Production stock ops regression | Data integrity |
| Latency (extract + classify) | UX |
| Rollback difficulty | Ops |

### Dependencies

- G5-S1–S5; inventory idempotency branch stability

### Payoff: High long-term — single mental model for stock NL

---

## Confidence (Phase 5)

### Complexity: Medium

- Schema, threshold tuning, clarify UX

### Risk: Medium

- Over-clarify annoys users; under-clarify causes wrong ops

### Dependencies

- LLM eval volume; backend clarify path

### Payoff: Medium — reduces costly misroutes

---

## Hierarchy (Phase 5)

### Complexity: Medium

- Parent intents, nested VALID_INTENTS, routing refactor

### Risk: Low–Medium

- Mostly structural; breaking if clients depend on flat list

### Dependencies

- Stock + role stable

### Payoff: Medium — maintainability and prompt compression

---

## Cross-cutting risks

| Risk | Affected | Note |
|------|----------|------|
| LLM non-determinism | All eval | Pin model; regex CI |
| Branch divergence | Inventory feature branch | Merge policy before 4B prod |
| Legacy `intent_eval.py` | PR-1 | Confusing if not deprecated |
| OpenAI cost | PR-4 | Budget for LLM smoke |

---

## Risk-ranked implementation order

1. Contract + import fix (4A) — **best risk/reward**
2. Benchmark harness (4A) — low risk enabler
3. Role (4B) — high value, isolate behind flag
4. Stock unify — highest blast radius, latest
