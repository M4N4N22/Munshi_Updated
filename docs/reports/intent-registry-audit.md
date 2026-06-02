# Intent Registry Audit

**Date:** 2026-06-01  
**Source:** Local ML repo `Munshi-Dada-Phase-1-main` (`bot_engine.py`, `contracts/intent-types.json`)  
**Method:** Static code inspection — no modifications

---

## Summary

| Metric | Count |
|--------|-------|
| Total registered intents | **26** (25 slash intents + `general_chat`) |
| Workflow pre-classifier intents | **8** |
| Deterministic pre-classifier intents | **2** (`/complete`, partial `/assign`/`/mgrassign`) |
| LLM-only intents (no regex) | **~15** |
| Backend workflow-start intents | **7** (+ alias `/continue_discovery`) |

Local ML does **not** expose confidence scores in `/classify` response.

---

## Complete intent inventory

| Intent | Purpose | Expected workflow / backend action | Expected role | Classification method | Priority | Training examples in prompt |
|--------|---------|-----------------------------------|---------------|----------------------|----------|------------------------------|
| `/business_discovery` | Progressive business profiling | `BUSINESS_DISCOVERY` workflow | Owner, Manager | **Regex** `_BUSINESS_DISCOVERY_RE` | P0 | Yes — EN examples in system prompt |
| `/continue_discovery` | Resume discovery | `BUSINESS_DISCOVERY` (alias) | Owner | **Regex** `_CONTINUE_DISCOVERY_RE` | P0 | Yes |
| `/onboard_vendor` | Register supplier | `ONBOARD_VENDOR` workflow | Owner, Manager | **Regex** `_ONBOARD_VENDOR_RE` | P0 | Yes |
| `/onboard_worker` | Register employee | `ONBOARD_WORKER` workflow | Owner, Manager | **Regex** `_ONBOARD_WORKER_RE` | P1 | Yes |
| `/inventory_create` | Add stock item | `INVENTORY_CREATE` workflow | Owner, Manager | **Regex** `_INVENTORY_CREATE_RE` | P0 | Yes |
| `/inventory_status` | Stock / low-stock check | `processCommand` → inventory service | Owner, Manager | **Regex** `_INVENTORY_STATUS_RE` | P0 | Yes |
| `/purchase_request_create` | Start procurement request | `PURCHASE_REQUEST_CREATE` workflow | Owner, Manager | **Regex** `_PURCHASE_REQUEST_CREATE_RE` | P0 | Yes |
| `/assign` | Assign work to named person | Task creation / assignment | Manager, Owner | **Deterministic** + **LLM** | P0 | Yes — many HI/EN |
| `/depart_assign` | Assign to department | Department task routing | Manager, Owner | **Deterministic** + **LLM** | P0 | Yes |
| `/mgrassign` | Assign existing task to person | Manager task delegation | Manager | **Deterministic** + **LLM** | P0 | Yes |
| `/mgrself` | Manager takes task | Self-assignment | Manager | **LLM** | P1 | Yes |
| `/mgrtransfer` | Transfer task to dept | Inter-dept routing | Manager | **LLM** | P1 | Yes |
| `/mgrreject` | Reject misrouted task | Task rejection + reason | Manager | **LLM** | P1 | Yes |
| `/complete` | Confirm work done | Mark task complete | Worker | **Deterministic** `_COMPLETION_CONFIRMED_RE` | P0 | Yes |
| `/present` | Mark attendance present | Attendance service | Worker | **LLM** only | P0 | Yes — limited HI |
| `/absent` | Mark absent / leave | Attendance service | Worker | **LLM** only | P0 | Yes — limited HI |
| `/issue` | Report problem | Issue creation | Worker, Manager | **LLM** only | P0 | Yes |
| `/issues` | List open issues | Issue list query | Owner, Manager, Worker | **LLM** only | P1 | Partial |
| `/resolve` | Close issue | Issue resolution | Manager, Worker | **LLM** only | P2 | Partial |
| `/tasks` | View own tasks | Task list | Worker | **LLM** only | P0 | Partial |
| `/update` | Task progress update | Task update | Worker | **LLM** only | P1 | Partial |
| `/report` | Daily / attendance report | Report service | Owner, Manager | **LLM** only | P0 | Partial |
| `/members` | Team member list | Factory members | Owner, Manager | **LLM** only | P2 | Partial |
| `/help` | Command help | Help text | All | **LLM** + slash | P2 | Yes |
| `general_chat` | Greetings, off-topic | Chat fallback | All | **LLM** fallback + API error fallback | — | Yes |

**Note:** Slash-command intents (`/tasks`, `/help`, etc.) also parsed by `CommandParser` before hybrid classifier when message starts with `/`.

---

## Classification pipeline order

```
1. CommandParser.parse()        → slash commands only
2. workflow_pre_classify()      → regex (workflows + discovery)
3. deterministic_pre_classify() → /complete, @mention assign patterns
4. llm_classify()               → GPT few-shot (temperature=0, seed=42)
5. Fallback                     → general_chat on invalid intent or API error
```

---

## Intents with NO regex coverage (LLM-dependent)

These fail when LLM returns `general_chat` or API errors:

- `/present`, `/absent` (Hindi phrases)
- `/report`, `/tasks`, `/issues`, `/update`, `/resolve`, `/members`
- `/mgrtransfer`, `/mgrreject`, `/mgrself` (Hindi task-id phrases)
- Most Hindi `/assign` / `/depart_assign` without English keywords

**Audit finding:** 200 of 212 misclassifications in the real-language dataset routed to `general_chat`.

---

## Contract alignment

`contracts/intent-types.json` lists 26 intents matching `VALID_INTENTS` in `bot_engine.py`.

`/continue_discovery` maps to same backend workflow as `/business_discovery` via registry alias.

---

## Vendor role gap

**No vendor intents exist.** Vendor WhatsApp role is not implemented. Vendor utterances correctly fall to `general_chat` (scored as NOT_SUPPORTED in dataset).

---

## Related artifacts

- Raw test output: `intent-audit-results.json` (385 phrases, local ML only)
- Workflow mapping: `intent-workflow-mapping.md`
