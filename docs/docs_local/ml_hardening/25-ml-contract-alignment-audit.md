# Phase 2 — ML Contract Alignment Audit

**Compared layers:**

1. Business capabilities (Phase 1 — 17 capabilities)
2. Command registry (Phase 0 — 30 commands)
3. `backend/contracts/intent-types.json` (26 entries: 25 slash + general_chat)
4. `backend/contracts/typescript/index.ts` INTENT_TYPES (same as JSON)
5. `ml/contracts/typescript/index.ts` INTENT_TYPES (mirror)
6. `backend/contracts/workflow-types.json` (8 workflow types)
7. `ml/bot_engine.py` slash passthrough handler

---

## Alignment summary

| Layer | Slash intents | Workflows | Gap vs commands |
|-------|--------------|-----------|-----------------|
| Command registry | 30 | 9 registry keys | — |
| intent-types.json | 25 | — | **5 missing** |
| INTENT_TYPES (TS) | 25 | 8 types | **5 missing** |
| workflow-types.json | — | 8 start commands | Missing `/continue_discovery` (alias only) |
| bot_engine slash passthrough | ~22 handled | — | **8+ gaps** |

---

## Missing intents (in backend commands, NOT in ML contract)

| Command | Capability | In COMMANDS | In intent-types | In bot_engine passthrough | Severity |
|---------|------------|:-----------:|:-----------------:|:-------------------------:|----------|
| `/assign_delivery` | Stock-Linked Ops | ✅ | ❌ | ❌ | **Critical** |
| `/task_inventory_nl` | Stock-Linked Ops | workflow | ❌ | ❌ | **Critical** |
| `/inventory_import_csv` | Inventory Data Entry | ✅ | ❌ | ❌ | **Critical** |
| `/suggestion_approve` | Document Processing | workflow | ❌ | ❌ | **High** |
| `/cancel` | Platform Control | ✅ | ❌ | ❌ | **Medium** |

---

## Present in contract — verified aligned

All 25 intents in `intent-types.json` map to real commands/handlers:

`/tasks`, `/assign`, `/depart_assign`, `/mgrassign`, `/mgrself`, `/update`, `/issue`, `/issues`, `/resolve`, `/members`, `/report`, `/help`, `/present`, `/absent`, `/complete`, `/mgrtransfer`, `/mgrreject`, `/onboard_vendor`, `/onboard_worker`, `/inventory_create`, `/inventory_status`, `/purchase_request_create`, `/business_discovery`, `/continue_discovery`, `/assign_clarify`, `general_chat`

---

## Unused / low-use contract elements

| Element | Status |
|---------|--------|
| `discovery_phrases` "import inventory" | Overlaps inventory import — risks wrong route to discovery |
| `discovery_phrases` "import vendors" | No `/import_vendor` command — maps to business_discovery or onboard_vendor |
| `general_chat` | Used; not a slash command — correct |
| `/continue_discovery` | Alias only — not separate handler type |

---

## Misaligned intents (semantic drift)

| Issue | Detail |
|-------|--------|
| **Import phrase → discovery** | `intent-types.json` discovery_phrases includes "import inventory" but correct command is `/inventory_import_csv` |
| **Assign cluster incomplete** | Contract has `/assign`, `/assign_clarify`, `/depart_assign` but not `/assign_delivery` |
| **Inventory cluster incomplete** | Contract has create + status but not import_csv |
| **Workflow without intent** | `TASK_INVENTORY_CREATION` workflow exists; no matching intent in contract |
| **Cancel dual path** | `/cancel` in COMMANDS; workflow uses `WORKFLOW_CANCEL_COMMAND`; ML contract silent |

---

## Capability → contract coverage

| P1 Capability | Required intents | Contract coverage |
|---------------|------------------|-------------------|
| Task Delegation | assign, depart_assign, assign_clarify | ✅ Full |
| Manager Coordination | mgrself, mgrassign, mgrtransfer, mgrreject | ✅ Full |
| Inventory Visibility | inventory_status | ✅ Full |
| Stock-Linked Ops | assign_delivery, task_inventory_nl | ❌ **None** |
| Task Execution | complete, update, issue | ✅ Full |

---

## End-to-end alignment verdict

| Check | Result |
|-------|--------|
| 30 commands documented | ✅ |
| 25/30 in ML contract | ❌ 83% |
| 5 critical gaps | assign_delivery, task_inventory_nl, inventory_import_csv, suggestion_approve, cancel |
| Workflow types ↔ commands | ✅ 8/8 + continue_discovery alias |
| Role matrix ↔ backend | ✅ Matches ensureManager/Worker |
| P1 capabilities fully contracted | ❌ Stock-Linked + Import gaps |

**Overall alignment grade: YELLOW** — core delegation/mgr covered; stock-linked and import paths under-specified.

---

## Recommended contract additions (requirements only — not implementation)

1. Add 5 missing intents to `intent-types.json` and both `INTENT_TYPES` exports.
2. Split or disambiguate `discovery_phrases` for inventory import vs business setup.
3. Document `task_inventory_nl` as NL entry to `TASK_INVENTORY_CREATION` workflow.
4. Add `cancel` with session-context note in contract metadata.
5. Align `bot_engine.py` slash passthrough with full command set.
