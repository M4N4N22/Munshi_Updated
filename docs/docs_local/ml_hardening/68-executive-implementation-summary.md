# Phase 4A — Executive Implementation Summary

**Status:** Planning complete — ready to implement  
**Branch context:** Implement on dedicated ML hardening branch (not `main` checkout per team policy)

---

## Quick wins

| Win | Effort | Impact |
|-----|--------|--------|
| Fix `import inventory` → `/inventory_import_csv` | Low (regex + phrase) | Stops discovery misroute |
| Contract parity (5 intents) | Medium | Aligns ML with 30 commands |
| Regex smoke on PR | Low (after PR-1) | Catches regressions cheaply |
| Deprecate legacy `intent_eval.py` | Low | Reduces confusion |

---

## Recommended first implementation PR

**PR-1 — Benchmark infrastructure**

**Why first:** Zero product behavior change; unblocks PR-3/PR-4; establishes metrics contract before v1.1 lands.

**Deliverables:** `smoke_intent_eval.py`, JSON schema, stub manifest, `run_all` integration.

---

## Contract v1.1 scope (summary)

- Add: `/assign_delivery`, `/task_inventory_nl`, `/inventory_import_csv`, `/suggestion_approve`, `/cancel`
- Version bump to `v1.1` (30 slash intents + `general_chat`)
- Remove `import inventory` from discovery phrases
- Sync: backend + ML JSON, TS exports, `VALID_INTENTS`, LLM prompt, drift tests
- **Not in v1.1:** role, confidence, stock path merge

Detail: [60-contract-v1-analysis.md](./60-contract-v1-analysis.md)

---

## Benchmark readiness

| Aspect | Status |
|--------|--------|
| Existing `workflow_intent_eval` | ✅ Usable |
| Unified smoke harness | ❌ PR-1 |
| Pre-v1.1 baseline artifact | ❌ PR-4 |
| LLM eval procedure | ⚠️ Documented in [61](./61-baseline-benchmark-plan.md) |

**Verdict:** **YELLOW** — can run ad-hoc baseline today; repeatability needs PR-1.

---

## Smoke dataset readiness

| Aspect | Status |
|--------|--------|
| Structure & slices | ✅ [62-smoke-dataset-plan.md](./62-smoke-dataset-plan.md) |
| ~200 utterances | ❌ PR-3 |
| Schema | ❌ PR-1 |

**Verdict:** **GREEN for plan** — **RED for data** until PR-3.

---

## Testing requirements (summary)

- Contract drift: backend Jest + `contract_drift_eval`
- Unit: regex paths for 5 intents + import collision
- Regression: `manager_workflows.json` unchanged or improved
- ML eval: smoke regex in CI; LLM manual for PR-4

Detail: [64-testing-strategy.md](./64-testing-strategy.md)

---

## Success gates (summary)

**4A exit:** Contract v1.1, smoke ~200, baseline documented, gap intents ≥80% regex recall, import collision fixed.

**Before 4B:** Role matrix frozen, mgr smoke slices green, no contract drift.

Detail: [65-success-criteria.md](./65-success-criteria.md)

---

## Highest ROI change

**Contract v1.1 + `import inventory` collision fix (PR-2)**

Single change set closes the largest known product–ML gap, fixes a live misroute, and unlocks meaningful smoke eval. Estimated highest impact per engineering day in the near term.

---

## Biggest risks

1. **Stock dual path** — `task_inventory_nl` vs extract (defer unification to Phase 5)
2. **Phrase behavior change** — users expecting discovery on "import inventory"
3. **VALID_INTENTS drift** — hardcoded list vs JSON (address in PR-2 or fast follow)
4. **LLM eval flake** — do not block merge on LLM alone; regex gates first

Detail: [66-implementation-risk-review.md](./66-implementation-risk-review.md)

---

## Recommended immediate next action

1. **Open PR-1** on ML hardening branch: smoke eval harness + schema + stub manifest.
2. In parallel (optional): capture **regex-only pre-baseline** with current `workflow_intent_eval` + pytest counts for PR-4 comparison.
3. **Then PR-2** Contract v1.1 — highest ROI product change.

---

## Document index (Phase 4A planning)

| Doc | Title |
|-----|-------|
| 60 | Contract v1.1 analysis |
| 61 | Baseline benchmark plan |
| 62 | Smoke dataset plan |
| 63 | PR breakdown |
| 64 | Testing strategy |
| 65 | Success criteria |
| 66 | Implementation risk review |
| 67 | Execution roadmap |
| 68 | This summary |

Prior phases: docs `01`–`59` in same directory.
