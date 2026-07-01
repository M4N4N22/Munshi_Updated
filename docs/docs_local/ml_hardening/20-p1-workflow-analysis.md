# Phase 2 — P1 Capability Workflow Analysis

**Date:** 2026-06-10  
**Scope:** Five Priority-1 capabilities — owner → manager → worker swimlanes and decision points

---

## 1. Task Delegation

### Swimlane

```
OWNER                          MANAGER                      WORKER
  │                               │                            │
  ├─ NL or /assign @person desc   │                            │
  ├─ NL or /depart_assign dept    │                            │
  ├─ Ambiguous NL ────────────────┼──► /assign_clarify workflow │
  │   (no @mention)               │    (pick assignee)           │
  │                               ├─ /assign @worker desc        │
  │                               │                            │
  │                               ├─ Task created ────────────►│ /tasks
  │                               │                            ├─ /update
  │                               │                            └─ /complete
```

### Decision points

| # | Decision | Signals | Route |
|---|----------|---------|-------|
| D1 | Person vs department target | `@mention` or `worker_slug` vs `depart_slug` / dept name | `/assign` vs `/depart_assign` |
| D2 | Assignee known? | Description only, no worker | `/assign_clarify` workflow |
| D3 | Deadline present? | datetime extraction | attach to task |
| D4 | Role authorized? | Owner/Manager only | backend `ensureManager` |

### Terminal states

- Task created → worker inbox
- Assign clarify cancelled → no task
- Invalid format → error template with examples

---

## 2. Manager Task Coordination

### Swimlane

```
OWNER                          MANAGER (dept head)          WORKER
  │                               │                            │
  ├─ Creates dept-level task ─────►│ /tasks (owner-assigned)    │
  │                               │                            │
  │                               ├─ /mgrself [id] ───────────►│ (manager executes)
  │                               ├─ /mgrassign [id] @w ──────►│ /tasks
  │                               ├─ /mgrtransfer [id] dept    │ (other dept)
  │                               └─ /mgrreject [id] reason ──►│ owner notified
```

### Decision points

| # | Decision | Signals | Route |
|---|----------|---------|-------|
| D1 | Self vs delegate | "main karunga", "I'll do" vs worker name | `/mgrself` vs `/mgrassign` |
| D2 | Wrong dept vs reject | dept slug present vs rejection reason | `/mgrtransfer` vs `/mgrreject` |
| D3 | Task ID present? | numeric id in message | required for all mgr* |
| D4 | Actor is manager? | role + task assigned to their dept | backend validation |

### Terminal states

- Task reassigned to worker
- Task transferred to another department queue
- Task rejected → owner escalation
- Manager self-accepts → manager owns execution

---

## 3. Inventory Visibility

### Swimlane

```
OWNER                          MANAGER                      WORKER
  │                               │                            │
  ├─ /inventory_status [sku]      ├─ same                      │ (not allowed)
  ├─ /inventory_status (no sku)   ├─ low-stock list            │
  │   → low-stock summary         │                            │
  │                               │                            │
  └─ Low-stock CTA ───────────────┴─► /purchase_request_create  │
      (procurement bridge)                                       │
```

### Decision points

| # | Decision | Signals | Route |
|---|----------|---------|-------|
| D1 | Lookup vs list | SKU token present vs "stock dikhao" | single SKU vs low-stock list |
| D2 | Read vs mutate intent | "kitna hai" vs "add karo" | `/inventory_status` vs create/import |
| D3 | Stock exists? | SKU found in DB | status message vs not-found |

### Terminal states

- Quantity returned for SKU
- Low-stock list returned
- SKU not found → guidance to `/inventory_create`

---

## 4. Stock-Linked Operations

### Swimlane

```
OWNER                          MANAGER                      WORKER
  │                               │                            │
  ├─ /assign_delivery @w sku qty  ├─ same                       │
  ├─ NL "deliver 50 bolts" ───────┼─► /task_inventory_nl        │
  │   (free-text path)            │    workflow                 │
  │                               │                            │
  │                               ├─ Task w/ inventory meta ──►│ /tasks
  │                               │                            ├─ /complete
  │                               │                            │   → stock movement
```

### Decision points

| # | Decision | Signals | Route |
|---|----------|---------|-------|
| D1 | Structured vs NL | slash + SKU + qty vs free text | `/assign_delivery` vs `/task_inventory_nl` |
| D2 | Task kind | deliver / count / issue (ML extract) | workflow disambiguation steps |
| D3 | Worker resolved? | single vs multiple matches | WAITING_WORKER_SELECTION |
| D4 | SKU resolved? | single vs multiple inventory | WAITING_INVENTORY_SELECTION |
| D5 | Stock-linked vs plain task | SKU/qty in utterance | stock-linked vs `/assign` |

### Terminal states

- Task created with inventory line → completion may stock-out
- Workflow cancelled/expired
- Blocking message if SKU or worker not found

---

## 5. Task Execution

### Swimlane

```
OWNER                          MANAGER                      WORKER
  │                               │                            │
  │                               ├─ /complete [id]            ├─ /complete [id]
  │                               ├─ /update [id] msg (if worker role) │
  │                               │                            ├─ /update [id] msg
  │                               │                            │
  ├─ /issues, /resolve            ├─ oversight                 ├─ /issue (report)
```

### Decision points

| # | Decision | Signals | Route |
|---|----------|---------|-------|
| D1 | Done vs in-progress | "complete", "ho gaya" vs "progress", "chal raha" | `/complete` vs `/update` |
| D2 | Problem vs progress | "machine band" vs "half done" | `/issue` vs `/update` |
| D3 | Task ID resolvable? | number in message | required for complete/update |
| D4 | Inventory on task? | task has inventory lines | stock movement on complete |

### Terminal states

- Task marked complete (optional inventory movement)
- Update appended to task audit trail
- Issue created (separate from task)

---

## Cross-capability decision summary

| Junction | Capabilities involved | Critical distinction |
|----------|----------------------|----------------------|
| "Anil ko kaam do" | Delegation vs Manager coord | Owner assigns vs manager delegates existing task |
| "50 bolt deliver karo" | Delegation vs Stock-linked | SKU/qty implies stock-linked |
| "stock kitna" | Visibility vs Data entry | question vs mutation |
| "task 12 done" | Execution vs Issue | complete vs problem report |
