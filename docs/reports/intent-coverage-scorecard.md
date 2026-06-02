# Intent Coverage Scorecard

**Date:** 2026-06-01  
**Test engine:** Local ML only (`127.0.0.1:8000`)  
**Dataset:** 385 real-language phrases (`intent-audit-results.json`)  
**Confidence:** Not available from ML API (always `null`)

---

## Overall scorecard

| Metric | Score |
|--------|-------|
| **Overall accuracy** | **44.9%** (173/385) |
| Misclassification rate | 55.1% |
| General-chat sink rate (of errors) | 94.3% |

**Verdict:** Local ML is **not production-ready** for Hindi-first daily operations despite strong workflow-regex coverage for owner entry intents.

---

## Role scorecards

| Role | Phrases | Correct | Accuracy | Grade |
|------|---------|---------|----------|-------|
| Owner | 114 | 75 | **65.8%** | D |
| Manager | 120 | 25 | **20.8%** | F |
| Worker | 95 | 19 | **20.0%** | F |
| Vendor | 56 | 54* | **96.4%** | A* |

*Vendor scored as NOT_SUPPORTED → `general_chat` is correct behavior today.

---

## Domain scorecards

| Domain | Phrases | Accuracy | Key intents |
|--------|---------|----------|-------------|
| **Business Discovery** | 30 | **63.3%** | `/business_discovery`, `/continue_discovery` |
| **Inventory** | 29 | **82.8%** | `/inventory_status`, `/inventory_create` |
| **Procurement** | 16 | **68.8%** | `/purchase_request_create` |
| **Vendor (owner onboard)** | 12 | **91.7%** | `/onboard_vendor` |
| **Reporting** | 12 | **0.0%** | `/report` |
| **Manager operations** | 120 | **20.8%** | assign, transfer, reject, dept |
| **Worker operations** | 90 | **13.3%** | present, absent, issue, tasks |
| **General chat** | 17 | **100%** | `general_chat` |

---

## Intent-level reliability tiers

### Tier A — ≥80% (ship with monitoring)

| Intent | Accuracy |
|--------|----------|
| `/onboard_vendor` | ~92% |
| `/inventory_status` | ~83% |
| `/inventory_create` | ~83% |
| `/onboard_worker` | ~83% |

### Tier B — 60–79%

| Intent | Accuracy |
|--------|----------|
| `/purchase_request_create` | ~69% |
| `/complete` | ~67% |
| `/business_discovery` | ~63% |

### Tier C — &lt;60% (broken for Hindi)

| Intent | Accuracy |
|--------|----------|
| `/assign` | ~29% |
| `/mgrassign` | ~25% |
| `/present` | **0%** |
| `/absent` | **0%** |
| `/depart_assign` | **0%** |
| `/mgrtransfer` | **0%** |
| `/mgrreject` | **0%** |
| `/mgrself` | **0%** |
| `/issue` | **0%** |
| `/tasks` | **0%** |
| `/update` | **0%** |
| `/report` | **0%** |
| `/issues` | **0%** |
| `/help` | **0%** |

---

## Comparison: regex-only vs full pipeline

Prior offline tests (`classify_hybrid(..., use_llm=False)`) showed **100% owner entry intent** via pre-classifier alone.

Full HTTP `/classify` pipeline (LLM enabled) **lowers** scores for non-regex intents because LLM returns `general_chat` for Hindi.

**Implication:** Next sprint should prioritize **deterministic Hindi regex** before prompt tuning.

---

## Success criteria vs audit

| Criterion | Status |
|-----------|--------|
| Complete intent inventory | ✅ |
| Intent-workflow mapping | ✅ |
| Role coverage documented | ✅ |
| Real-language dataset | ✅ (385 phrases) |
| Local ML tested | ✅ |
| Accuracy measured | ✅ **44.9% overall** |
| Gaps identified | ✅ |
| Recommendations | ✅ `intent-improvement-roadmap.md` |

---

## Evidence file

`docs/reports/intent-audit-results.json` — per-phrase: role, category, phrase, expected, predicted, correct.
