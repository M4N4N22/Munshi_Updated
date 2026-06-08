# 23 — Manager Benchmark Results (Phase 5A)

**Date:** 2026-06-08  
**Corpus:** 48 manager cases from `benchmark_corpus.json` + 29 from `manager_workflows.json` = **77 total**  
**Runner:** `docs/docs_local/ml_hardening/_phase5a_benchmark.py`

---

## Before vs After — Manager Workflows

| Workflow | Before | After (det) | After (hybrid) | Target |
|---|---:|---:|---:|---:|
| **task_self_assign** (`/mgrself`) | 8.3% | **100%** | **100%** | ≥85% |
| **task_delegation** (`/mgrassign`) | 33.3% | **100%** | **100%** | ≥85% |
| **task_transfer** (`/mgrtransfer`) | 16.7% | **100%** | **100%** | ≥85% |
| **task_rejection** (`/mgrreject`) | 16.7% | **100%** | **100%** | ≥85% |
| **manager_extra** (expanded corpus) | — | **100%** | **100%** | — |
| **Overall manager** | 18.8% | **100%** | **100%** | ≥85% |

**Result:** All four manager workflows exceed the **85% success criterion**.

---

## Overall Platform Benchmark Context

| Metric | Pre-Phase-5A (full corpus, hybrid) | Post-Phase-5A (manager subset) |
|---|---:|---:|
| Overall intent accuracy | 47.0% | 100% (manager only) |
| Full PASS rate | 41.3% | — |
| Manager failures | ~41 cases → `general_chat` | **0 failures** |

---

## Examples That Now Pass

| Message | Before | After |
|---|---|---|
| `12 main karunga` | `general_chat` | `/mgrself` |
| `priya task 15 do` | `general_chat` | `/mgrassign` |
| `15 send to it` | `general_chat` | `/mgrtransfer` |
| `18 reject` | `general_chat` | `/mgrreject` |
| `mgrtr 15` | `general_chat` | `/mgrtransfer` |
| `owner ne diya 12 mujhe khud karna hai` | `/assign_clarify` | `/mgrself` |
| `priya ko 15 do aur ram ko 16` | `/assign` | `/mgrassign` |
| `owner ne diya tha 15 priya ko transfer karo` | `general_chat` | `/mgrassign` |
| `main kar lunga` | `general_chat` | `/mgrself` |
| `mgrtrasfer 15 it` | `general_chat` | `/mgrtransfer` |

---

## Remaining Manager Failures

**None** on the 77-case manager benchmark (deterministic and hybrid paths).

---

## Raw Results

Full JSON: `docs/docs_local/ml_hardening/phase5a_benchmark_results.json`

```json
{
  "after_mgr_deterministic": { "total": 77, "accuracy": 1.0 },
  "after_mgr_hybrid": { "total": 77, "accuracy": 1.0 },
  "mgr_failures_det": [],
  "mgr_failures_hybrid": []
}
```
