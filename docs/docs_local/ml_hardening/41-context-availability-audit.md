# Phase 3.5 — Context Availability Audit

What the classifier receives vs what exists in backend at routing time.

| Context | At `/classify` | At backend routing | Notes |
|---------|:--------------:|:------------------:|-------|
| **Role** (OWNER/MANAGER/WORKER) | ❌ Absent | ✅ Available (`usersService`) | Enforced post-ML only |
| **Department** | ❌ Absent | ✅ User's dept link | Not passed to ML |
| **Factory ID** | ❌ Absent | ✅ From user.factory_links | Not passed to ML |
| **Active workflow** | ❌ Absent | ✅ `workflow_sessions` | Backend suppresses classify when session active (except slash bypass) |
| **Import CSV session** | ❌ Absent | ✅ In-memory `pendingByPhone` | Handled before ML |
| **Conversation history** | ❌ Absent | ❌ Not stored | Single-turn only |
| **Task context** (open tasks) | ❌ Absent | ✅ In DB | ML infers task id from text only |
| **Inventory context** (SKUs) | ❌ Absent | ✅ In DB | task-inventory path resolves after extract |
| **Low-stock alert context** | ❌ Absent | ✅ `lowStockAlertContext` | CTA bypasses ML |
| **Phone / user id** | ❌ Absent | ✅ `body.from` | Not sent to ML |
| **Message text** | ✅ Present | ✅ Present | Only universal input |
| **Deadline extraction** | ✅ Partial | ✅ Passed through | DateTimeExtractor in ML |

---

## Partial availability

| Item | Detail |
|------|--------|
| Task ID in message | Extracted by regex in ML (`extract_task_id`, `_extract_mgr_task_id`) — not validated against DB |
| worker_slug | Extracted from text — resolved to user in backend |
| depart_slug | Limited to 4 slugs in `VALID_DEPARTMENTS` |
| task_description | Only for assign_clarify path |

---

## Backend-only context (never sent to ML)

1. Business readiness snapshot (owner home)
2. Active session `current_step`
3. Prefill data for purchase requests
4. Document suggestion pending state
5. Team/inventory awaiting CSV flags

---

## Implication

ML operates as a **stateless, role-blind, single-message** classifier. All session and role semantics are **downstream** in NestJS.
