# Phase 4 — Expected Impact Analysis

**Method:** Relative impact (Low / Medium / High / Very High) — not fabricated percentages.  
**Baseline:** Phase 3.5 readiness 2.45/5; no production accuracy numbers available.

---

## By metric (post-hardening waves)

| Metric | Baseline expectation | After Quick Wins (A) | After Medium (A+B+D partial) | After Major (C+D+E) |
|--------|---------------------|----------------------|------------------------------|---------------------|
| **Overall intent accuracy** | Unknown; P1 likely below target | Low–Med lift | Medium lift | High lift |
| **Boundary accuracy** | Weak on stock, import, mgr | Med lift (import, 5 intents) | Med–High | High |
| **Role accuracy (classify)** | ~0% by design | No change | High lift | High sustained |
| **Stock-linked accuracy** | RED — dual path failures | Low (slash only) | Low–Med | Very High |
| **Clarification success** | assign_clarify only | Low | Medium | High |
| **Session safety** | GREEN (backend) | No change | No change | No change |

---

## By workstream

| Workstream | Primary metrics improved | Relative impact |
|------------|-------------------------|---------------|
| A Contract | Intent coverage, import boundary, eval validity | **High** for gap intents; **Med** overall |
| B Role | Role accuracy, invalid emission rate | **High** for role eval; **Med** E2E |
| C Stock-linked | assign vs delivery boundary, stock-linked accuracy | **Very High** for P1 stock |
| D Confidence/clarify | Ambiguity resolution, P1 false general_chat | **High** for ambiguous phrases |
| E Hierarchy | Boundary pairs within clusters | **Medium–High** delegation/mgr/inventory |
| F Eval | Observability (enables all) | **Indirect — critical** |
| G Session | Session accuracy (maintain) | **Low** (already green) |

---

## Quick wins impact (order 1–5)

| Change | Expected effect |
|--------|-----------------|
| Import collision fix | **High** on inventory import boundary pair |
| 5 intents in contract/prompt | **High** on contract-gap eval; **Med** on NL routing |
| VALID_INTENTS from JSON | **Low** direct; **High** prevents future drift |
| Baseline benchmark | **No accuracy change** — enables measurement |

---

## Major refactors impact

| Change | Expected effect |
|--------|-----------------|
| Stock unify | **Very High** on assign ↔ task_inventory_nl ↔ assign_delivery |
| confidence_tier | **High** on ambiguity + false general_chat |
| Hierarchy | **Medium–High** on cross-cluster confusions; possible latency cost |

---

## Overall readiness score trajectory (relative)

| Stage | Readiness (1–5) | Notes |
|-------|-----------------|-------|
| Today | 2.45 | Phase 3.5 |
| After A + smoke eval | ~3.0 | Contract complete; import fixed |
| After A + B + partial D | ~3.5 | Role + anti-sink |
| After C + D + E | ~4.0+ | P1 targets achievable |
| With factory grounding | ~4.5 | Optional future |

**Caveat:** Scores are architectural capability, not measured accuracy until F runs.

---

## What will NOT improve without major work

- Session accuracy (already green)
- Worker UX for invalid intents until B ships
- SKU natural language without C or extractor loosening
- Suggestion_approve NL (workflow-triggered — low priority)
