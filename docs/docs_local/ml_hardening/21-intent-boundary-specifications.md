# Phase 2 — Intent Boundary Specifications

Formal rules for what ML must distinguish. **Not** training data.

---

## Cluster A: Delegation intents

### A1: `/assign` vs `/depart_assign`

| Field | `/assign` | `/depart_assign` |
|-------|-----------|------------------|
| **Intent** | Assign to a **person** | Assign to a **department** |
| **Key distinction** | `worker_slug` or `@mention` | `depart_slug` or department name; no person |
| **Confusion patterns** | "sales ko bolo" (dept as recipient) | "IT team" without @person |
| **Expected behavior** | Create task assigned to resolved user | Create task for department queue |
| **Boundary rule** | IF person token OR @mention → `/assign`. IF department slug/name AND NO person → `/depart_assign`. |

### A2: `/assign` vs `/assign_clarify`

| Field | `/assign` | `/assign_clarify` |
|-------|-----------|-------------------|
| **Intent** | Direct assign with known assignee | Guided pick when assignee unknown |
| **Key distinction** | Assignee resolvable | Description only |
| **Confusion patterns** | "ye kaam karwa do" | "kisi ko assign karo" |
| **Expected behavior** | Immediate task creation | Start ASSIGNEE workflow |
| **Boundary rule** | IF assignee identifiable → `/assign`. IF action verb + task description WITHOUT assignee → `/assign_clarify`. Backend also triggers clarify from `/assign` handler when description-only. |

### A3: `/assign` vs `/assign_delivery` vs `/task_inventory_nl`

| Field | `/assign` | `/assign_delivery` | `/task_inventory_nl` |
|-------|-----------|-------------------|----------------------|
| **Intent** | Generic task | Structured stock-linked task | NL stock-linked task |
| **Key distinction** | No SKU/qty | `@worker SKU qty` slash form | NL + task_kind extraction |
| **Confusion patterns** | "deliver cartons" without SKU | Same utterance as NL path | "Ram ko 50 bolt bhejo" |
| **Expected behavior** | Plain task | Immediate structured create | Workflow with disambiguation |
| **Boundary rule** | IF SKU/item + quantity + delivery/dispatch verbs → stock-linked (`/assign_delivery` or `/task_inventory_nl`). IF no inventory signals → `/assign`. Prefer `/task_inventory_nl` for NL; `/assign_delivery` for explicit slash. |

---

## Cluster B: Manager coordination intents

### B1: `/mgrself` vs `/mgrassign`

| Field | `/mgrself` | `/mgrassign` |
|-------|------------|--------------|
| **Intent** | Manager accepts task personally | Manager delegates to worker |
| **Key distinction** | First person ("main", "I will") | Third person / worker name |
| **Confusion patterns** | "main kar lunga task 12" | "Priya ko task 12 do" |
| **Expected behavior** | Manager becomes executor | Worker assigned |
| **Boundary rule** | IF self-reference + task id → `/mgrself`. IF worker_slug/name + task id → `/mgrassign`. NEVER for Owner role (backend blocks). |

### B2: `/mgrtransfer` vs `/mgrreject`

| Field | `/mgrtransfer` | `/mgrreject` |
|-------|----------------|--------------|
| **Intent** | Send to another department | Decline ownership; escalate to owner |
| **Key distinction** | Valid target `depart_slug` | Rejection reason; no forward target |
| **Confusion patterns** | "galat dept, sales ko bhejo" | "hamara kaam nahi", "reject" |
| **Expected behavior** | Task moves to dept | Owner notified with reason |
| **Boundary rule** | IF department target + transfer verbs → `/mgrtransfer`. IF rejection/scope/out-of-dept WITHOUT forward dept → `/mgrreject`. |

### B3: `/mgrassign` vs `/assign`

| Field | `/mgrassign` | `/assign` |
|-------|--------------|-----------|
| **Intent** | Manager delegates **existing** owner task | Owner/manager creates **new** task |
| **Key distinction** | Requires owner-assigned task id in mgr pipeline | New assignment from description |
| **Confusion patterns** | "Priya ko task 15 do" (manager context) | "Priya ko machine saaf karo" (new work) |
| **Expected behavior** | Mutate existing task #id | Create new task |
| **Boundary rule** | IF task id + manager routing context → `/mgrassign`. IF new work description without mgr-task context → `/assign`. Role + task ownership validation is backend; ML should extract task id when present. |

---

## Cluster C: Inventory intents

### C1: `/inventory_status` vs `/inventory_create`

| Field | `/inventory_status` | `/inventory_create` |
|-------|---------------------|---------------------|
| **Intent** | Read stock level | Add new item (workflow) |
| **Key distinction** | Question verbs: kitna, how much, status | Mutation verbs: add, create, naya, jodo |
| **Confusion patterns** | "steel ka stock" (ambiguous) | "naya item add karo" |
| **Expected behavior** | Return quantity or low-stock list | Start INVENTORY_CREATE workflow |
| **Boundary rule** | IF interrogative / lookup → `/inventory_status`. IF create/add/new item → `/inventory_create`. |

### C2: `/inventory_create` vs `/inventory_import_csv`

| Field | `/inventory_create` | `/inventory_import_csv` |
|-------|---------------------|---------------------------|
| **Intent** | Single item step-by-step | Bulk CSV session |
| **Key distinction** | One SKU conversational | bulk, CSV, import, Zoho, export |
| **Confusion patterns** | "stock add karo" (ambiguous) | "import inventory" in discovery_phrases |
| **Expected behavior** | Workflow steps | Session: upload → review → CONFIRM |
| **Boundary rule** | IF bulk/import/CSV/Zoho/file → `/inventory_import_csv`. IF single item → `/inventory_create`. |

### C3: `/inventory_status` vs `/inventory_import_csv`

| Field | `/inventory_status` | `/inventory_import_csv` |
|-------|---------------------|---------------------------|
| **Intent** | Query | Bulk load |
| **Key distinction** | No file; question | File upload path; import verbs |
| **Confusion patterns** | discovery phrase "import inventory" | |
| **Expected behavior** | Read-only | Mutating session |
| **Boundary rule** | Never confuse; "import" is NEVER status. |

---

## Cluster D: Execution intents

### D1: `/complete` vs `/update`

| Field | `/complete` | `/update` |
|-------|-------------|-----------|
| **Intent** | Mark task finished | Append progress note |
| **Key distinction** | Terminal: done, complete, ho gaya | Ongoing: progress, update, chal raha |
| **Confusion patterns** | "task 12 done" | "task 12 half done" |
| **Expected behavior** | Close task | Log update on task |
| **Boundary rule** | IF completion semantics → `/complete`. IF ongoing/progress → `/update`. Worker role only for `/update`. |

### D2: `/complete` vs `/issue`

| Field | `/complete` | `/issue` |
|-------|-------------|----------|
| **Intent** | Finish assigned work | Report operational problem |
| **Key distinction** | References task id + completion | Problem description; may lack task id |
| **Confusion patterns** | "machine fix ho gaya" (complete?) | "machine band hai" |
| **Expected behavior** | Task closed | Issue ticket created |
| **Boundary rule** | IF task id + done → `/complete`. IF breakdown/blocker/safety → `/issue`. |

### D3: `/update` vs `/issue`

| Field | `/update` | `/issue` |
|-------|-----------|----------|
| **Intent** | Task-scoped progress | Factory-scoped problem |
| **Key distinction** | Tied to assigned task | General operational issue |
| **Confusion patterns** | "task 5 blocked" | "line 2 stopped" |
| **Expected behavior** | Update on task #id | New issue record |
| **Boundary rule** | IF task id + progress → `/update`. IF no task id OR facility-level problem → `/issue`. |

---

## Global boundary principles

1. **Person > department > clarify** — resolve assignee type before task creation.
2. **Read vs write** — inventory questions never mutate.
3. **Stock signals elevate to stock-linked** — SKU + quantity + movement verbs bypass plain assign.
4. **Manager verbs require task id** — mgr* cluster needs numeric task reference.
5. **Role is backend-enforced** — ML should still avoid emitting invalid role×intent pairs.
