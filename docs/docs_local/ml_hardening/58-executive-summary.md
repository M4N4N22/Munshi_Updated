# Phase 4 — Executive Summary (ML Hardening Blueprint)

**Audience:** Leadership, product, engineering  
**Status:** Design complete — no implementation

---

## Situation

Munshi uses a **hybrid regex + LLM** WhatsApp intent classifier. Business capabilities are well-mapped (Phases 0–2), but the ML layer scores **2.45/5 readiness** (Phase 3.5): strong on session routing, weak on role awareness, stock-linked intents, and contract parity.

---

## Top priorities

1. **Contract alignment** — 5 missing intents + import phrase collision
2. **Baseline benchmark** — measure before changing
3. **Stock-linked unification** — single routing for delivery/stock tasks
4. **Role-aware classification** — pass role into `/classify`
5. **Stop P1 silent failures** — reduce `general_chat` sink for operational phrases

---

## Quick wins

- Fix `import inventory` → `business_discovery` misroute
- Add 5 intents to contract + VALID_INTENTS + prompt
- Load VALID_INTENTS from JSON (eliminate drift)
- CommandParser parity with backend COMMANDS
- 200-case smoke eval + baseline report

**Relative effort:** Low. **Relative impact:** High on import and contract gaps.

---

## Highest ROI changes

| Change | ROI | Why |
|--------|-----|-----|
| Import collision fix | Very High | Wrong workflow today; tiny change |
| Contract + 5 intents | Very High | Unblocks NL and eval |
| Stock-linked unify | Very High | Core P1 business risk |
| Role in classify | High | Enables safety + eval |
| P1 anti-sink rules | High | Stops masked failures for owners |
| Intent hierarchy | Medium–High | Reduces ongoing confusion cost |

---

## Biggest architectural weaknesses

1. **Role-blind classifier** — post-hoc enforcement only
2. **Dual stock routing** — extractor vs classify split
3. **Flat intent namespace** — 25+ LLM siblings
4. **No confidence signal** — cannot clarify systematically
5. **general_chat sink** — owners see home menu on ML failure

---

## Recommended first implementation

**Phase 4A only:**

1. Run baseline benchmark
2. Ship contract v1.1 (no behavior change beyond import fix + 5 intents)
3. Author smoke eval 200 cases
4. Re-benchmark

**Do not start** stock unification or confidence tier until 4A gates pass.

---

## Recommended final architecture

- **Classify API v2:** message + role + optional session_context
- **Response v2:** intent + slots + confidence_tier + optional clarify_prompt
- **Single contract:** 30 intents from JSON at runtime
- **Layered pipeline:** session policy → slash → cluster router → pre/LLM → validation
- **Unified stock cluster:** one decision for delivery/count/issue-stock
- **Eval-gated CI:** smoke on PR, full on release

Target readiness: **~4.0+/5** with measured P1 accuracy ≥90%.

---

## Investment shape

| Wave | Nature | Relative size |
|------|--------|---------------|
| 4A | Quick wins + measure | Small |
| 4B | Role + P1 prompts | Medium |
| 5 | Refactors | Large |
| 6 | Ops + regression | Ongoing medium |

---

## Success definition

A factory owner can say "steel rod kitna hai", "CSV se stock import karo", or "Ram ko 50 bolt bhejo" — and Munshi routes correctly **without** wrong assign, wrong discovery, or silent home menu — with eval proof in CI.
