# Phase 3 Summary — Evaluation Dataset Design & Coverage Planning

**Date:** 2026-06-10  
**Status:** Complete (design only — no utterances, no ML/code changes)

---

## 1. Recommended evaluation dataset size

| Tier | Unique cases (estimated) |
|------|-------------------------:|
| **Minimum (Phase 4 gate)** | **~1,200** |
| **Recommended** | **~1,800** |
| **Benchmark regression** | **~2,800** |

**P1 alone:** 330 min → 570 recommended → 910 benchmark (intent core)  
**Cross-cutting slices:** boundary ~396, role ~310, ambiguity ~167, session ~110, contract gap ~201

---

## 2. Highest-priority datasets

| Priority | Dataset | Cases | Doc |
|----------|---------|------:|-----|
| 1 | Boundary — delegation + stock-linked | ~156 | 31 |
| 2 | Contract gap (5 commands) | ~201 | 35 |
| 3 | Manager coordination boundaries | ~104 | 31 |
| 4 | Role-invalid emissions | ~60 | 32 |
| 5 | Ambiguity — stock add/import | ~18 | 33 |
| 6 | Session CONFIRM/CANCEL | ~30 | 34 |

---

## 3. Most important boundary pairs

| Rank | Pair | Cases target |
|------|------|-------------:|
| 1 | assign vs task_inventory_nl vs assign_delivery | 46 |
| 2 | inventory_status vs inventory_create vs import_csv | 62 (combined) |
| 3 | mgrself vs mgrassign | 36 |
| 4 | assign vs depart_assign | 34 |
| 5 | complete vs update | 34 |
| 6 | mgrtransfer vs mgrreject | 34 |
| 7 | mgrassign vs assign | 34 |

---

## 4. Most important ambiguity cases

| Rank | Hotspot | Expected behavior |
|------|---------|-------------------|
| 1 | HS-06 "Stock add karo" | Clarify create vs import |
| 2 | HS-09 Delivery NL | task_inventory_nl not assign |
| 3 | HS-07 "Import inventory" | import_csv not discovery |
| 4 | HS-03 "Main kar lunga task N" | mgrself |
| 5 | HS-13 "Kaam karwa do" | assign_clarify |
| 6 | HS-10 "Task N half done" | update not complete |

---

## 5. Most important role-invalid cases

| Rank | Case | Role | Forbidden |
|------|------|------|-----------|
| 1 | INV-01 Worker assign | Worker | assign, depart, clarify |
| 2 | INV-04 Owner mgrself | Owner | mgr* |
| 3 | INV-06 Manager update | Manager | update |
| 4 | INV-02 Worker inventory | Worker | inventory_* |
| 5 | INV-07 Worker report | Worker | report, members, issues, resolve |

---

## 6. Coverage recommendation before benchmarking

| Step | Action | Status |
|------|--------|--------|
| 1 | Author P1 boundary dataset (396 cases) | Pending |
| 2 | Author contract gap dataset (201 provisional) | Pending |
| 3 | Author role-invalid slice (60 cases) | Pending |
| 4 | Author session slice (110 cases) | Pending |
| 5 | Align ML contract (5 intents) | **Blocker for gap benchmark** |
| 6 | Define JSONL schemas (docs 31–35) | ✅ Designed |
| 7 | Reach minimum ~1,200 deduplicated cases | Pending |
| 8 | Language mix validation | Pending |

**Do not run Phase 4 benchmark until:** P1 min cases + contract alignment + session/role slices complete.

---

## 7. Readiness for Phase 4 benchmarking

| Area | Readiness | Notes |
|------|-----------|-------|
| Intent coverage matrix | ✅ Complete | 30-intent-coverage-matrix.md |
| Boundary design | ✅ Complete | 12 pairs, ~396 cases specified |
| Role design | ✅ Complete | ~310 cases specified |
| Ambiguity design | ✅ Complete | 15 hotspots, ~167 cases |
| Session design | ✅ Complete | ~110 cases |
| Contract gap design | ✅ Complete | Provisional until v1.1 contract |
| Size planning | ✅ Complete | 1.2k / 1.8k / 2.8k tiers |
| Benchmark framework | ✅ Complete | 6 metrics + gates |
| **Actual utterances** | ❌ Not started | Phase 3.1 authoring |
| **Contract alignment** | ❌ Not done | 5 missing intents |
| **Automated runner** | ❌ Out of scope | Phase 4 |

**Overall Phase 3 design readiness: GREEN**  
**Phase 4 execution readiness: YELLOW** (blocked on case authoring + contract)

---

## Recommended Phase 4 scope

**Phase 4 — ML Benchmarking Execution**

1. Implement eval JSONL files per schemas in 31–35
2. Contract alignment PR (5 intents) — prerequisite for gap suite
3. Build/run `classify` eval harness against ML_URL
4. Produce first baseline report per 37-benchmarking-framework.md
5. No model training — measure only

---

## Deliverables index

| File | Content |
|------|---------|
| `30-intent-coverage-matrix.md` | 30 commands × coverage priority |
| `31-boundary-dataset-design.md` | 12 pairs, 4 example types |
| `32-role-aware-dataset-design.md` | Owner/manager/worker/invalid |
| `33-ambiguity-dataset-design.md` | 15 hotspots + clarify rubric |
| `34-session-aware-dataset-design.md` | Workflow/session eval |
| `35-contract-gap-dataset-design.md` | 5 missing intents |
| `36-dataset-size-planning.md` | Min/rec/benchmark sizes |
| `37-benchmarking-framework.md` | 6 metrics + gates |
| `38-phase3-summary.md` | This document |

---

**No utterances generated. No ML or code modified. No git operations.**
