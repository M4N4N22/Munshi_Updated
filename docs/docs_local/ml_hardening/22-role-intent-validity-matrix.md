# Phase 2 — Role × Intent Validity Matrix

**Roles:** `OWNER`, `MANAGER`, `WORKER`  
**Legend:** ✅ Allowed | ⚠️ Conditionally allowed | ❌ Not allowed  
**ML note:** Classification is role-agnostic today; backend enforces. Matrix defines **expected valid emissions** for future ML routing context.

---

## Full command matrix

| Command | Owner | Manager | Worker | Rationale |
|---------|:-----:|:-------:|:------:|-----------|
| `/present` | ✅ | ✅ | ✅ | Universal attendance |
| `/absent` | ✅ | ✅ | ✅ | Universal attendance |
| `/tasks` | ✅ | ✅ | ✅ | Role-formatted list |
| `/complete` | ✅ | ✅ | ✅ | Any assigned user may complete |
| `/help` | ✅ | ✅ | ✅ | Universal |
| `/cancel` | ✅ | ✅ | ✅ | Universal workflow escape |
| `/issue` | ✅ | ✅ | ✅ | Anyone can report problems |
| `/update` | ❌ | ❌ | ✅ | `ensureWorker` — worker-only |
| `/assign` | ✅ | ✅ | ❌ | `ensureManager` |
| `/assign_clarify` | ✅ | ✅ | ❌ | Workflow: owner/manager only |
| `/depart_assign` | ✅ | ✅ | ❌ | `ensureManager` |
| `/assign_delivery` | ✅ | ✅ | ❌ | `ensureManager` |
| `/task_inventory_nl` | ✅ | ✅ | ❌ | Orchestrator rejects workers |
| `/mgrself` | ❌ | ✅ | ❌ | Manager routing pipeline |
| `/mgrassign` | ❌ | ✅ | ❌ | Manager routing pipeline |
| `/mgrtransfer` | ❌ | ✅ | ❌ | Manager routing pipeline |
| `/mgrreject` | ❌ | ✅ | ❌ | Manager routing pipeline |
| `/issues` | ✅ | ✅ | ❌ | `ensureManager` |
| `/resolve` | ✅ | ✅ | ❌ | `ensureManager` |
| `/members` | ✅ | ✅ | ❌ | `ensureManager` |
| `/report` | ✅ | ✅ | ❌ | `ensureManager` |
| `/inventory_status` | ✅ | ✅ | ❌ | `ensureManager` |
| `/inventory_create` | ✅ | ✅ | ❌ | Workflow: `ensureCanRunWorkflow` |
| `/inventory_import_csv` | ✅ | ✅ | ❌ | `ensureManager` |
| `/purchase_request_create` | ✅ | ✅ | ❌ | Workflow: owner/manager |
| `/onboard_worker` | ✅ | ✅ | ❌ | Workflow: owner/manager |
| `/onboard_vendor` | ✅ | ✅ | ❌ | Workflow: owner/manager |
| `/business_discovery` | ✅ | ✅ | ❌ | Workflow: owner/manager |
| `/continue_discovery` | ✅ | ✅ | ❌ | Same as discovery |
| `/suggestion_approve` | ✅ | ✅ | ❌ | Workflow: owner/manager |
| `general_chat` | ✅ | ✅ | ✅ | Universal fallback |

---

## Conditional allowances

| Command | Condition | Roles |
|---------|-----------|-------|
| `/mgrself` | Task must be owner-assigned to manager's department | Manager only |
| `/mgrassign` | Manager must have authority over target worker | Manager only |
| `/assign` | Manager may assign within factory authority scope | Owner, Manager |
| `/complete` | User must be assignee or have task access | All (backend task check) |
| `/cancel` | Meaningful only when active session exists | All |
| `/suggestion_approve` | Only when document suggestion pending | Owner, Manager |

---

## ML routing implications

| Finding | Recommendation |
|---------|----------------|
| Worker emitting `/assign` | Invalid — should not classify; backend rejects |
| Owner emitting `/mgrself` | Invalid — manager-only intent |
| Worker emitting `/inventory_status` | Invalid — backend rejects |
| Manager emitting `/assign` AND `/mgrassign` | Both valid — context disambiguates (new vs existing task) |
| All roles → `general_chat` | Valid — role determines response content, not intent |

---

## Role-specific intent subsets (for evaluation)

| Role | Valid intent set size | Excluded intents |
|------|----------------------:|------------------|
| Worker | 9 + general_chat | assign*, mgr*, inventory*, onboard*, report, members, issues, resolve |
| Manager | 28 + general_chat | mgr* only for managers; update excluded |
| Owner | 27 + general_chat | mgr*, update excluded |

**Note:** Owner and Manager share most intents; Manager adds `/mgr*`; neither gets `/update`.

---

## Future ML routing context (spec only)

When role is known at classify time:

1. Down-rank invalid intents for role to near-zero.
2. Boost `/mgr*` only when `role=MANAGER` and task-id patterns present.
3. Boost `/update` only when `role=WORKER`.
4. Never suppress `general_chat` entirely — valid escape hatch.
