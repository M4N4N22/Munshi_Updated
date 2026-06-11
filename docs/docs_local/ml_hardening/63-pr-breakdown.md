# Phase 4A — PR Breakdown

**Sequence:** PR-1 → PR-2 → PR-3 → PR-4 (strict dependency)

---

## PR-1 — Benchmark infrastructure

### Scope

- Unified smoke eval harness (`smoke_intent_eval.py`)
- JSON schema for smoke cases
- Extend `run_all.py` to include smoke (empty or placeholder)
- Report format: `baseline-*.json` + markdown template
- Optional: deprecate or gate `intent_eval.py` (legacy)

### Files (expected)

| File | Action |
|------|--------|
| `ml/eval/smoke_intent_eval.py` | New |
| `ml/eval/schemas/smoke_case.schema.json` | New |
| `ml/eval/run_all.py` | Extend |
| `ml/data/eval/smoke/manifest.json` | Stub (0 cases) |
| `docs/docs_local/ml_hardening/` or `ml/eval/README.md` | Run instructions |

### Risks

| Risk | Mitigation |
|------|------------|
| Harness API churn before PR-3 | Version schema in manifest |
| Duplication with `workflow_intent_eval` | Reuse `compute_metrics` pattern |

### Acceptance criteria

- [ ] `python -m eval.smoke_intent_eval --no-llm` exits 0 with empty/stub dataset
- [ ] Schema validates a sample case from doc 62
- [ ] `run_all` includes smoke step
- [ ] Report written to `ml/eval/reports/`

### Reviewer checklist

- [ ] No contract or `bot_engine` changes
- [ ] No LLM calls in default CI path
- [ ] Metrics match `workflow_intent_eval` semantics

---

## PR-2 — Contract v1.1

### Scope

- Add 5 intents to both `intent-types.json`
- Sync TS `INTENT_TYPES`
- `VALID_INTENTS` parity (load JSON or manual sync)
- Discovery phrase fix (`import inventory`)
- LLM prompt + regex for `inventory_import_csv`
- Extend `contract-drift.spec.ts`
- Unit tests for new intents

### Files (expected)

| File | Action |
|------|--------|
| `backend/contracts/intent-types.json` | Edit |
| `ml/contracts/intent-types.json` | Edit |
| `backend/contracts/typescript/index.ts` | Edit |
| `ml/contracts/typescript/index.ts` | Edit |
| `ml/bot_engine.py` | Edit |
| `backend/src/contracts/contract-drift.spec.ts` | Edit |
| `ml/tests/test_*` | New/extend |
| `ml/eval/contract_drift_eval.py` | Extend |

### Risks

| Risk | Mitigation |
|------|------------|
| `import inventory` behavior change | Release note; smoke slice S2 |
| `task_inventory_nl` vs extract path | Document precedence; no routing change in 4A |
| VALID_INTENTS drift | Single source load in follow-up if not in PR-2 |

### Acceptance criteria

- [ ] Contract version `v1.1`; 30 slash intents + `general_chat`
- [ ] `contract-drift.spec.ts` green
- [ ] `python -m eval.contract_drift_eval` green
- [ ] pytest intent tests green (regex mode)
- [ ] `import inventory` → `/inventory_import_csv` (not discovery)

### Reviewer checklist

- [ ] Backend and ML JSON identical
- [ ] TS exports match JSON
- [ ] No role/confidence API changes
- [ ] Breaking phrase change documented

---

## PR-3 — Smoke dataset

### Scope

- Author ~200 cases per doc 62
- `smoke-v1.1.jsonl` + manifest
- Wire harness to full dataset
- CI: regex smoke subset (fast) optional

### Files (expected)

| File | Action |
|------|--------|
| `ml/data/eval/smoke/smoke-v1.1.jsonl` | New |
| `ml/data/eval/smoke/manifest.json` | Update |
| `ml/tests/test_smoke_intent_eval.py` | New |
| Slice files under `slices/` | Optional |

### Risks

| Risk | Mitigation |
|------|------------|
| Label disputes on boundaries | Reference doc 31 pairs |
| LLM flake on eval | Report variance; regex arm for CI |

### Acceptance criteria

- [ ] Manifest: ~200 cases, slice counts per doc 62
- [ ] All 5 gap intents covered
- [ ] Schema validation passes
- [ ] Regex smoke ≥ agreed floor (TBD after PR-2)

### Reviewer checklist

- [ ] No duplicate messages
- [ ] Role field on mgr/assign cases
- [ ] Tags reference contract v1.1

---

## PR-4 — Benchmark results

### Scope

- Run baseline (pre) if not captured — or document delta only
- Run post-v1.1 smoke (regex + LLM)
- Publish `baseline-pre-v1.1.md`, `baseline-post-v1.1.md`
- JSON metrics in `ml/eval/reports/`
- Update Phase 4A summary in docs

### Files (expected)

| File | Action |
|------|--------|
| `ml/eval/reports/baseline-*.json` | New |
| `docs/docs_local/ml_hardening/69-baseline-results.md` | New (optional) |
| No production code unless metrics script fixes |

### Risks

| Risk | Mitigation |
|------|------------|
| Non-reproducible LLM scores | Pin model; record timestamp |
| Missing pre-baseline | Run regex-only pre from git tag |

### Acceptance criteria

- [ ] Pre and post metrics documented
- [ ] Contract gap probe: 5/5 intents improved vs pre
- [ ] Top confusions listed with owners for 4B
- [ ] Gate decision for Phase 4B recorded

### Reviewer checklist

- [ ] Commands to reproduce attached
- [ ] No secret keys in reports
- [ ] Success criteria from doc 65 referenced

---

## PR dependency graph

```
PR-1 (harness)
  ↓
PR-2 (contract) ──→ PR-3 (data) ──→ PR-4 (results)
```

PR-2 can start in parallel with PR-1 only if harness not required for contract tests — **recommended: PR-1 first**.
