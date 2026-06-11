# Phase 4A — Baseline Benchmark Plan

**Purpose:** Define how to run baseline **before** Contract v1.1 — execution deferred to PR-1/PR-4.

---

## Existing tooling audit

### Scripts

| Tool | Path | Purpose | LLM? |
|------|------|---------|------|
| `run_all` | `ml/eval/run_all.py` | Aggregates all evals | Optional `--live` |
| `workflow_intent_eval` | `ml/eval/workflow_intent_eval.py` | Intent JSON datasets; confusion matrix | `use_llm` flag |
| `contract_drift_eval` | `ml/eval/contract_drift_eval.py` | Schema + intent file checks | No |
| `contract_eval` | `ml/eval/contract_eval.py` | Pydantic compliance | No |
| `intent_eval` | `ml/eval/intent_eval.py` | **Legacy** 4 fixtures (stale) | No |
| `run_intent_audit` | `ml/scripts/run_intent_audit.py` | Ad-hoc audit with LLM | Yes |
| `e2e_validation` | `ml/eval/e2e_validation.py` | `data/eval/e2e/scenarios.json` | Varies |

### Existing intent datasets

| File | Cases (approx) | Coverage |
|------|----------------|----------|
| `manager_workflows.json` | 32 | mgr* cluster |
| `inventory_create.json` | varies | create workflow |
| `inventory_status.json` | varies | status |
| `onboard_vendor.json` | varies | vendor |
| `onboard_worker.json` | varies | worker |

**Gap:** No datasets for assign/depart, stock-linked, import_csv, contract-gap intents.

### Existing reports

| Location | Notes |
|----------|-------|
| `ml/eval/reports/` | Created by `workflow_intent_eval` when run |
| No canonical baseline file | Must create in PR-4 |

### Unit tests (proxy baseline)

| Test module | Coverage |
|-------------|----------|
| `test_manager_intent_hardening.py` | mgr* regex |
| `test_workflow_intent.py` | workflow pre-classify |
| `test_sprint2_intent.py` | complete/update, discovery |
| `test_operational_intent.py` | operational pre |
| `test_assign_clarify.py` | assign_clarify |

---

## Baseline execution plan

### Step B1 — Environment

| Requirement | Detail |
|-------------|--------|
| Python | `ml/requirements.txt` |
| Env | `OPENAI_API_KEY` for LLM arm only |
| ML service | Not required for regex-only; optional for live API test |
| Working dir | `ml/` |

### Step B2 — Regex-only baseline (no API cost)

```bash
# Planned commands (do not run in planning task)
cd ml
python -m pytest tests/test_manager_intent_hardening.py tests/test_workflow_intent.py tests/test_sprint2_intent.py tests/test_operational_intent.py -q
python -m eval.workflow_intent_eval --no-llm   # if CLI exists; else use classify_hybrid use_llm=False via script
python -m eval.run_all
```

**Record:** pytest pass count; `workflow_intent_eval` accuracy (regex mode); per-intent confusion from report.

### Step B3 — LLM sample baseline (~100 cases)

| Source | Cases |
|--------|-------|
| `manager_workflows.json` | all |
| Sample from Phase 3 boundary pairs | ~40 (to be authored in smoke — use existing only for v1 baseline) |
| Manual P1 phrases from doc 23 | ~30 |

**Method:** `classify_hybrid(msg, use_llm=True)` or `run_intent_audit.py` pattern.

**Record:** accuracy, top confusions, contract-gap phrase failures.

### Step B4 — Contract gap probe (manual checklist)

| Phrase | Expected (target) | Current (documented) |
|--------|-------------------|----------------------|
| import inventory | inventory_import_csv | business_discovery |
| Ram ko 50 bolt bhejo | task_inventory_nl or assign_delivery | assign / general_chat |
| /assign_delivery @x SKU 5 | assign_delivery | slash bypass (backend) |
| cancel | cancel | workflow pre-ML |
| stock add karo | clarify or create | inventory_create |

Document results in `ml/eval/reports/baseline-pre-v1.1.json` (PR-4).

### Step B5 — Backend routing baseline (optional)

- Not required for 4A gate
- Note: E2E `scenarios.json` — 3 scenarios only

---

## LLM requirements

| Mode | API key | Cost | Flake risk |
|------|---------|------|------------|
| Regex-only | No | None | Low |
| LLM sample | Yes | Low–medium | Medium |
| Full smoke 200 LLM | Yes | Medium | Medium |

**CI recommendation:** Regex baseline on PR; LLM baseline manual or nightly.

---

## Runtime requirements

| Component | Time (relative) |
|-----------|-----------------|
| pytest suite | Minutes |
| workflow_intent_eval (~100 rows) regex | Seconds |
| workflow_intent_eval LLM | Minutes (API latency) |
| run_all | < 5 min |

---

## Baseline deliverables (PR-4)

| Artifact | Content |
|----------|---------|
| `baseline-pre-v1.1.json` | Metrics snapshot |
| `baseline-pre-v1.1.md` | Human summary in docs |
| Confusion matrices | Top 10 pairs |
| Contract gap probe table | Pass/fail |

---

## Benchmark readiness assessment

| Item | Ready? |
|------|--------|
| Regex eval infrastructure | ✅ Yes (`workflow_intent_eval`, pytest) |
| Unified smoke schema | ❌ PR-1 must add |
| LLM eval harness with reports | ⚠️ Partial (`workflow_intent_eval` exists) |
| Phase 3 metrics (boundary, role) | ❌ Harness extension in PR-1 |
| Pre-v1.1 baseline file | ❌ PR-4 output |

**Verdict:** **YELLOW** — can run baseline with existing tools; PR-1 improves repeatability.
