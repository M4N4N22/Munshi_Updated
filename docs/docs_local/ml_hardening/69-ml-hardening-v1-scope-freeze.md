# ML Hardening V1 — Scope Freeze & Build Specification

**Status:** FINAL — planning complete  
**Branch:** `feature/shantanu-ml-hardening-v1`  
**Delivery:** One branch, one PR  
**Contract target:** `v1.1`  
**Source docs:** Phase 0 (`01`–`09`), Phase 1 (`10`–`19`), Phase 2 (`20`–`28`), Phase 3 (`30`–`38`), Phase 3.5 (`39`–`49`), Phase 4 Blueprint (`50`–`59`), Phase 4A Execution (`60`–`68`)

---

## SECTION 1 — Final V1 Scope

Each item is **INCLUDED** or **EXCLUDED** with rationale.

| Item | Decision | Rationale |
|------|----------|-----------|
| **Contract v1.1** | **INCLUDED** | Foundation for all hardening; version bump to `v1.1`; closes product–ML contract gap documented in Phases 2–3.5. |
| **5 missing intents** | **INCLUDED** | `/assign_delivery`, `/task_inventory_nl`, `/inventory_import_csv`, `/suggestion_approve`, `/cancel` — required for 30-command parity (Phase 0, doc 35). |
| **`import inventory` collision fix** | **INCLUDED** | Highest-ROI quick win (docs 51 G3, 59); removes `business_discovery` misroute; behavior change is intentional and correct. |
| **Runtime contract loading** | **INCLUDED** | Load `VALID_INTENTS` from `ml/contracts/intent-types.json` at `bot_engine` init (docs 51 G7, 56 M4A-3); eliminates silent drift between JSON and Python. |
| **VALID_INTENTS parity** | **INCLUDED** | Consequence of runtime loading + contract v1.1; all 30 slash intents + `general_chat` must pass LLM gate. |
| **Anti-`general_chat` protections** | **PARTIAL — INCLUDED (narrow)** | **In V1:** gap-intent parity (no forced sink for the 5 intents), regex pre-classifiers for import/cancel/slash forms, targeted LLM few-shots. **Not in V1:** full P1 anti-sink policy (operational keywords → clarify instead of `general_chat`) — deferred to V2 (docs 52 Workstream D, 56 M4B-4). |
| **CommandParser parity** | **INCLUDED** | Slash forms for missing commands (doc 51 G9); keeps direct ML `/classify` aligned with backend `COMMANDS`. |
| **`import vendors` phrase narrowing** | **INCLUDED (minimal)** | Remove or narrow ambiguous overlap with onboard vs discovery (doc 60); do not redesign full discovery flow. |
| **Baseline benchmark** | **INCLUDED** | Capture regex baseline on current branch tip **before** contract edits; document commands and metrics (doc 61). |
| **Smoke evaluation dataset (~200)** | **INCLUDED** | Author per doc 62 structure; 10 slices; all 5 gap intents and 12 boundary pairs represented. |
| **Benchmark reporting** | **INCLUDED** | Commit `ml/eval/reports/baseline-pre-v1.1.json`, `baseline-post-v1.1.json`, and `baseline-v1.1-summary.md` in same PR. |
| **Smoke eval harness** | **INCLUDED** | `smoke_intent_eval.py`, JSON schema, `run_all` integration (former PR-1 scope). |
| **Backend `/classify` API changes** | **EXCLUDED** | No role, session, or confidence fields (V2/V3). |
| **Stock path unification** | **EXCLUDED** | Dual path (`taskInventoryNl` + `/extract/task-inventory`) remains; `task_inventory_nl` added to contract only (doc 66). |
| **LLM smoke as CI merge gate** | **EXCLUDED** | Regex smoke gates merge; LLM smoke run documented in PR, not blocking CI (doc 61, 65). |
| **Full 1,200+ benchmark suite** | **EXCLUDED** | Phase 3 design only; V3+ (doc 37). |
| **CI nightly LLM eval** | **EXCLUDED** | Phase 6 ops (doc 56). |
| **Deprecate `intent_eval.py`** | **INCLUDED (optional)** | Mark legacy or exclude from `run_all` if zero maintenance cost; not a merge blocker. |

### V1 intent inventory (target)

**30 slash intents** + `general_chat` = **31** contract entries.

New in v1.1: `/assign_delivery`, `/task_inventory_nl`, `/inventory_import_csv`, `/suggestion_approve`, `/cancel`.

---

## SECTION 2 — Explicitly Deferred Work

| Workstream | Version | Phase label | Rationale |
|------------|---------|-------------|-----------|
| **Role-aware classification** | **V2** | 4B | Requires API v2 (`role` param), backend caller change, role validity matrix (docs 45, 52-B, 65 G4B). |
| **Session-aware classify API** | **V2** | 4B | `session_context` in classify request; depends on role API design (doc 54). |
| **P1 anti-sink rules** (operational → clarify, not `general_chat`) | **V2** | 4B | Policy engine without confidence tier is incomplete UX (docs 26, 52-D). |
| **Prompt/regex P1 boundary wave** (assign vs depart, mgr*, complete vs update) | **V2** | 4B | Smoke dataset in V1 **measures** these; hardening rules ship in V2 after baseline. |
| **Eval expansion (~600 cases)** | **V2** | 4B | After role + anti-sink land (doc 56 M4B-6). |
| **Stock-linked unification** | **V3** | 5 | High blast radius; requires 4B exit + extract audit (docs 52-C, 65 G5-S). |
| **Confidence tiers** | **V3** | 5 | Schema v2, calibrated eval ≥500 cases (docs 43, 65 G5-C). |
| **Clarification routing** | **V3** | 5 | Backend clarify handlers + `confidence_tier` (docs 26, 52-D). |
| **Intent hierarchy** | **V3** | 5 | Cluster router; depends on stable contract + stock path (docs 52-E, 65 G5-H). |
| **Conversation-aware classification** | **Future** | 6+ | Multi-turn context; no current API or product spec (doc 41). |
| **Factory/session grounding in ML** | **Future** | 6 | Optional ops milestone (doc 56 Phase 6). |
| **Full benchmark CI gates** | **Future** | 6 | 1,200+ suite + nightly LLM (doc 37, 56). |

---

## SECTION 3 — Implementation Checklist

Execute **in this order** on `feature/shantanu-ml-hardening-v1`. Single PR at end.

### Phase A — Baseline (before any contract/ML logic edits)

- [ ] **A1.** Confirm branch `feature/shantanu-ml-hardening-v1` from current integration point.
- [ ] **A2.** Run regex baseline: `pytest ml/tests/test_manager_intent_hardening.py ml/tests/test_workflow_intent.py ml/tests/test_sprint2_intent.py ml/tests/test_operational_intent.py -q`.
- [ ] **A3.** Run `python -m eval.workflow_intent_eval` (regex/`use_llm=False` mode).
- [ ] **A4.** Run `python -m eval.contract_drift_eval`.
- [ ] **A5.** Record contract-gap probe (5 phrases → current intent) in notes for pre-baseline.
- [ ] **A6.** Write `ml/eval/reports/baseline-pre-v1.1.json` (metrics snapshot).

### Phase B — Eval harness (enables smoke + post metrics)

- [ ] **B1.** Add `ml/eval/schemas/smoke_case.schema.json` per doc 62.
- [ ] **B2.** Add `ml/eval/smoke_intent_eval.py` (reuse `workflow_intent_eval` metrics pattern).
- [ ] **B3.** Add stub `ml/data/eval/smoke/manifest.json` (version `v1.1`).
- [ ] **B4.** Extend `ml/eval/run_all.py` to invoke smoke eval.
- [ ] **B5.** Verify `python -m eval.smoke_intent_eval --no-llm` exits 0 with empty dataset.

### Phase C — Contract v1.1

- [ ] **C1.** Update `backend/contracts/intent-types.json`: version `v1.1`, add 5 intents, fix `discovery_phrases` (remove `import inventory`; narrow `import vendors` if needed).
- [ ] **C2.** Mirror identical JSON to `ml/contracts/intent-types.json`.
- [ ] **C3.** Update `backend/contracts/typescript/index.ts` — `INTENT_TYPES`.
- [ ] **C4.** Mirror `ml/contracts/typescript/index.ts`.
- [ ] **C5.** Verify `ml/contracts/python/document_types.py` still loads (no manual edit unless broken).

### Phase D — ML runtime (`bot_engine.py`)

- [ ] **D1.** Load `VALID_INTENTS` from `ml/contracts/intent-types.json` at module init; remove hardcoded set.
- [ ] **D2.** Extend `CommandParser` for slash forms: `/assign_delivery`, `/inventory_import_csv`, `/cancel`, `/suggestion_approve`, `/task_inventory_nl`, and any other `COMMANDS` gaps.
- [ ] **D3.** Add `inventory_import_csv` regex pre-classifier; exclude import-stock phrases from `_BUSINESS_DISCOVERY_RE`.
- [ ] **D4.** Add workflow pre-classify rules for `/cancel`, `/suggestion_approve` where slash/workflow patterns exist.
- [ ] **D5.** Update LLM system prompt: 5 new intents with 1–2 few-shot examples each; reinforce `import inventory` → `/inventory_import_csv`.
- [ ] **D6.** Confirm `classify_hybrid` pipeline order unchanged except new pre-classify hooks.

### Phase E — Backend contract tests

- [ ] **E1.** Extend `backend/src/contracts/contract-drift.spec.ts` — assert all 30 slash intents in JSON.
- [ ] **E2.** Align `backend/src/contracts/phase4-contract-drift.spec.ts` if assertions reference intent count.
- [ ] **E3.** Run backend contract drift: `npm test -- contract-drift` (or project equivalent).

### Phase F — Smoke dataset (~200 cases)

- [ ] **F1.** Create `ml/data/eval/smoke/smoke-v1.1.jsonl` per slice allocation (doc 62).
- [ ] **F2.** Update `manifest.json` with slice counts and `contract_version: v1.1`.
- [ ] **F3.** Validate all cases against smoke schema.
- [ ] **F4.** Optional: split slice files under `ml/data/eval/smoke/slices/`.

### Phase G — Tests

- [ ] **G1.** Add/extend `ml/tests/test_contract_v1_1_intents.py` (or extend `test_sprint2_intent.py` + `test_workflow_intent.py`).
- [ ] **G2.** Tests for `import inventory` → `/inventory_import_csv` (not `business_discovery`).
- [ ] **G3.** Tests for each new intent regex/slash path.
- [ ] **G4.** Test `VALID_INTENTS` loaded from JSON includes all 31 entries.
- [ ] **G5.** Add `ml/tests/test_smoke_intent_eval.py` — schema + regex smoke run.
- [ ] **G6.** Extend `ml/eval/contract_drift_eval.py` for v1.1 intent set.
- [ ] **G7.** Full pytest ML suite green.

### Phase H — Benchmark & report

- [ ] **H1.** Run `python -m eval.smoke_intent_eval --no-llm` on full smoke dataset.
- [ ] **H2.** Run `python -m eval.workflow_intent_eval` post-change (regex).
- [ ] **H3.** Run LLM smoke once locally (`--live`); record model ID and timestamp.
- [ ] **H4.** Write `ml/eval/reports/baseline-post-v1.1.json`.
- [ ] **H5.** Write `ml/eval/reports/baseline-v1.1-summary.md` (pre vs post, top confusions, gate checklist).
- [ ] **H6.** Run `python -m eval.run_all`.

### Phase I — PR readiness

- [ ] **I1.** Verify Definition of Done (Section 6).
- [ ] **I2.** Single PR: title e.g. `feat(ml): ML Hardening V1 — contract v1.1, smoke eval, baseline`.
- [ ] **I3.** PR body: link doc 69; list behavior change (`import inventory`); attach benchmark summary.

---

## SECTION 4 — Files Expected to Change

### Contracts

| File | Change |
|------|--------|
| `backend/contracts/intent-types.json` | v1.1, +5 intents, phrase fix |
| `ml/contracts/intent-types.json` | Mirror |
| `backend/contracts/typescript/index.ts` | `INTENT_TYPES` |
| `ml/contracts/typescript/index.ts` | Mirror |

### ML

| File | Change |
|------|--------|
| `ml/bot_engine.py` | VALID_INTENTS load, CommandParser, regex, prompt |
| `ml/main.py` | Only if init/import order requires |

### Backend

| File | Change |
|------|--------|
| `backend/src/contracts/contract-drift.spec.ts` | 30-intent assertions |
| `backend/src/contracts/phase4-contract-drift.spec.ts` | Align if needed |

**No changes:** `whatsapp.service.ts`, workflow handlers, `/classify` caller (V1 is ML-side + contract sync).

### Evaluation

| File | Change |
|------|--------|
| `ml/eval/smoke_intent_eval.py` | **New** |
| `ml/eval/schemas/smoke_case.schema.json` | **New** |
| `ml/eval/run_all.py` | Extend |
| `ml/eval/contract_drift_eval.py` | Extend |
| `ml/data/eval/smoke/manifest.json` | **New** |
| `ml/data/eval/smoke/smoke-v1.1.jsonl` | **New** (~200 lines) |
| `ml/eval/reports/baseline-pre-v1.1.json` | **New** |
| `ml/eval/reports/baseline-post-v1.1.json` | **New** |
| `ml/eval/reports/baseline-v1.1-summary.md` | **New** |

### Tests

| File | Change |
|------|--------|
| `ml/tests/test_sprint2_intent.py` | Import collision |
| `ml/tests/test_workflow_intent.py` | New workflow intents |
| `ml/tests/test_contract_v1_1_intents.py` | **New** (or merged into above) |
| `ml/tests/test_smoke_intent_eval.py` | **New** |
| `ml/tests/test_contract.py` | Extend if JSON load tested |

---

## SECTION 5 — Testing Requirements

### Required tests (merge blockers)

| Layer | Requirement |
|-------|-------------|
| **Contract drift** | `contract-drift.spec.ts` green; `contract_drift_eval.py` green |
| **VALID_INTENTS** | Loaded from JSON; 31 entries; unit test |
| **Import collision** | `import inventory` → `/inventory_import_csv` at regex layer |
| **5 new intents** | Slash + minimum regex coverage each |
| **Regression** | `manager_workflows.json` eval accuracy ≥ pre-baseline (no >5% absolute drop) |
| **Smoke regex** | Full ~200 case run; macro accuracy ≥ **75%** |
| **Contract gap slice S1** | Recall ≥ **80%** regex |
| **pytest** | All `ml/tests/test_*intent*` modules green |

### Regression requirements

- Existing `ml/data/eval/intents/*.json` datasets must not require label changes (unless intent rename — none in V1).
- `test_manager_intent_hardening.py` — zero regressions.
- Backend WhatsApp routing unchanged (no E2E required for V1 merge).

### Benchmark requirements

| Artifact | Required |
|----------|----------|
| `baseline-pre-v1.1.json` | Yes — captured before Phase C |
| `baseline-post-v1.1.json` | Yes — after Phase H |
| `baseline-v1.1-summary.md` | Yes — human-readable delta |
| LLM smoke run | Yes — documented; not CI gate |
| Contract gap probe 5/5 | Yes — regex post-v1.1 |

### Success criteria (maps to doc 65 G4A)

| ID | Criterion |
|----|-----------|
| SC-1 | Contract `v1.1`; 30 slash + `general_chat` |
| SC-2 | Zero backend/ML JSON drift |
| SC-3 | `import inventory` collision resolved |
| SC-4 | Smoke ~200 cases, schema-valid |
| SC-5 | Gap slice S1 ≥80% regex recall |
| SC-6 | Smoke macro ≥75% regex |
| SC-7 | Manager workflows no regression |
| SC-8 | Baseline pre/post committed |

---

## SECTION 6 — Definition of Done

V1 is **done** when all are true:

1. **30 slash intents** represented in contract, TS exports, and runtime `VALID_INTENTS`.
2. **`general_chat`** remains valid fallback for true OOD/greetings.
3. **No contract drift** between `backend/contracts` and `ml/contracts`.
4. **`import inventory` collision resolved** — regex routes to `/inventory_import_csv`, not `/business_discovery`.
5. **Smoke benchmark completed** — ~200 cases, manifest matches doc 62 allocation ±5%.
6. **No regression** in existing manager workflow eval vs pre-baseline.
7. **Baseline documented** — pre and post JSON + summary markdown in `ml/eval/reports/`.
8. **All merge-blocker tests green** (Section 5).
9. **Single PR** on `feature/shantanu-ml-hardening-v1` ready for review.
10. **Explicit non-goals verified** — no role/confidence API, no stock path merge, no backend routing changes.

---

## SECTION 7 — Risk Review

| Implementation item | Risk | Regression potential | Mitigation |
|---------------------|------|----------------------|------------|
| Contract v1.1 (+5 intents) | Low–Med | LLM prompt regression on existing intents | Focused few-shots; manager workflow regression test |
| `import inventory` phrase fix | Med | Users expecting discovery flow | Correct product behavior; document in PR; smoke S2 |
| VALID_INTENTS from JSON | Low | Startup failure if JSON missing | Fail fast at import; contract drift CI |
| CommandParser parity | Low | Direct ML API slash handling | Unit tests per slash |
| `task_inventory_nl` in contract | Med | Overlap with extract path confusion | No routing change in V1; document dual path |
| Smoke dataset labels | Med | Wrong boundary labels | Reference doc 31 pairs; reviewer spot-check S1/S2 |
| LLM eval flake | Med | False merge anxiety | Regex gates only for CI; LLM in summary |
| ~200 case authoring effort | Med | Schedule slip | Slice-by-slice; reuse patterns from existing eval JSON |
| Single large PR | Med | Review fatigue | Logical commits within branch; section checklist in PR |
| `import vendors` narrowing | Low | Edge onboard/discovery | Minimal change; smoke if touched |

---

## SECTION 8 — Final Recommendation

| Dimension | Assessment |
|-----------|------------|
| **Go / No-Go** | **GO** — Planning complete; scope bounded; dependencies satisfied (Phases 0–4A). |
| **Complexity estimate** | **Medium** — ~1.5–2 weeks engineering (contract + bot_engine + ~200 smoke cases + benchmarks). |
| **Highest ROI change** | **`import inventory` collision fix + contract v1.1** — fixes live misroute and closes 5-intent gap in one change set. |
| **Highest risk change** | **LLM prompt expansion for 5 intents** — can perturb existing classifications; mitigate with regression eval and conservative few-shots. |
| **Expected impact** | Contract parity 25→30; import boundary fixed; measurable smoke baseline for V2 role work; readiness score foundation (no fabricated % until benchmark runs). |

### Recommended implementation prompt (next message)

Use this to start implementation:

```
Implement ML Hardening V1 per docs/docs_local/ml_hardening/69-ml-hardening-v1-scope-freeze.md.

Branch: feature/shantanu-ml-hardening-v1
Single PR when complete.

Follow Section 3 checklist in order (A→I):
1. Capture pre-baseline before any contract/ML edits
2. Build smoke eval harness
3. Contract v1.1 (5 intents, import inventory fix, sync JSON/TS)
4. bot_engine: VALID_INTENTS from JSON, CommandParser parity, regex + prompt
5. Backend contract-drift tests
6. Author ~200 smoke cases per doc 62
7. Unit + smoke tests
8. Post-baseline + summary report

Do NOT implement: role-aware classify, confidence tiers, clarification routing, stock unification, intent hierarchy, session/conversation API.

Merge gates: Section 5 + Definition of Done Section 6.
```

---

## Appendix — Planning lineage

| Doc range | Content |
|-----------|---------|
| 01–09 | Command discovery (30 commands) |
| 10–19 | Business capabilities (17) |
| 20–28 | Boundaries, role matrix, 5 missing intents |
| 30–38 | Eval dataset design (~2800 benchmark spec) |
| 39–49 | ML architecture audit (readiness 2.45/5) |
| 50–59 | Blueprint target architecture |
| 60–68 | Phase 4A execution plan (consolidated into this V1 spec) |
| **69** | **This document — implementation source of truth** |

**Planning status: COMPLETE.** Next step is implementation on `feature/shantanu-ml-hardening-v1`.
