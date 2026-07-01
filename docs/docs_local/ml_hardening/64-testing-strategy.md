# Phase 4A — Testing Strategy (Contract v1.1)

---

## Unit tests

### Contract sync

| Test | Location | Assert |
|------|----------|--------|
| Backend drift | `contract-drift.spec.ts` | 30 intents, JSON↔TS |
| ML drift | `contract_drift_eval.py` | ML JSON = backend JSON |
| Phase4 drift | `phase4-contract-drift.spec.ts` | If applicable |

### Regex / pre-classify (`ml/tests`)

| Module | New coverage for v1.1 |
|--------|----------------------|
| `test_sprint2_intent.py` | `import inventory` → import_csv; discovery exclusion |
| `test_workflow_intent.py` | cancel, suggestion_approve slash |
| New `test_contract_v1_1_intents.py` | assign_delivery, task_inventory_nl patterns |
| `test_manager_intent_hardening.py` | No regression |

### CommandParser

- Slash forms for 5 new intents parse to correct intent string
- Unknown slash still falls through

### VALID_INTENTS gate

- Each new intent in set; `general_chat` fallback unchanged for OOD

---

## Integration tests

### ML service (`ml/main.py`)

| Test | Method |
|------|--------|
| POST `/classify` returns new intents | pytest + TestClient |
| Response schema unchanged | Pydantic |

### Backend (light)

| Test | Scope |
|------|-------|
| `normalizeIntentCommand` | Accepts 5 new slash strings |
| Workflow registry | Existing — no new handlers required for classify-only |

**Note:** Full WhatsApp E2E not required for 4A gate.

---

## Regression tests

| Suite | Run when |
|-------|----------|
| `test_manager_intent_hardening.py` | Every PR |
| `test_workflow_intent.py` | PR-2, PR-3 |
| `workflow_intent_eval` on `manager_workflows.json` | PR-2 — accuracy ≥ pre-PR baseline |
| Existing `data/eval/intents/*.json` | PR-2 — update labels if intent renamed only |

---

## ML evaluation tests

### Smoke eval (PR-3+)

| Tier | Command | CI |
|------|---------|-----|
| Fast | `smoke_intent_eval --no-llm` | On PR |
| Full | `smoke_intent_eval --live` | Manual / nightly |
| Slice | `--slice contract_gap` | PR-2 gate |

### Metrics gates (doc 65)

- Macro accuracy smoke (regex): floor TBD after baseline
- Contract gap slice recall: ≥80% regex post PR-2
- LLM smoke: document-only threshold for 4B entry

### Boundary pair tests

For each pair in doc 31, smoke must include ≥2 cases; eval reports confusion count.

---

## Test matrix by PR

| PR | Unit | Integration | Regression | ML eval |
|----|------|-------------|------------|---------|
| PR-1 | harness smoke | — | run_all | empty smoke |
| PR-2 | contract + bot_engine | /classify | manager_workflows | contract_drift |
| PR-3 | schema | — | — | full smoke regex |
| PR-4 | — | optional live | — | LLM smoke report |

---

## Fixtures and data hygiene

- Smoke IDs stable (`SMOKE-*`) for diff tracking
- Do not commit API keys
- LLM eval artifacts in `ml/eval/reports/` (gitignore if large — team policy)

---

## Out of scope (4A)

- Role-aware classify tests (4B)
- Stock-linked unified path tests (Phase 5)
- confidence_tier tests (Phase 5)
- Full 1200-case benchmark (Phase 5+)
