# Phase 4 Blueprint Summary — Architecture & Implementation Roadmap

**Date:** 2026-06-10  
**Status:** Complete (design only — no implementation)

---

## 1. Top 5 hardening priorities

1. **Contract alignment** (5 intents + JSON runtime + import phrase fix)
2. **Baseline benchmark** (before any ML edits)
3. **Stock-linked intent unification** (assign / assign_delivery / task_inventory_nl)
4. **Role-aware classification** (role in `/classify` + validity matrix)
5. **P1 anti-sink + clarification policy** (operational phrases ≠ general_chat)

---

## 2. Quick wins

- Import inventory → `inventory_import_csv` (not discovery)
- VALID_INTENTS from `intent-types.json`
- CommandParser = COMMANDS enum
- 5 missing intents in contract + LLM prompt
- Smoke eval ~200 cases + baseline report

---

## 3. Highest ROI changes

| Rank | Change |
|------|--------|
| 1 | Import collision fix |
| 2 | Contract parity (30 intents) |
| 3 | Stock-linked unification |
| 4 | Role in classify API |
| 5 | P1 general_chat guard |

---

## 4. Major architectural changes required

| Change | Type |
|--------|------|
| Classify API v2 (role, session_context) | API |
| Stock-linked single routing | Pipeline |
| confidence_tier + clarify in response | API + policy |
| Intent cluster hierarchy | Classifier structure |
| VALID_INTENTS from contract | Contract runtime |

**Not required for 4A:** hierarchy, confidence tier, factory grounding.

---

## 5. Recommended implementation order

1. Baseline benchmark  
2. Contract alignment + import fix  
3. Smoke eval (200)  
4. Re-benchmark  
5. Role API + filter  
6. P1 prompt/regex + anti-sink  
7. Eval expand (600)  
8. Stock-linked unification  
9. Confidence tier + clarify  
10. Intent hierarchy  
11. Full eval (1,200+) + CI gates  

See `53-implementation-order.md` for gates.

---

## 6. Expected improvement areas

| Area | Relative improvement |
|------|---------------------|
| Boundary accuracy (import, stock) | Very High after A+C |
| Role accuracy at classify | High after B |
| Stock-linked accuracy | Very High after C |
| Clarification success | High after D |
| Session safety | Maintained (already green) |
| Overall readiness score | 2.45 → ~4.0+ after Phase 5 |

No fabricated accuracy percentages — measure in 4A baseline.

---

## 7. Risks

| Risk | Mitigation |
|------|------------|
| Hardening without baseline | 4A first milestone |
| Stock refactor regression | Feature flag + eval slice |
| Owner UX change (clarify) | Hindi templates; one-turn |
| Eval authoring delay | Phased 200→600→1200 |
| Contract drift returns | CI contract-drift + JSON load |
| LLM flake in CI | Regex CI; LLM nightly |

Full matrix: `55-risk-analysis.md`

---

## 8. Recommended next phase

**Execute Phase 4A** (implementation allowed in future work):

| Step | Action |
|------|--------|
| 1 | Run `ml/eval` baseline + document scores |
| 2 | Implement contract v1.1 (separate approved PR) |
| 3 | Author smoke JSONL 200 cases |
| 4 | Re-benchmark |
| 5 | Go/no-go for 4B |

**Do not** implement Phase 5 refactors until 4A gates pass.

---

## Deliverables index

| File | Content |
|------|---------|
| `50-current-vs-target-architecture.md` | Current vs target by dimension |
| `51-gap-analysis.md` | G1–G10 gaps |
| `52-hardening-workstreams.md` | Workstreams A–G |
| `53-implementation-order.md` | Sequence + gates |
| `54-expected-impact-analysis.md` | Relative impact |
| `55-risk-analysis.md` | Risks per stream |
| `56-ml-hardening-roadmap.md` | 4A → 4B → 5 → 6 |
| `57-benchmark-strategy.md` | When to benchmark/generate |
| `58-executive-summary.md` | Leadership summary |
| `59-phase4-blueprint-summary.md` | This document |

---

## Document lineage

```
Phase 0 Commands → Phase 1 Capabilities → Phase 2 Boundaries
    → Phase 3 Eval Design → Phase 3.5 Architecture Audit
    → Phase 4 Blueprint (this package)
    → Phase 4A Implementation (future)
```

**No implementation. No ML/code changes. No datasets. No git operations.**
