# Phase 2 — Ambiguity Analysis

Phrases that naturally create multi-intent interpretations and expected clarification behavior.

---

## Hotspot phrases

| Phrase (Hinglish) | Candidate intents | Expected resolution |
|-------------------|-------------------|---------------------|
| "Anil ko ye kaam de do" | `/assign`, `/mgrassign` | IF manager + task id → mgrassign. ELSE → `/assign` with worker_slug=anil |
| "Sales ko bolo" | `/depart_assign`, `/assign` | No person → `/depart_assign` depart_slug=sales |
| "Main kar lunga" | `/mgrself`, `/assign` (self?) | Manager + task id → `/mgrself`. Owner saying self → unusual; prefer `/assign` to self if supported else clarify |
| "Main kar lunga task 12" | `/mgrself` | `/mgrself` id=12 |
| "Priya task 15 do" | `/mgrassign`, `/assign` | Manager + existing task → `/mgrassign`. New work → `/assign` |
| "Stock kitna hai" | `/inventory_status`, `general_chat` | `/inventory_status` (list if no SKU) |
| "Steel rod kitna bacha" | `/inventory_status` | `/inventory_status` + SKU extraction |
| "Stock add karo" | `/inventory_create`, `/inventory_import_csv` | Single vs bulk ambiguous → **clarify** or ask "ek item ya CSV?" |
| "Import inventory" | `/inventory_import_csv`, `/business_discovery` | Mutation → `/inventory_import_csv`. discovery_phrases overlap → prefer import if stock context |
| "Inventory import karo" | `/inventory_import_csv`, `/inventory_create` | Bulk verb → `/inventory_import_csv` |
| "Naya maal jodo" | `/inventory_create`, home CTA | `/inventory_create` workflow |
| "Deliver 50 cartons" | `/assign_delivery`, `/task_inventory_nl`, `/assign` | SKU missing → `/task_inventory_nl` workflow. SKU present → stock-linked |
| "Ram ko 50 bolt bhejo" | `/assign_delivery`, `/task_inventory_nl` | `/task_inventory_nl` (NL path) |
| "Task 12 done" | `/complete`, `/update` | Completion → `/complete` |
| "Task 12 half done" | `/update`, `/complete` | Progress → `/update` |
| "Machine band hai" | `/issue`, `/update` | No task id → `/issue` |
| "Task 5 blocked" | `/update`, `/issue` | Task-scoped → `/update` with blocker note |
| "Transfer karo" | `/mgrtransfer`, `/mgrassign` | Needs task id + dept → `/mgrtransfer` else clarify |
| "Reject karo" | `/mgrreject` | Needs task id + reason |
| "Kaam karwa do" | `/assign_clarify`, `/assign` | No assignee → `/assign_clarify` |
| "Kisi ko assign karo" | `/assign_clarify` | Explicit clarify trigger |
| "Purchase karo" | `/purchase_request_create`, `general_chat` | Stock context → PR workflow |
| "Hello" / "Namaste" | `general_chat`, owner home | Owner/manager → home menu. Worker → hints |

---

## When `/assign_clarify` must be invoked

| Trigger | Condition |
|---------|-----------|
| **T1** | Assign intent + task description + **no** worker_slug + **no** @mention |
| **T2** | ML confidence low on assignee AND high on assign action |
| **T3** | Backend `/assign` handler receives description-only (already routes to clarify) |
| **T4** | Phrases: "kaam karwa do", "kisi ko bolo", "assign karo" without name |
| **T5** | Multiple worker matches for same first name (backend ambiguity — clarify list) |

**Do NOT invoke assign_clarify when:**

- `@mention` or `worker_slug` present
- Department-only routing (`depart_assign`)
- Manager delegating existing task (`mgrassign` with task id)
- Stock-linked path (`assign_delivery` / `task_inventory_nl`)

---

## Clarification strategies (business-first)

| Ambiguity type | Preferred behavior |
|----------------|-------------------|
| Missing assignee | Route to `/assign_clarify` workflow |
| Missing task id (mgr*) | Ask "kaunsa task number?" — do not guess |
| Missing SKU (delivery) | Route to `/task_inventory_nl` disambiguation |
| create vs import | Ask "ek item ya CSV file?" |
| complete vs update | Prefer `/update` if progress words present; else `/complete` |
| Low confidence any P1 | Ask one targeted follow-up — do not silently `general_chat` |

---

## Session-aware ambiguity

When **active workflow session** exists:

| User message | Expected routing |
|--------------|------------------|
| Slash command (known) | `processCommand` — may cancel/replace session |
| `/cancel` | Cancel session |
| Free text | `handleActiveWorkflowMessage` — **not** re-classify to new intent |
| `CONFIRM` / `CANCEL` (import review) | Import session handler — not ML |

**ML implication:** Active session should suppress competing intent classification for P1 clusters unless explicit slash bypass.

---

## Ambiguity severity ranking

| Rank | Phrase cluster | Risk |
|------|----------------|------|
| 1 | Stock add / import / create | Wrong mutation path |
| 2 | Assign vs mgrassign vs mgrself | Wrong person owns work |
| 3 | Delivery NL vs plain assign | Stock not tracked |
| 4 | complete vs update | Wrong task state |
| 5 | issue vs update | Wrong record type |
