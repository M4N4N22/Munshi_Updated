# Phase 4 — Risk Analysis

Per workstream: technical, operational, regression, maintenance.

---

## Workstream A — Contract Alignment

| Risk type | Detail | Mitigation |
|-----------|--------|------------|
| Technical | Prompt bloat adding 5 intents | Group in hierarchy (E); focused few-shots |
| Operational | Deploy ML without backend | Version contract; coordinate releases |
| Regression | discovery phrase change breaks onboarding | Eval cases for both paths |
| Maintenance | JSON still edited in two repos | Single sync script or shared package |

---

## Workstream B — Role-Aware Classification

| Risk type | Detail | Mitigation |
|-----------|--------|------------|
| Technical | Backend must pass role on every classify call | Default null = legacy behavior |
| Operational | Stale role if user promoted mid-session | Refresh role from DB each message (already done) |
| Regression | Over-filtering valid manager phrases | Role eval suite (doc 32) |
| Maintenance | Matrix updates when commands added | Matrix in docs + contract test |

---

## Workstream C — Stock-Linked Unification

| Risk type | Detail | Mitigation |
|-----------|--------|------------|
| Technical | Breaking tryHandleFreeText order | Feature flag; parallel run compare |
| Operational | Users mid-migration on old phrasing | No user-facing slash change |
| Regression | Delivery tasks stop creating inventory lines | Integration tests + stock eval |
| Maintenance | Two code paths during transition | Time-boxed migration; delete old path |

---

## Workstream D — Confidence & Clarification

| Risk type | Detail | Mitigation |
|-----------|--------|------------|
| Technical | Subjective tier assignment | Eval rubric; human review sample |
| Operational | More bot messages (clarify) | Hindi templates; one-turn limit |
| Regression | Over-clarify on clear phrases | clarify-forbidden subset (doc 33) |
| Maintenance | Policy rules grow | Centralize policy table |

---

## Workstream E — Intent Hierarchy

| Risk type | Detail | Mitigation |
|-----------|--------|------------|
| Technical | Two LLM calls = latency + cost | Cluster regex first; LLM only on miss |
| Operational | Slower responses on long-tail | Timeout budgets |
| Regression | Wrong cluster → wrong intent always | Cluster-level eval |
| Maintenance | Complex debug | Log cluster + intent |

---

## Workstream F — Evaluation & Benchmarking

| Risk type | Detail | Mitigation |
|-----------|--------|------------|
| Technical | Flaky LLM in CI | Regex-only CI; LLM nightly |
| Operational | Authoring 1200 cases delays shipping | Phased: 200 → 600 → 1200 |
| Regression | False confidence from overfit eval | Holdout set; adversarial cases |
| Maintenance | Eval drift from product | Quarterly review |

---

## Workstream G — Session Routing

| Risk type | Detail | Mitigation |
|-----------|--------|------------|
| Technical | Low — backend stable | Session eval suite |
| Operational | Users confused by session lock | cancel always works |
| Regression | CONFIRM misrouted if gate order changes | Integration tests |
| Maintenance | Document routing order in one spec |

---

## Cross-cutting risks

| Risk | Severity | Notes |
|------|----------|-------|
| Hardening without baseline | High | Optimize unknown wrong directions |
| Big-bang LLM prompt rewrite | High | Incremental + eval per change |
| Owner home masking in prod metrics | Medium | Separate classify vs E2E metrics |
| OpenAI API dependency | Medium | Regex path for critical intents |
| Regex + LLM duplication | Medium | Long-term hierarchy reduces regex |

---

## Risk acceptance

| Risk | Accept for v1? |
|------|----------------|
| No factory grounding in classify | Yes — Phase 6 |
| LLM in production classify | Yes — with regex first |
| Partial eval coverage at launch | Yes — smoke ≥200, expand later |
