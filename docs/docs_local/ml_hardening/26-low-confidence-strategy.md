# Phase 2 — Low-Confidence Strategy (Business-First)

What should happen when ML confidence is low — per P1 capability. **No implementation.**

---

## Global principles

| Principle | Rule |
|-----------|------|
| **P1 never silent-fail to general_chat** | Operational phrases deserve clarification |
| **Prefer one follow-up question** | Over wrong routing |
| **Respect active sessions** | Do not re-classify mid-workflow |
| **Role-invalid intents** | Clarify or reject — not backend error |
| **Slash explicit** | User slash commands bypass ML — always honor |

---

## Per-capability strategies

### 1. Task Delegation

| Confidence | Behavior |
|------------|----------|
| High | Route to `/assign` or `/depart_assign` with extracted slots |
| Medium | If assignee unclear → `/assign_clarify`. If dept vs person unclear → ask "kis ko ya kis department ko?" |
| Low | Ask: "Kis ko assign karna hai aur kya kaam hai?" — do not `general_chat` |
| Wrong role (worker) | "Yeh command sirf owner/manager ke liye hai" |

**Never:** Create task with guessed assignee at low confidence.

---

### 2. Manager Task Coordination

| Confidence | Behavior |
|------------|----------|
| High | Route to correct mgr* with task id + slots |
| Medium | If task id missing → ask task number. If self vs delegate unclear → ask "aap khud karenge ya kisi worker ko?" |
| Low | Ask: "Kaunsa task number aur kya karna hai — accept, delegate, transfer, ya reject?" |
| Wrong role (owner/worker) | Reject mgr* intent; suggest `/assign` for owner |

**Never:** Default mgrself vs mgrassign without self/other signal.

---

### 3. Inventory Visibility

| Confidence | Behavior |
|------------|----------|
| High | `/inventory_status` with SKU if extracted |
| Medium | No SKU → list low-stock (valid backend behavior) |
| Low | Ask: "Kis item ka stock dekhna hai?" |
| Confused with create/import | Ask: "Dekhna hai, add karna hai, ya CSV import?" |

**Never:** Route stock questions to `general_chat`.

---

### 4. Stock-Linked Operations

| Confidence | Behavior |
|------------|----------|
| High | `/assign_delivery` (structured) or `/task_inventory_nl` (NL) |
| Medium | SKU or worker ambiguous → enter task_inventory workflow disambiguation |
| Low | Ask: "Kaunsa item, kitni quantity, aur kis ko deliver karna hai?" |
| Missing from contract today | **Critical:** Until contracted, treat as high-risk — prefer workflow over plain `/assign` |

**Never:** Plain `/assign` when SKU+qty+delivery verbs present.

---

### 5. Task Execution

| Confidence | Behavior |
|------------|----------|
| High | `/complete`, `/update`, or `/issue` per boundary rules |
| Medium | If task id missing → ask "kaunsa task number?" |
| Low | Ask: "Task complete hua, update dena hai, ya koi problem report karni hai?" |
| Worker vs manager on `/update` | Workers only — managers should use `/complete` or delegate |

**Never:** `/complete` and `/update` for same utterance without disambiguation.

---

## Strategy selection matrix

| Situation | Recommended action |
|-----------|-------------------|
| Missing required slot (task id, SKU) | **Ask follow-up** |
| Assignee ambiguous | **Route to assign_clarify workflow** |
| Inventory mutate vs read | **Ask follow-up** |
| Active workflow session | **Route to workflow handler** (not classify) |
| Social greeting only | **general_chat** or owner home |
| Truly off-topic | **general_chat** |
| Role-invalid intent | **Reject with role hint** |
| Confidence below threshold on P1 | **Clarify** — not general_chat |

---

## Confidence tiers (business definition)

| Tier | Definition | P1 action |
|------|------------|-----------|
| High | Clear verb + slots + role-valid | Execute intent |
| Medium | Clear intent family, missing/ambiguous slot | One clarifying question or workflow |
| Low | Multiple competing P1 intents | Structured choice prompt |
| None | No operational signal | `general_chat` acceptable |

---

## Anti-patterns to avoid

1. Low confidence → `general_chat` for "stock kitna hai"
2. Low confidence → `/assign` without assignee
3. Low confidence → `/mgrassign` without task id
4. Re-classifying during CONFIRM/import review
5. Ignoring role when emitting mgr* for owners
