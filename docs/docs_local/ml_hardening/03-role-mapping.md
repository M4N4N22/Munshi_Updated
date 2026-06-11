# Phase 3 — Role Mapping

**Roles:** `OWNER`, `MANAGER`, `WORKER` (`users.constants.ts`)

## Access model

- `ensureManager(role)` — blocks WORKER (Owner + Manager allowed)
- `ensureWorker(role)` — WORKER only (blocks Owner/Manager for `/update`)
- `isOwnerOrManagerRole` — home menu, inventory, most admin flows
- Workflows validate via session context (phone → user → factory link)

## Command × role matrix

| Command | Owner | Manager | Worker |
|---------|:-----:|:-------:|:------:|
| /present, /absent | ✓ | ✓ | ✓ |
| /tasks, /complete | ✓ | ✓ | ✓ |
| /issue | ✓ | ✓ | ✓ |
| /help | ✓ | ✓ | ✓ |
| /cancel | ✓ | ✓ | ✓ |
| /update | | | ✓ |
| /assign, /depart_assign, /assign_delivery | ✓ | ✓ | |
| /mgrself, /mgrassign, /mgrtransfer, /mgrreject | | ✓ | |
| /issues, /resolve, /members, /report | ✓ | ✓ | |
| /inventory_*, /onboard_*, /purchase_* | ✓ | ✓ | |
| /business_discovery, /continue_discovery | ✓ | ✓ | |
| /suggestion_approve | ✓ | ✓ | |
| /assign_clarify, /task_inventory_nl | ✓ | ✓ | |
| Owner home (hello/menu) | ✓ | ✓ | Worker gets limited welcome |

## Multiple-role notes

- **Manager** can use both delegation commands (`/assign`) and manager-routing commands (`/mgr*`) when they are department heads receiving owner tasks.
- **Owner** sees tasks grouped by department; **Manager** sees dept-scoped view; **Worker** sees assigned tasks only.

## ML role awareness

ML classification is **role-agnostic** at classify time; backend enforces role in `processCommand()` and workflow handlers. Future ML hardening should document expected role×intent validity matrix for evaluation.
