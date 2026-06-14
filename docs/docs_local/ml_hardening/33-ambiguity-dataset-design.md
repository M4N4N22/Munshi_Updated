# Phase 3D — Ambiguity Dataset Design

**Source:** `23-ambiguity-analysis.md`  
**Purpose:** Evaluate clarification routing and disambiguation — not just top-1 intent.

---

## Evaluation dimensions

| Dimension | Metric |
|-----------|--------|
| **Routing accuracy** | Correct intent when unambiguous |
| **Clarification trigger** | `assign_clarify` or follow-up when required |
| **Clarification avoidance** | No clarify when assignee/SKU/task id present |
| **Slot extraction** | Correct slots when routing |

---

## Hotspot catalog

### HS-01: "Anil ko ye kaam de do"

| Field | Value |
|-------|-------|
| Utterance types | Hinglish assign, name-first, name-last |
| Competing intents | `/assign`, `/mgrassign` |
| Role variants | owner → assign; manager + task id → mgrassign |
| Expected clarification | None if role clear; ask task id if manager context unclear |
| Cases | 8 |

### HS-02: "Sales ko bolo"

| Field | Value |
|-------|-------|
| Competing intents | `/depart_assign`, `/assign` |
| Expected routing | `/depart_assign` depart_slug=sales |
| Clarification | If task description missing → ask what work |
| Cases | 6 |

### HS-03: "Main kar lunga" / "Main kar lunga task 12"

| Field | Value |
|-------|-------|
| Competing intents | `/mgrself`, `/assign` |
| Expected routing | Manager + task 12 → `/mgrself` id=12 |
| Clarification | Owner saying "main" → atypical; clarify or assign |
| Cases | 8 |

### HS-04: "Priya task 15 do"

| Field | Value |
|-------|-------|
| Competing intents | `/mgrassign`, `/assign` |
| Expected routing | Manager + existing task → mgrassign; new work → assign |
| Clarification | Ask "naya kaam ya task 15?" if context unknown |
| Cases | 8 |

### HS-05: "Stock kitna hai" / "Steel rod kitna bacha"

| Field | Value |
|-------|-------|
| Competing intents | `/inventory_status`, `general_chat` |
| Expected routing | `/inventory_status` — never general_chat |
| Clarification | Ask SKU if list too long (optional) |
| Cases | 10 |

### HS-06: "Stock add karo"

| Field | Value |
|-------|-------|
| Competing intents | `/inventory_create`, `/inventory_import_csv` |
| Expected clarification | **Required** — "ek item ya CSV file?" |
| Expected routing | After clarify → correct intent |
| Cases | 8 |

### HS-07: "Import inventory" / "Inventory import karo"

| Field | Value |
|-------|-------|
| Competing intents | `/inventory_import_csv`, `/business_discovery`, `/inventory_create` |
| Expected routing | `/inventory_import_csv` when stock context |
| Clarification | If business-setup context → discovery |
| Cases | 10 |

### HS-08: "Naya maal jodo"

| Field | Value |
|-------|-------|
| Competing intents | `/inventory_create`, home CTA |
| Expected routing | `/inventory_create` |
| Cases | 5 |

### HS-09: "Deliver 50 cartons" / "Ram ko 50 bolt bhejo"

| Field | Value |
|-------|-------|
| Competing intents | `/task_inventory_nl`, `/assign_delivery`, `/assign` |
| Expected routing | NL with SKU → task_inventory_nl; structured slash → assign_delivery |
| Clarification | Missing worker or SKU → workflow disambiguation |
| Cases | 12 |

### HS-10: "Task 12 done" / "Task 12 half done"

| Field | Value |
|-------|-------|
| Competing intents | `/complete`, `/update` |
| Expected routing | done → complete; half/progress → update |
| Cases | 8 |

### HS-11: "Machine band hai" / "Task 5 blocked"

| Field | Value |
|-------|-------|
| Competing intents | `/issue`, `/update` |
| Expected routing | No task id → issue; task id + blocked → update |
| Cases | 8 |

### HS-12: "Transfer karo" / "Reject karo"

| Field | Value |
|-------|-------|
| Competing intents | `/mgrtransfer`, `/mgrreject`, `/mgrassign` |
| Expected clarification | **Required** — task id + target/reason |
| Cases | 8 |

### HS-13: "Kaam karwa do" / "Kisi ko assign karo"

| Field | Value |
|-------|-------|
| Competing intents | `/assign_clarify`, `/assign` |
| Expected routing | `/assign_clarify` |
| Cases | 8 |

### HS-14: "Purchase karo"

| Field | Value |
|-------|-------|
| Competing intents | `/purchase_request_create`, `general_chat` |
| Expected routing | PR when procurement context |
| Cases | 5 |

### HS-15: "Hello" / "Namaste"

| Field | Value |
|-------|-------|
| Competing intents | `general_chat`, owner home |
| Expected routing | general_chat (backend routes home by role) |
| Cases | 5 |

---

## Ambiguity dataset totals

| Type | Cases |
|------|------:|
| Hotspots HS-01–HS-15 | ~117 |
| Clarification-required subset | 40 |
| Clarification-forbidden subset | 30 |
| Multi-turn clarify sequences (2-turn) | 20 |
| **Total** | **~167** |

---

## Clarification accuracy rubric

| Outcome | Score |
|---------|-------|
| Correct intent without unnecessary clarify | Pass |
| Correct clarify/workflow trigger | Pass |
| Wrong intent, no clarify | **Fail** |
| Clarify when slots complete | **Fail** (over-clarify) |
| general_chat on P1 operational phrase | **Fail** |

---

## JSONL schema (future)

```json
{
  "id": "AMB-HS-06-001",
  "message": "<utterance>",
  "hotspot_id": "HS-06",
  "competing_intents": ["/inventory_create", "/inventory_import_csv"],
  "expected_behavior": "clarify",
  "expected_clarification_prompt": "ek item ya CSV?",
  "expected_intent_after_clarify": null,
  "role": "OWNER"
}
```
