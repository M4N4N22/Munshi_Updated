# Phase 4 — Benchmark Strategy

Benchmarking must **drive** hardening, not delay it.

---

## Principles

1. **Baseline before change** — one measured point beats guessing
2. **Smoke before full** — 200 cases gate contract work
3. **Re-benchmark after each wave** — not only at end
4. **Separate classify vs E2E** — owner home masks classify errors
5. **Regex CI, LLM nightly** — cost and flake control

---

## When to benchmark

| Event | Benchmark type | Suite size |
|-------|--------------|------------|
| **Now (4A start)** | Baseline | Existing eval + 100 LLM P1 sample |
| After contract alignment | Smoke re-run | ~200 |
| After 4B (role + P1) | P1 core | ~600 |
| After Phase 5 refactors | Full | ~1,800 |
| Each release | Regression smoke | 200 |
| Monthly / major ML change | Full regression | ~2,800 |

---

## When to generate datasets

| Phase | Dataset action |
|-------|----------------|
| **Before 4A implementation** | ❌ Do not author 1,200 cases |
| **During 4A** | ✅ Author smoke ~200 (P1 + contract gap + import) |
| **During 4B** | ✅ Expand to ~600 (boundaries + role + ambiguity) |
| **During Phase 5** | ✅ Complete ~1,200 min; start regression holdout |
| **Phase 6** | ✅ Expand to ~2,800; adversarial mining |

**Labeling order:** Contract-gap → import collision → assign/depart → mgr → stock → role-invalid → session (routing-only).

---

## When to re-benchmark

| Trigger | Action |
|---------|--------|
| Any `intent-types.json` change | Smoke |
| `bot_engine.py` regex change | Smoke + affected boundary pairs |
| LLM prompt change | P1 core (600) |
| Classify API schema change | Role + session slices |
| Stock routing change | Stock-linked full slice |
| Pre-release | Regression smoke minimum |

---

## Benchmark supports hardening (not blocking)

| Anti-pattern | Correct approach |
|--------------|------------------|
| Wait for 1,200 cases before any fix | Smoke 200 + contract fix in parallel |
| Single benchmark at end | Re-benchmark per milestone M4A-6, M4B-7, M5-7 |
| LLM in every PR | Regex `classify_hybrid` in CI; LLM scheduled |
| E2E only | Classify-layer metrics primary for ML team |

---

## Metrics dashboard (per run)

| Metric | Source doc |
|--------|------------|
| Intent accuracy | 37 |
| Boundary accuracy | 31 |
| Role accuracy | 32 |
| Ambiguity resolution | 33 |
| Session routing | 34 |
| Contract gap pass rate | 35 |

Store: `ml/eval/reports/{date}-{wave}.json` (future convention).

---

## Go / no-go for production hardening flag

| Check | Threshold |
|-------|-----------|
| P1 intent accuracy | ≥ 90% |
| Worst boundary pair | ≥ 85% |
| Role invalid rejection | ≥ 95% |
| Stock-linked slice | ≥ 85% |
| Session routing | ≥ 92% |
| No critical RED from 48 | Stock + role addressed |

---

## Parallel tracks

```
Week-style relative timeline (not calendar commitments):

Track Eval:  Baseline → smoke author → expand → regression
Track ML:    contract → role → stock → confidence → hierarchy
Gate:        smoke pass required between ML waves
```
