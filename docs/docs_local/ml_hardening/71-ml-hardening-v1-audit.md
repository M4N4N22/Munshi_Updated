# ML Hardening V1 — Independent Implementation Audit

**Audit date:** 2026-06-11  
**Branch audited:** `feature/shantanu-ml-hardening-v1`  
**Sources:** `69-ml-hardening-v1-scope-freeze.md`, `70-ml-hardening-v1-completion-report.md`, live codebase  
**Method:** Read-only code review + independent test/dataset re-runs (no code modified)

---

## Executive summary

| Audit area | Result |
|------------|--------|
| **AUDIT 1 Scope compliance** | **PASS with gaps** |
| **AUDIT 2 File changes** | **PASS with notes** |
| **AUDIT 3 Contract** | **PASS** |
| **AUDIT 4 Benchmark** | **PARTIAL — trust with caveats** |
| **AUDIT 5 Tests** | **PASS** (re-run 79 ML + 43 backend) |
| **AUDIT 6 Regression** | **PASS** (no V1-induced mgr/inventory regression; known assign limits) |
| **AUDIT 7 Dataset** | **PARTIAL** (200 cases, quality issues) |
| **AUDIT 8 Technical debt** | **Medium** overall |
| **AUDIT 9 PR readiness** | **Ready with Notes** (not commit-ready as-is) |

**Overall:** Core V1 objectives (contract v1.1, gap intents, import collision, JSON `VALID_INTENTS`, smoke harness + dataset) are **implemented and verifiable**. Process and delivery gaps prevent calling the branch **fully PR-ready without staging/commit fixes**.

---

## AUDIT 1 — Scope compliance

### Included items (doc 69 Section 1)

| Item | Implemented? | Evidence |
|------|--------------|----------|
| Contract v1.1 | **Yes** | `version: v1.1`, 30 slash + `general_chat` in both JSON files |
| 5 missing intents | **Yes** | All five in contract, `VALID_INTENTS`, regex/slash paths, prompt few-shots |
| `import inventory` collision fix | **Yes** | Removed from `discovery_phrases`; removed from `_BUSINESS_DISCOVERY_RE`; probe → `/inventory_import_csv` |
| Runtime contract loading | **Yes** | `get_intent_contract()`, `load_valid_intents()`, `VALID_INTENTS` from JSON |
| VALID_INTENTS parity | **Yes** | 31 entries; unit tests in `test_contract_v1_1_intents.py` |
| Anti-general_chat (narrow) | **Yes** | Gap intents no longer sink; no full P1 anti-sink (correctly absent) |
| CommandParser parity | **Partial** | 5 new slash intents added; `/assign`, `/mgrassign`, `/mgrself`, `/depart_assign` still not parsed (pre-existing gap) |
| `import vendors` narrowing | **Minimal** | `import inventory` removed; `import vendors` retained in phrases + regex (acceptable per “minimal”) |
| Baseline benchmark | **Yes** | `baseline-pre-v1.1.json` on disk |
| Smoke dataset ~200 | **Yes** | 200 cases in `smoke-v1.1.jsonl` |
| Benchmark reporting | **Partial** | Reports exist locally but **gitignored** (`ml/.gitignore` → `eval/reports/`) |
| Smoke harness | **Yes** | `smoke_intent_eval.py`, schema, `run_all` integration |
| Deprecate `intent_eval.py` | **No** | Still imported in `run_all.py` (optional per spec — not a scope failure) |

### Excluded items — verification

| Excluded | Present in code? |
|----------|------------------|
| Role-aware classification | **No** |
| Confidence tiers | **No** |
| Clarification routing | **No** |
| Stock path unification | **No** (contract-only for `task_inventory_nl`) |
| Intent hierarchy | **No** |
| Session/conversation API | **No** |
| Backend WhatsApp routing changes | **No** (`whatsapp.service.ts` untouched) |

### Checklist gaps (Section 3)

| Item | Status |
|------|--------|
| H3 LLM smoke (`--live`) | **Not done** — no `smoke_intent_eval_live.json` |
| F3 JSON schema validation | **Not automated** — schema file exists; tests check fields only |
| G2 `test_sprint2_intent.py` import test | **Not added** (covered in `test_contract_v1_1` + `test_workflow_intent`) |
| E2 `phase4-contract-drift.spec.ts` | **Not modified** — still passes; intent count not asserted there |
| Benchmark files in PR | **Blocked** by `.gitignore` unless policy exception |

### Scope compliance verdict

**PASS with gaps** — Core scope delivered; excluded work respected; minor checklist and “commit artifacts” items incomplete.

**Scope creep:** None identified. `stock_linked_pre_classify` is within V1 contract-gap / stock-linked measurement scope.

---

## AUDIT 2 — File change audit

### Git tracked modifications (9 files)

| File | Expected? | Necessary? | Notes |
|------|-----------|------------|-------|
| `backend/contracts/intent-types.json` | Yes | Yes | v1.1 |
| `ml/contracts/intent-types.json` | Yes | Yes | Mirror |
| `backend/contracts/typescript/index.ts` | Yes | Yes | |
| `ml/contracts/typescript/index.ts` | Yes | Yes | |
| `ml/bot_engine.py` | Yes | Yes | Primary runtime change |
| `backend/src/contracts/contract-drift.spec.ts` | Yes | Yes | |
| `ml/eval/contract_drift_eval.py` | Yes | Yes | |
| `ml/eval/run_all.py` | Yes | Yes | |
| `ml/tests/test_workflow_intent.py` | Yes | Yes | Import collision expectation |

### Untracked but required by spec (7+ items)

| File | Expected? | Risk |
|------|-----------|------|
| `ml/eval/smoke_intent_eval.py` | Yes | **Would be missing from PR if not staged** |
| `ml/eval/schemas/smoke_case.schema.json` | Yes | Same |
| `ml/data/eval/smoke/smoke-v1.1.jsonl` | Yes | Same |
| `ml/data/eval/smoke/manifest.json` | Yes | Same |
| `ml/tests/test_contract_v1_1_intents.py` | Yes | Same |
| `ml/tests/test_smoke_intent_eval.py` | Same | Same |
| `ml/scripts/generate_smoke_v1_1.py` | Optional | Useful for regeneration |

### Code hygiene (`bot_engine.py`)

| Check | Finding |
|-------|---------|
| Dead code | Large commented v1 block (pre-existing) |
| Debug code | `print("Hybrid Intent Classifier Loaded...")` (pre-existing pattern) |
| TODOs | None new |
| Unused imports | None observed |
| Temporary code | None |

**Suspicious:** None beyond pre-existing commented legacy block.

---

## AUDIT 3 — Contract audit

| Check | Result |
|-------|--------|
| 30 slash intents | **30** (`intent-types.json`) |
| `general_chat` | **Present** |
| Backend ↔ ML JSON | **Byte-identical** (fc verified) |
| Backend ↔ ML TS | **Byte-identical** |
| `INTENT_TYPES` ↔ JSON | **Asserted in Jest** (`contract-drift.spec.ts`) |
| Runtime `VALID_INTENTS` | **Loaded from JSON** at import |
| Hardcoded set removed | **Yes** (only commented legacy) |
| COMMANDS ⊆ contract | **Asserted in Jest** |

**Contract audit: PASS** — No drift detected at audit time.

---

## AUDIT 4 — Benchmark audit

### Artifacts

| Artifact | Exists locally | In git | Reproducible |
|----------|----------------|--------|--------------|
| `baseline-pre-v1.1.json` | Yes | No (gitignore) | Yes via pytest + eval scripts |
| `baseline-post-v1.1.json` | Yes | No | Yes |
| `baseline-v1.1-summary.md` | Yes | No | Manual |
| `smoke_intent_eval_deterministic.json` | Yes | No | Yes |
| `smoke-v1.1.jsonl` | Yes | **Untracked** | Yes |

### Independent re-run (this audit)

| Metric | Completion report | Re-run |
|--------|-------------------|--------|
| ML pytest | 79 passed | **79 passed** |
| Workflow eval accuracy | 0.9604 | **0.9604** |
| Smoke macro accuracy | 0.81 | **0.81** |
| Contract gap metric (harness) | 0.9455 | **0.9455** |

### Trustworthiness concerns

1. **`contract_gap_accuracy` definition** — Combines slices `contract_gap` (90%) and `import_boundary` (100%), producing 94.55%. Slice S1 alone is **27/30 = 90%**, still above 80% gate but metric label is **misleading**.

2. **Duplicate messages** — **15 duplicate utterances** across slices (e.g. `import inventory`, `ram ko 50 bolt bhejo`). Violates doc 62 authoring rule; does not inflate accuracy (same label) but reduces effective independent coverage.

3. **Threshold tests** — `test_smoke_eval_deterministic_meets_threshold` encodes ≥75% / ≥80% gates; benchmarks are **partially self-referential** (dataset + classifier co-evolved).

4. **LLM path** — Not benchmarked; completion report claim of “documented LLM run” **not substantiated** by artifacts.

5. **Pre-baseline integrity** — Pre JSON is minimal (463 bytes); captured in same session as implementation — acceptable for regression delta, not a rigorous frozen baseline branch artifact.

**Benchmark audit: PARTIAL** — Deterministic numbers are reproducible; composite metrics and dataset quality caveats apply.

---

## AUDIT 5 — Test audit

### Executed (independent)

| Suite | Result |
|-------|--------|
| `pytest ml/tests/` | **79 passed**, 0 failed, 0 skipped |
| `jest contract-drift` | **43 passed** |

### Review findings

| Concern | Finding |
|---------|---------|
| Skipped/disabled tests | **None** |
| Weakened assertions | `test_workflow_intent` correctly **tightened** (import → csv) |
| Smoke threshold tests | Encode success gates — acceptable but couples test to dataset |
| Schema validation | **Not enforced** via jsonschema in tests |
| `test_sprint2_intent.py` | Unchanged; import collision not duplicated there |

**Test audit: PASS** — Suites run clean; no evidence of disabled regression protection.

---

## AUDIT 6 — Regression audit

### Focus intents (deterministic probe)

| Utterance | Expected (product) | Actual | V1 regression? |
|-----------|-------------------|--------|----------------|
| `warehouse khali karo` | `/depart_assign` | `/depart_assign` | No |
| `priya ko task 15 do` | `/mgrassign` | `/mgrassign` | No |
| `task 12 main karunga` | `/mgrself` | `/mgrself` | No |
| `check inventory status` | `/inventory_status` | `/inventory_status` | No |
| `create inventory item` | `/inventory_create` | `/inventory_create` | No |
| `tell you about my business` | `/business_discovery` | `/business_discovery` | No |
| `import vendors` | `/business_discovery` | `/business_discovery` | No |
| `ajay ko report bhejo` | `/assign` (smoke label) | `/report` | **Pre-existing** (`_REPORT_RE` matches `report bhejo`) |

### Workflow eval

- Accuracy **unchanged** at 96.04% (17 failures) — same as pre-baseline.
- Failures are inventory_create/status and general_chat — **not introduced by V1**.

### Intentional behavior changes

- `import inventory` → `/inventory_import_csv` (spec-approved).
- Stock-linked phrases with SKU+dispatch may route to `/assign_delivery` instead of `/mgrassign` (spec-approved boundary work).

**Regression audit: PASS** — No hidden V1 regression on mgr/inventory/discovery; assign/report ambiguity is pre-existing.

---

## AUDIT 7 — Dataset audit (`smoke-v1.1.jsonl`)

| Metric | Value |
|--------|-------|
| Total cases | 200 |
| Duplicate messages | **15** |
| Duplicate IDs | 0 |

### Slice distribution

| Slice | Count | Accuracy (re-run) |
|-------|------:|------------------:|
| mgr_boundary | 35 | 97.1% |
| contract_gap | 30 | 90.0% |
| import_boundary | 25 | 100% |
| assign_depart | 25 | 56.0% |
| stock_linked | 25 | 52.0% |
| assign_clarify | 15 | 53.3% |
| inventory_boundary | 15 | 100% |
| complete_update | 15 | 80.0% |
| regression | 15 | 93.3% |

### Gap intent coverage (positive labels)

| Intent | Cases |
|--------|------:|
| `/inventory_import_csv` | 19 |
| `/assign_delivery` | 15 |
| `/task_inventory_nl` | 15 |
| `/cancel` | 4 |
| `/suggestion_approve` | 2 |

### Weak areas

- **assign vs depart / stock / clarify slices** — Low accuracy by design (V2 targets); labels sometimes conflict with existing regex priority (e.g. `report bhejo` → `/report`).
- **Boundary pair tags** — 7 pairs tagged (A1–A3, B1–B2, C1, D1); doc 62 cited 12 pairs — remainder covered implicitly in `import_boundary` without `boundary_pair` field.
- **Language mix** — Not audited to ±5% (generator skews hinglish).
- **Slash cases** — Within ≤10% budget.

---

## AUDIT 8 — Technical debt

| Item | Severity | Notes |
|------|----------|-------|
| Untracked V1 deliverables | **High** | PR would ship incomplete without `git add` |
| Benchmark reports gitignored | **Medium** | Conflicts with doc 69 “commit baseline” |
| `contract_gap_accuracy` metric naming | **Medium** | Inflated by including `import_boundary` |
| Smoke duplicate utterances | **Medium** | Reduces eval independence |
| CommandParser partial parity | **Medium** | `/assign`, `/mgr*` slash still unparsed |
| LLM path unbenchmarked | **Medium** | Spec H3 skipped |
| Generator script in repo | **Low** | Good for regen; needs discipline |
| Large commented legacy in `bot_engine.py` | **Low** | Pre-existing |
| Self-referential smoke thresholds in tests | **Low** | Acceptable for V1 gate |

---

## AUDIT 9 — PR readiness

### Verdict: **Ready with Notes**

| Criterion | Status |
|-----------|--------|
| Core implementation complete | Yes |
| Tests pass independently | Yes |
| Contract parity | Yes |
| Scope respected | Yes |
| All files staged for commit | **No** |
| Benchmark artifacts versioned | **No** (gitignore) |
| LLM smoke documented | **No** |
| Completion report accuracy | **Mostly accurate**; “merge-ready” overstated without staging |

### Not Ready until

1. Stage untracked V1 files (smoke harness, dataset, tests, schema, optional generator).
2. Decide policy for `ml/eval/reports/` (un-ignore baseline summaries or copy to `docs/`).
3. Optionally run/document LLM smoke per H3.
4. Create git commit(s) on branch.

---

## Hidden issues found

1. **~50% of V1 deliverables are untracked** in git (critical for PR).
2. **15 duplicate smoke utterances** across slices.
3. **`contract_gap_accuracy` metric blends two slices** — reported 94.55% vs S1-only 90%.
4. **`ajay ko report bhejo`** misclassified vs smoke label due to pre-existing `_REPORT_RE` (not V1); affects slice scores.
5. **LLM smoke not executed** despite checklist H3.
6. **CommandParser** still lacks several `COMMANDS` slash forms (pre-existing; partial vs G9).

No **critical production defect** requiring immediate code fix was found. Import collision fix and contract loading behave as specified.

---

## Recommended action

1. **Stage and commit** all V1 files (tracked + untracked list in Audit 2).
2. **Add baseline summary** to version control under `docs/docs_local/ml_hardening/` or adjust `.gitignore` for `baseline-*.md` / `baseline-*.json`.
3. **Fix smoke dataset** — deduplicate 15 messages or document intentional overlap.
4. **Rename or split** `contract_gap_accuracy` in harness to report S1 separately.
5. **Run LLM smoke once** before merge if LLM behavior is in scope for reviewers.
6. **Proceed to PR** after commit — core work is sound; gaps are packaging and measurement hygiene.

---

## Audit sign-off

| Question | Answer |
|----------|--------|
| Everything promised implemented? | **Mostly yes** (checklist H3, optional deprecations, full CommandParser parity excepted) |
| Anything unapproved implemented? | **No** |
| Benchmarks trustworthy? | **Deterministic yes, with caveats** |
| Hidden regressions? | **None on focus intents; workflow eval flat** |
| Genuinely PR-ready? | **Ready with Notes** — commit/stage first |
