# Phase 3H — Benchmarking Framework

**Purpose:** Define how Phase 4 measures ML capability — methodology only, no runs.

---

## Metrics

### 1. Intent Accuracy

| Field | Definition |
|-------|------------|
| **Formula** | `correct_top1 / total_classified` |
| **Scope** | Cases where `expected_classify=true` |
| **Pass (P1)** | ≥ 90% |
| **Pass (P2)** | ≥ 85% |
| **Pass (P3)** | ≥ 80% |
| **Unit** | Per-intent and macro-averaged |

---

### 2. Boundary Accuracy

| Field | Definition |
|-------|------------|
| **Formula** | `correct_side_of_pair / pair_total` |
| **Scope** | Dataset 31 — 12 boundary pairs |
| **Pass** | ≥ 88% per pair; ≥ 90% macro |
| **Failure modes** | Track A→B and B→A confusion matrix |

---

### 3. Role Accuracy

| Field | Definition |
|-------|------------|
| **Formula A** | Valid: `intent ∈ valid_set(role)` |
| **Formula B** | Invalid: `intent ∉ forbidden_set(role)` OR clarify triggered |
| **Scope** | Dataset 32 |
| **Pass** | ≥ 95% invalid rejection; ≥ 92% valid routing |
| **Note** | Role may be passed to classifier as context (future) |

---

### 4. Ambiguity Resolution Accuracy

| Field | Definition |
|-------|------------|
| **Formula** | `(correct_route + correct_clarify) / ambiguity_total` |
| **Scope** | Dataset 33 — hotspots HS-01–HS-15 |
| **Pass** | ≥ 85% |
| **Sub-metrics** | Over-clarify rate ≤ 10%; under-clarify rate ≤ 5% |

---

### 5. Session Accuracy

| Field | Definition |
|-------|------------|
| **Formula** | `correct_routing_decision / session_total` |
| **Scope** | Dataset 34 |
| **Includes** | Suppression, CONFIRM/CANCEL, bypass, expiry |
| **Pass** | ≥ 92% |
| **Split** | Classifier-not-invoked cases scored on routing layer |

---

### 6. Clarification Accuracy

| Field | Definition |
|-------|------------|
| **Formula** | `appropriate_clarify / clarify_required_total` |
| **Scope** | Subset of 33 + low-confidence policy 26 |
| **Pass** | ≥ 88% |
| **Fail** | Clarify when slots complete; no clarify on HS-06 class |

---

### 7. Slot Extraction F1 (secondary)

| Slots | Intents |
|-------|---------|
| worker_slug, depart_slug | assign, mgr*, depart |
| id (task/issue) | complete, update, mgr*, resolve |
| sku, quantity | assign_delivery, task_inventory_nl |
| reject_reason | mgrreject |

**Pass:** F1 ≥ 0.85 per slot family on labeled subset.

---

## Benchmark suites

| Suite | Cases | When run |
|-------|------:|----------|
| **Smoke** | 100 | Every ML change |
| **P1 Core** | 600 | Pre-release |
| **Full** | ~1,800 recommended | Weekly / milestone |
| **Regression** | ~2,800 benchmark | Major version |

---

## Execution methodology (Phase 4)

```
For each case:
  1. Set role (if applicable)
  2. Set session_context (if applicable)
  3. POST /classify?message=...
  4. If session_context.suppress_classify → verify routing mock
  5. Compare intent, slots, behavior to expected
  6. Log confusion pair
```

**Environment:** Fixed ML_URL; pinned contract version; seed for any stochastic components.

---

## Reporting format

| Section | Content |
|---------|---------|
| Summary | 6 metric scores + pass/fail |
| Per-intent | Accuracy, support, top confusions |
| Per-boundary-pair | Confusion matrix |
| Role violations | List of INV-* failures |
| Contract gap | Separate section until aligned |
| Regression delta | vs previous benchmark run |

---

## Exclusions from Intent Accuracy

- Cases with `expected_classify=false` (session handlers)
- `general_chat` when greeting-only (scored separately)
- Backend-only enforcement (role block after classify) — track as **downstream rejection** metric

---

## Gate to production hardening

| Metric | Threshold |
|--------|-----------|
| P1 Intent Accuracy | ≥ 90% |
| Boundary Accuracy | ≥ 90% |
| Role invalid rejection | ≥ 95% |
| Contract gap intents | 100% in contract + ≥ 85% accuracy each |
| Session Accuracy | ≥ 92% |
| No P1 pair below | 85% |
