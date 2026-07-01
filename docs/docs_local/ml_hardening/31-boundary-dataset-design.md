# Phase 3B — Boundary Test Dataset Design

**Source:** `21-intent-boundary-specifications.md`  
**Output format (future):** JSONL with fields: `id`, `message`, `role`, `expected_intent`, `expected_slots`, `category`, `boundary_pair`, `notes`  
**This document:** Structure and coverage targets only — no utterances.

---

## Example type definitions

| Category | Purpose | Pass criterion |
|----------|---------|----------------|
| **Positive** | Clear unambiguous intent A | `predicted_intent == A` |
| **Negative** | Clearly intent B when model might pick A | `predicted_intent == B` |
| **Adversarial** | Minimal cue flip (one word changes intent) | Correct side of pair |
| **Near-miss** | Colloquial overlap, valid human interpretation | Correct per boundary rule |

---

## Cluster A: Delegation

### Pair A1: `/assign` vs `/depart_assign`

| Category | Target count | Description |
|----------|-------------|-------------|
| Positive (assign) | 8 | @mention or person name + task |
| Positive (depart) | 8 | Dept slug/name, no person |
| Negative | 6 | Cross-labeled traps |
| Adversarial | 6 | "sales ko" vs "sales team ko @ram" |
| Near-miss | 6 | "IT ko bolo machine fix" |
| **Subtotal** | **34** | |

### Pair A2: `/assign` vs `/assign_clarify`

| Category | Target count |
|----------|-------------|
| Positive (assign) | 6 |
| Positive (clarify) | 8 |
| Negative | 5 |
| Adversarial | 5 |
| Near-miss | 6 |
| **Subtotal** | **30** |

### Pair A3: `/assign` vs `/assign_delivery` vs `/task_inventory_nl`

| Category | Target count |
|----------|-------------|
| Positive (assign) | 6 |
| Positive (delivery slash) | 6 |
| Positive (task_inventory_nl) | 10 |
| Negative | 8 |
| Adversarial | 8 |
| Near-miss | 8 |
| **Subtotal** | **46** |

---

## Cluster B: Manager coordination

### Pair B1: `/mgrself` vs `/mgrassign`

| Category | Target count | Role constraint |
|----------|-------------|-----------------|
| Positive (mgrself) | 8 | manager |
| Positive (mgrassign) | 8 | manager |
| Negative | 6 | |
| Adversarial | 8 | "main" vs "ram" swap |
| Near-miss | 6 | |
| **Subtotal** | **36** | |

### Pair B2: `/mgrtransfer` vs `/mgrreject`

| Category | Target count |
|----------|-------------|
| Positive (transfer) | 8 |
| Positive (reject) | 8 |
| Negative | 6 |
| Adversarial | 6 |
| Near-miss | 6 |
| **Subtotal** | **34** |

### Pair B3: `/mgrassign` vs `/assign`

| Category | Target count |
|----------|-------------|
| Positive (mgrassign) | 8 | task id required |
| Positive (assign) | 8 | new work |
| Negative | 6 |
| Adversarial | 6 |
| Near-miss | 6 |
| **Subtotal** | **34** |

---

## Cluster C: Inventory

### Pair C1: `/inventory_status` vs `/inventory_create`

| Category | Target count |
|----------|-------------|
| Positive (status) | 10 |
| Positive (create) | 8 |
| Negative | 6 |
| Adversarial | 6 |
| Near-miss | 6 |
| **Subtotal** | **36** |

### Pair C2: `/inventory_create` vs `/inventory_import_csv`

| Category | Target count |
|----------|-------------|
| Positive (create) | 8 |
| Positive (import) | 10 |
| Negative | 6 |
| Adversarial | 6 |
| Near-miss | 6 |
| **Subtotal** | **36** |

### Pair C3: `/inventory_status` vs `/inventory_import_csv`

| Category | Target count |
|----------|-------------|
| Positive (status) | 8 |
| Positive (import) | 8 |
| Negative | 6 |
| Adversarial | 4 |
| **Subtotal** | **26** |

---

## Cluster D: Execution

### Pair D1: `/complete` vs `/update`

| Category | Target count | Role |
|----------|-------------|------|
| Positive (complete) | 8 | all |
| Positive (update) | 8 | worker |
| Negative | 6 | |
| Adversarial | 6 | "done" vs "half done" |
| Near-miss | 6 | |
| **Subtotal** | **34** | |

### Pair D2: `/complete` vs `/issue`

| Category | Target count |
|----------|-------------|
| Positive (complete) | 6 |
| Positive (issue) | 8 |
| Negative | 5 |
| Adversarial | 5 |
| **Subtotal** | **24** |

### Pair D3: `/update` vs `/issue`

| Category | Target count |
|----------|-------------|
| Positive (update) | 8 |
| Positive (issue) | 8 |
| Negative | 5 |
| Adversarial | 5 |
| **Subtotal** | **26** |

---

## Boundary dataset totals

| Cluster | Pairs | Target cases |
|---------|------:|-------------:|
| A Delegation | 3 | 110 |
| B Manager | 3 | 104 |
| C Inventory | 3 | 98 |
| D Execution | 3 | 84 |
| **Total** | **12** | **~396** |

---

## JSONL schema (future)

```json
{
  "id": "BOUND-A1-POS-001",
  "message": "<utterance>",
  "role": "OWNER|MANAGER|WORKER|null",
  "boundary_pair": "assign|depart_assign",
  "category": "positive|negative|adversarial|near_miss",
  "expected_intent": "/depart_assign",
  "expected_slots": { "depart_slug": "sales" },
  "session_context": null,
  "language": "hinglish|english|hindi|broken",
  "tags": ["p1", "delegation"]
}
```

---

## Acceptance criteria (Phase 4 gate)

- All 12 boundary pairs represented
- Each pair ≥24 cases
- Adversarial ≥20% of pair total
- Role specified for manager-only pairs
