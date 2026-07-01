# Phase 4A — Contract v1.1 Analysis

**Current version:** `v1` (`intent-types.json`)  
**Target version:** `v1.1`  
**Scope:** Close 5-intent gap + discovery phrase collision fix

---

## v1.1 requirements

### 1. Add five intents to contract

| Intent | Capability | Backend source |
|--------|------------|----------------|
| `/assign_delivery` | Stock-linked ops | `COMMANDS.ASSIGN_DELIVERY` |
| `/task_inventory_nl` | Stock-linked NL | `WORKFLOW_START_COMMANDS.TASK_INVENTORY_CREATION` |
| `/inventory_import_csv` | Bulk import | `COMMANDS.INVENTORY_IMPORT_CSV` |
| `/suggestion_approve` | Document approval | `SUGGESTION_APPROVAL_COMMAND` |
| `/cancel` | Workflow/import cancel | `WORKFLOW_CANCEL_COMMAND` |

**Target count:** 30 slash intents + `general_chat` = **31** contract entries.

### 2. Fix discovery phrase collision

| Current phrase | Problem | v1.1 action |
|----------------|---------|-------------|
| `import inventory` | Routes to `business_discovery` via regex | **Remove** from `discovery_phrases`; add `inventory_import_phrases` or document routing to `/inventory_import_csv` |
| `import vendors` | Ambiguous (onboard vs discovery) | Narrow or split |

### 3. Runtime parity

| Component | v1 | v1.1 |
|-----------|----|----|
| `intent-types.json` (backend + ml) | 25 intents | 30 + general_chat |
| `VALID_INTENTS` in `bot_engine.py` | Hardcoded 26 | Load from contract OR synced set of 31 |
| `INTENT_TYPES` TS exports | 25 | 31 |
| `CommandParser.parse` | ~22 slash forms | Full `COMMANDS` parity for slash |
| LLM `_build_system_prompt` | Missing 5 | Include 5 with few-shots |
| `_BUSINESS_DISCOVERY_RE` | Captures import inventory | Exclude import stock phrases |

### 4. Version bump

```json
{ "version": "v1.1", ... }
```

Document in `ml/contracts/README.md` and Phase 4A changelog.

---

## Files impacted (implementation reference — not to change in this task)

### Contract files (must stay in sync)

| File | Change |
|------|--------|
| `backend/contracts/intent-types.json` | Add 5 intents; fix phrases; version |
| `ml/contracts/intent-types.json` | Mirror backend |
| `backend/contracts/typescript/index.ts` | `INTENT_TYPES` array |
| `ml/contracts/typescript/index.ts` | Mirror |
| `ml/contracts/python/document_types.py` | Auto-loads JSON — verify after edit |

### ML runtime

| File | Change |
|------|--------|
| `ml/bot_engine.py` | `VALID_INTENTS`; `CommandParser`; `workflow_pre_classify` / new regex for import_csv; LLM prompt; optional load-from-JSON |
| `ml/main.py` | No API change for v1.1 |

### Backend (minimal for v1.1)

| File | Change |
|------|--------|
| `backend/src/contracts/contract-drift.spec.ts` | Extend required intents list |
| `backend/src/contracts/phase4-contract-drift.spec.ts` | If exists — align |

### Tests

| File | Change |
|------|--------|
| `ml/tests/test_workflow_intent.py` | Cases for new intents |
| `ml/tests/test_sprint2_intent.py` | import phrase routing |
| `ml/tests/test_manager_intent_hardening.py` | No change expected |
| `ml/eval/contract_drift_eval.py` | Expand workflow intent check |
| New: smoke dataset tests | `ml/tests/test_smoke_intent_eval.py` (PR-3) |

---

## Runtime impact

| Area | Impact |
|------|--------|
| `/classify` response | May return 5 new intent strings |
| Backend `routeMlFallback` | Already handles via `normalizeIntentCommand` + workflow registry for most |
| `assign_delivery` | Already slash-bypass in backend — NL classify can now emit intent |
| `inventory_import_csv` | NL can route correctly vs discovery |
| `cancel` | NL could emit — backend already handles pre-ML |
| `suggestion_approve` | Primarily workflow-triggered; NL edge cases |
| `task_inventory_nl` | May overlap with extract path — document precedence in v1.1 notes |

**Backward compatibility:** Adding intents is **additive**. Existing intents unchanged. Phrase change for `import inventory` is **behavior change** — document in release notes.

---

## ML impact

| Change | ML effect |
|--------|-----------|
| 5 intents in prompt | Larger prompt; need focused few-shots per intent |
| import_csv regex | Redirects phrases from business_discovery |
| VALID_INTENTS gate | New intents won't fall to general_chat |
| task_inventory_nl in contract | Does not remove `/extract/task-inventory` — dual path remains until Phase 5 |

---

## Test impact

- Contract drift tests must assert 30 slash intents present
- New unit tests per intent (regex path minimum)
- Regression: existing `manager_workflows.json`, `workflow_intent_eval` must not regress
- Smoke eval (PR-3) validates v1.1 boundaries

---

## Backward compatibility

| Concern | Assessment |
|---------|------------|
| API response shape | Unchanged (`ClassifyResponse`) |
| New intent values | Clients ignoring unknown intents — backend already routes |
| `import inventory` phrase | **Breaking** for users expecting discovery — correct behavior is import |
| ML service version | Deploy backend + ML together for phrase fix |
| Eval datasets with old expected intents | Update labels in smoke PR |

---

## v1.1 explicit non-goals

- Role in classify API (v2 — Phase 4B)
- confidence_tier field
- Stock path unification
- Intent hierarchy refactor
