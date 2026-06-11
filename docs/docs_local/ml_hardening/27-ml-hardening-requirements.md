# Phase 2 — ML Hardening Requirements

**Document type:** Requirements only — not solutions, not model changes.

---

## REQ-1: Task Delegation

| ID | Requirement |
|----|-------------|
| REQ-1.1 | The system **must** distinguish person assignment (`/assign`) from department assignment (`/depart_assign`). |
| REQ-1.2 | The system **must** route description-only assign requests to `/assign_clarify` or equivalent clarification. |
| REQ-1.3 | The system **must** extract `worker_slug`, `depart_slug`, and `deadline` when present. |
| REQ-1.4 | The system **must not** emit `/assign` for workers. |
| REQ-1.5 | The system **should** support Hinglish assign patterns ("ko do", "ko bolo", "assign karo"). |

---

## REQ-2: Manager Task Coordination

| ID | Requirement |
|----|-------------|
| REQ-2.1 | The system **must** distinguish `/mgrself` (manager accepts) from `/mgrassign` (manager delegates). |
| REQ-2.2 | The system **must** distinguish `/mgrtransfer` (forward to dept) from `/mgrreject` (decline with reason). |
| REQ-2.3 | The system **must** require task id for all mgr* intents. |
| REQ-2.4 | The system **must not** emit mgr* intents for owners or workers. |
| REQ-2.5 | The system **must** extract `reject_reason` and `depart_slug` where applicable. |

---

## REQ-3: Inventory Visibility

| ID | Requirement |
|----|-------------|
| REQ-3.1 | The system **must** distinguish read (`/inventory_status`) from write (`/inventory_create`, `/inventory_import_csv`). |
| REQ-3.2 | The system **must** handle SKU-specific and list (low-stock) queries. |
| REQ-3.3 | The system **must not** route stock quantity questions to `general_chat`. |
| REQ-3.4 | The system **should** extract SKU or item name when mentioned. |

---

## REQ-4: Stock-Linked Operations

| ID | Requirement |
|----|-------------|
| REQ-4.1 | The system **must** distinguish stock-linked tasks from plain `/assign`. |
| REQ-4.2 | The system **must** recognize delivery, dispatch, count, and issue-stock task patterns. |
| REQ-4.3 | The system **must** support NL path (`/task_inventory_nl`) and structured path (`/assign_delivery`). |
| REQ-4.4 | The system **must** extract SKU, quantity, and worker when present. |
| REQ-4.5 | The system **must** enter disambiguation workflow when SKU or worker is ambiguous. |
| REQ-4.6 | Contract **must** include `/assign_delivery` and `/task_inventory_nl` intents. |

---

## REQ-5: Task Execution

| ID | Requirement |
|----|-------------|
| REQ-5.1 | The system **must** distinguish `/complete` from `/update` from `/issue`. |
| REQ-5.2 | The system **must** extract task id for complete and update. |
| REQ-5.3 | The system **must** restrict `/update` to worker role in valid emissions. |
| REQ-5.4 | The system **should** prefer `/issue` for facility-level problems without task id. |

---

## REQ-6: Contract alignment

| ID | Requirement |
|----|-------------|
| REQ-6.1 | ML contract **must** include all 30 commands or document explicit exclusions. |
| REQ-6.2 | Contract **must** add: `/assign_delivery`, `/task_inventory_nl`, `/inventory_import_csv`, `/suggestion_approve`, `/cancel`. |
| REQ-6.3 | `discovery_phrases` **must not** conflate inventory import with business discovery. |
| REQ-6.4 | `bot_engine.py` slash passthrough **must** align with contract intents. |
| REQ-6.5 | Backend `contract-drift.spec.ts` **must** gate future contract changes. |

---

## REQ-7: Role awareness

| ID | Requirement |
|----|-------------|
| REQ-7.1 | Classification **should** accept role context when available. |
| REQ-7.2 | Invalid role×intent pairs **must not** be top-ranked outputs. |
| REQ-7.3 | Role matrix in `22-role-intent-validity-matrix.md` **must** drive evaluation criteria. |

---

## REQ-8: Session awareness

| ID | Requirement |
|----|-------------|
| REQ-8.1 | Active workflow session **must** suppress competing P1 classification. |
| REQ-8.2 | Import review phase **must** treat CONFIRM/CANCEL as session tokens, not intents. |
| REQ-8.3 | `/cancel` **must** be recognized during any multi-step flow. |

---

## REQ-9: Low-confidence handling

| ID | Requirement |
|----|-------------|
| REQ-9.1 | P1 low confidence **must** trigger clarification, not silent `general_chat`. |
| REQ-9.2 | Missing slots **must** trigger targeted follow-up questions. |
| REQ-9.3 | Clarification **must** be bounded to one turn where possible. |

---

## REQ-10: Evaluation readiness (Phase 3 prep)

| ID | Requirement |
|----|-------------|
| REQ-10.1 | Each intent boundary in `21-intent-boundary-specifications.md` **must** have eval cases. |
| REQ-10.2 | Each ambiguity hotspot in `23-ambiguity-analysis.md` **must** have expected outcome defined. |
| REQ-10.3 | P1 capabilities **must** have minimum coverage thresholds defined before benchmarking. |

---

## Requirements traceability

| Requirement group | Phase 1 capability | Phase 2 artifact |
|-------------------|-------------------|------------------|
| REQ-1 | Task Delegation | 20, 21, 23 |
| REQ-2 | Manager Coordination | 20, 21, 22 |
| REQ-3 | Inventory Visibility | 21, 25 |
| REQ-4 | Stock-Linked Ops | 20, 21, 25 |
| REQ-5 | Task Execution | 21, 23 |
| REQ-6 | All | 25 |
| REQ-7 | All | 22 |
| REQ-8 | Workflows | 24 |
| REQ-9 | All P1 | 26 |
| REQ-10 | Phase 3 | 28 |
