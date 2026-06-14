# Phase 3.5 — Intent Contract Consumption

---

## Contract sources

| File | Location | Loaded by classifier? |
|------|----------|----------------------|
| `intent-types.json` | `backend/contracts/`, `ml/contracts/` | **Partially** — eval/drift only |
| `VALID_INTENTS` set | `ml/bot_engine.py` hardcoded | **Yes** — runtime gate |
| `INTENT_TYPES` | `ml/contracts/python/document_types.py` | Loaded from JSON but **not used in classify()** |
| LLM system prompt | `_build_system_prompt()` | **Yes** — intent list in prose |
| `backend/contracts/typescript/index.ts` | TS exports | Backend types only |

**Drift:** JSON contract and runtime `VALID_INTENTS` can diverge without test failure if drift eval subset passes.

---

## Consumption flow

```
intent-types.json (25 intents + general_chat)
        ↓ (document_types.py — unused at classify time)
VALID_INTENTS hardcoded in bot_engine.py (26 entries)
        ↓
LLM returns intent
        ↓
if intent not in VALID_INTENTS → general_chat
        ↓
backend routeMlFallback → processCommand / workflow
```

**CommandParser** uses separate hardcoded `startswith` list — missing `/assign_delivery`, `/inventory_import_csv`, `/cancel`, `/suggestion_approve`, `/task_inventory_nl`, `/mgrself`, `/mgrassign`, etc. (only subset of slash forms).

---

## Missing intents — runtime impact

| Intent | In VALID_INTENTS | In LLM prompt | CommandParser | Backend route |
|--------|:----------------:|:-------------:|:-------------:|:-------------:|
| `/assign_delivery` | ❌ | ❌ | ❌ | slash bypass only |
| `/task_inventory_nl` | ❌ | ❌ | ❌ | separate `/extract/task-inventory` |
| `/inventory_import_csv` | ❌ | ❌ | ❌ | direct slash + COMMANDS |
| `/suggestion_approve` | ❌ | ❌ | ❌ | workflow trigger from docs |
| `/cancel` | ❌ | ❌ | ❌ | backend `isCancelCommand` pre-ML |

### Behavioral impact

| Missing intent | What happens for NL |
|----------------|---------------------|
| assign_delivery | Never classified — user must use slash or stock NL path |
| task_inventory_nl | Backend tries extractor first; else may classify as `/assign` |
| inventory_import_csv | May hit `_BUSINESS_DISCOVERY_RE` ("import inventory") → **wrong** `/business_discovery` |
| inventory_import_csv | Or `_INVENTORY_CREATE_RE` ("stock add") → `/inventory_create` |
| suggestion_approve | Document pipeline starts workflow — not NL classify |
| cancel | Handled entirely in backend before ML |

---

## Discovery phrase conflict (evidence)

`workflow_pre_classify` → `_BUSINESS_DISCOVERY_RE` includes:

```
import inventory(list|sheet|data|file)?
```

Same phrase in `intent-types.json` `discovery_phrases`. NL "import inventory" routes to **business_discovery**, not import_csv.

---

## workflow-types.json

Consumed for workflow type ↔ start_command mapping in backend. ML does not read workflow-types.json at classify time.

---

## Post-classify backend mapping

`normalizeIntentCommand()` — lowercases, ensures leading `/`. No contract validation on backend before `processCommand`.

`startWorkflowIfRegistered` — only registered workflow commands; unknown intents fall through to processCommand or fail silently.
