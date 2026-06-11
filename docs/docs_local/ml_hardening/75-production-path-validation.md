# ML Hardening V2D — Production Path Validation

**Date:** 2026-06-11  
**Branch:** `feature/shantanu-ml-hardening-v1`  
**Mode:** Validation only — no routing changes  
**Production path:** `POST /classify` → `IntentClassifier.classify(message)` with `use_llm=True` (default)

---

## Executive summary

Live LLM evaluation confirms that **V2B/V2C benchmark gains are genuine for production**: hardened intents are resolved by deterministic pre-classifiers before the LLM is invoked.

| Benchmark | Deterministic | Live LLM | Delta |
|-----------|---------------|----------|-------|
| Smoke (200) | **100%** | **100%** | **0** |
| Workflow (429) | **96.04%** | **96.04%** | **0** |
| Det vs LLM disagreements (smoke) | — | — | **0 / 200** |
| Det vs LLM disagreements (workflow) | — | — | **0 / 429** |

**Key finding:** On the smoke dataset, **0/200 messages reach the LLM** — all are caught by regex pre-classifiers. Live and deterministic paths produce identical outputs.

**Readiness:** Safe to ship assign-family and task-lifecycle hardening. Workflow gaps in inventory/onboard clusters remain in **both** paths and are not LLM-regressions — they are pre-existing regex + LLM fallback weaknesses.

**V3 (role-aware) not required** before release for the hardened intent clusters.

---

## Phase 1 — LLM benchmark audit

### Harness behavior

| Harness | Default mode | Live flag | Uses `classify_hybrid` |
|---------|--------------|-----------|------------------------|
| `smoke_intent_eval.py` | `use_llm=False` | `--live` | Yes |
| `workflow_intent_eval.py` | `use_llm=False` | `--live` | Yes |
| `run_all.py` | `use_llm=False` | `--live` | Passes flag to smoke + workflow |
| `intent_eval.py` | Parser only | **No LLM option** | `CommandParser` only |
| `e2e_validation.py` | `use_llm=False` | **No LLM option** | Hardcoded deterministic |
| `contract_drift_eval.py` | Static | N/A | Contract parity |

### Production vs eval gap (pre-V2D)

| Item | Status |
|------|--------|
| Smoke deterministic | Run routinely (CI) |
| Smoke live LLM | **Was missing** — now run in V2D |
| Workflow live LLM | **Was missing** — now run in V2D |
| `run_all --live` | Supported but not default |
| E2E intent steps | Always deterministic — understates production on LLM-fallback cases |

### Production API path

```
POST /classify
  → CommandParser.parse()
  → IntentClassifier.classify(use_llm=True)
      1. workflow_pre_classify
      2. operational_pre_classify
      3. assign_clarify_pre_classify
      4. deterministic_pre_classify
      5. [LLM if all abstain]        ← production fallback
      6. Post-rules (assign→mgrassign, assign→clarify)
```

**Note:** `delegation_anti_sink_pre_classify` runs only when `use_llm=False` (eval/CI path). Production relies on LLM instead of anti-sink when pre-classifiers abstain. Smoke dataset has **zero** messages that require anti-sink or LLM.

---

## Phase 2 — LLM-on smoke evaluation

**Command:** `python -m eval.smoke_intent_eval --live`  
**Report:** `ml/eval/reports/smoke_intent_eval_live.json`

| Metric | Result |
|--------|--------|
| Overall accuracy | **100%** (200/200) |
| Failure count | **0** |
| Contract gap accuracy | **100%** |

### Per-slice accuracy (live LLM)

| Slice | Count | Det | Live |
|-------|-------|-----|------|
| assign_depart | 25 | 100% | 100% |
| assign_clarify | 15 | 100% | 100% |
| stock_linked | 25 | 100% | 100% |
| complete_update | 15 | 100% | 100% |
| mgr_boundary | 35 | 100% | 100% |
| import_boundary | 25 | 100% | 100% |
| inventory_boundary | 15 | 100% | 100% |
| contract_gap | 30 | 100% | 100% |
| regression | 15 | 100% | 100% |

### Pre-classifier coverage (smoke, n=200)

| Stage | Cases | % |
|-------|-------|---|
| workflow_pre_classify | 99 | 49.5% |
| operational_pre_classify | 91 | 45.5% |
| assign_clarify_pre_classify | 9 | 4.5% |
| deterministic_pre_classify | 1 | 0.5% |
| **LLM fallback** | **0** | **0%** |

---

## Phase 3 — Deterministic vs LLM comparison

### Smoke (200 cases)

- **Disagreements:** 0
- **Interpretation:** V2B/V2C improvements are entirely in pre-classifier stages that production executes identically before any LLM call.

### Workflow (429 cases)

- **Disagreements:** 0
- **Accuracy both modes:** 96.04% (17 shared failures)
- **Pre-classifier coverage:**

| Stage | Cases | % |
|-------|-------|---|
| workflow | 386 | 89.9% |
| operational | 30 | 7.0% |
| assign_clarify | 3 | 0.7% |
| **LLM fallback** | **10** | **2.3%** |

### Slice-level interpretation

| Cluster | Smoke det/live | Workflow det/live | Stable? |
|---------|----------------|-------------------|---------|
| Assign family | 100% / 100% | N/A (subset in workflow) | Yes |
| Stock-linked | 100% / 100% | N/A | Yes |
| Task lifecycle | 100% / 100% | N/A | Yes |
| Import boundary | 100% / 100% | N/A | Yes |
| Inventory status | 100% smoke slice | 9 failures in workflow dataset | Pre-existing |
| Onboard vendor | N/A | 5 failures in workflow dataset | Pre-existing |

---

## Phase 4 — False positive audit (det correct, LLM wrong)

**Result: NONE**

Across 629 combined evaluations (200 smoke + 429 workflow), there are **zero** cases where deterministic classification was correct and live LLM classification was incorrect.

**Implication:** The LLM does not undo V2B/V2C hardening on current benchmarks. Hardened phrases never reach the LLM on smoke; on workflow, LLM agrees with deterministic output on every case.

---

## Phase 5 — False negative audit (det wrong, LLM correct)

**Result: NONE**

There are **zero** cases where deterministic was wrong and LLM rescued the classification.

### LLM-path cases (workflow, n=10) — both paths fail

All 10 messages that reach LLM fallback fail identically in deterministic (`general_chat`) and live LLM:

| Message | Expected | Det & Live |
|---------|----------|------------|
| check product stock | `/inventory_status` | `general_chat` |
| how many bags in stock | `/inventory_status` | `general_chat` |
| maal ka status | `/inventory_status` | `general_chat` |
| kitna cement pada hai | `/inventory_status` | `general_chat` |
| kam pada hua stock | `/inventory_status` | `general_chat` |
| maal status check | `/inventory_status` | `general_chat` |
| kitna maal pada hai | `/inventory_status` | `general_chat` |
| register vendor for procurement | `/onboard_vendor` | `general_chat` |
| add purchase vendor | `/onboard_vendor` | `general_chat` |
| add vendor for purchase | `/onboard_vendor` | `general_chat` |

**Pattern:** English/Hindi inventory query and vendor-onboard phrases outside regex vocabulary; LLM few-shots do not recover them.

---

## Phase 6 — Hybrid pipeline analysis

### Representative failure: `check product stock` → `general_chat`

```
Message: "check product stock"
  ↓ CommandParser — no slash match
  ↓ workflow_pre_classify — no inventory_status regex match
  ↓ operational_pre_classify — no match
  ↓ assign_clarify_pre_classify — no draft signal
  ↓ deterministic_pre_classify — no match
  ↓ LLM (production) — returns general_chat
  ↓ Post-processing — no assign rules apply
  → general_chat
```

**Responsible layer:** Regex gap (workflow inventory_status patterns) + LLM fallback failure. **Not** a V2B/V2C regression.

### Representative success: `ram ko cleaning karo` → `/assign`

```
Message: "ram ko cleaning karo"
  ↓ workflow_pre_classify — None
  ↓ operational_pre_classify — /assign (V2B _ASSIGN_KO_INSTRUCT_RE)
  → /assign (LLM never called)
```

**Responsible layer:** operational pre-classifier (V2B). Production and eval agree.

### Production-only post-rules (when LLM fires)

When LLM returns `/assign`:
- `task_id` present → `/mgrassign`
- No worker/mention → `/assign_clarify`

These rules did not affect smoke or workflow benchmarks because hardened cases do not reach LLM on smoke, and LLM-path failures return `general_chat`.

---

## Phase 7 — Readiness assessment

### Can current classifier ship?

**Yes, with documented scope:**

| Area | Status |
|------|--------|
| Assign / depart / clarify / delivery / stock (smoke) | **Ship-ready** — 100% det + live |
| Task lifecycle (update, mgrself, cancel) | **Ship-ready** — 100% smoke |
| Import / contract v1.1 | **Ship-ready** — 100% smoke |
| Workflow overall | **96.04%** — acceptable; failures pre-existing |
| Inventory status (workflow) | **Gap** — 9 failures, regex + LLM |
| Onboard vendor (workflow) | **Gap** — 5 failures, regex + LLM |

### Is V3 required before release?

**No** for the hardened intent clusters (assign family, task lifecycle, import boundary).

V3 role-aware classify would not fix the 17 workflow failures — they are inventory/onboard vocabulary gaps, not role disambiguation problems.

### Are benchmark gains evaluation-specific?

**No.** Smoke gains are production-real because:
1. All 200 smoke cases resolve in pre-classifiers (same code path production runs first).
2. Live LLM produces identical outputs — no hidden LLM regressions.
3. V2B anti-sink is eval-only (`use_llm=False`) but **unused on smoke** (no abstaining cases).

---

## Workflow failure inventory (17 — unchanged by LLM)

| Dataset | Failures | Root cause |
|---------|----------|------------|
| inventory_status | 9 | Regex miss → LLM `general_chat` (7) or wrong pre-classifier (2) |
| onboard_vendor | 5 | Regex miss → LLM `general_chat` (3) or assign_clarify bleed (2) |
| inventory_create | 3 | inventory_status / depart_assign collision |

---

## Reports generated (V2D)

| Report | Path |
|--------|------|
| Smoke deterministic | `ml/eval/reports/smoke_intent_eval_deterministic.json` |
| Smoke live LLM | `ml/eval/reports/smoke_intent_eval_live.json` |
| Workflow deterministic | `ml/eval/reports/workflow_intent_eval_deterministic.json` |
| Workflow live LLM | `ml/eval/reports/workflow_intent_eval_live.json` |

---

## Recommended next action

1. **Ship V1+V2B+V2C** for assign-family and task-lifecycle intents — production-validated.
2. **Optional V2E:** Inventory status + onboard vendor regex/LLM prompt gap (workflow 17 failures) — not role-aware V3.
3. **CI enhancement:** Add `smoke_intent_eval --live` as optional/nightly job (requires `OPENAI_API_KEY`).
4. **E2E harness:** Consider `use_llm=True` option for scenarios that test LLM-fallback paths.
5. **Defer V3** role-aware classify until product requires role-based intent disambiguation.

---

## References

- V2B: `73-v2b-operational-sink-hardening.md`
- V2C: `74-v2c-task-lifecycle-hardening.md`
- V1 audit (noted missing live smoke): `71-ml-hardening-v1-audit.md`
