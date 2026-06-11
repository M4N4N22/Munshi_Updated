# Phase 8 — Redundancy Analysis

**Scope:** Identify overlap only. No change proposals.

## High overlap — likely single ML intent families

| Cluster | Commands | Overlap |
|---------|----------|---------|
| **Delivery / stock task** | `/assign_delivery`, `/task_inventory_nl` | Both create inventory-linked tasks; NL path vs structured slash |
| **Assign without mention** | `/assign` (incomplete), `/assign_clarify` | Ambiguous assign NL → clarify workflow vs partial `/assign` |
| **Business setup** | `/business_discovery`, `/continue_discovery` | Same handler; resume is alias |
| **Add stock** | `/inventory_create`, `/inventory_import_csv`, home `home_add_stock` | All increase stock knowledge; different granularity |
| **Low stock → buy** | `/inventory_status` (implicit), low-stock CTA, `/purchase_request_create` | Status surfaces problem; PR solves it |

## Medium overlap — related but distinct roles

| Cluster | Commands | Notes |
|---------|----------|-------|
| **Task assignment paths** | `/assign`, `/depart_assign`, `/mgrassign` | Different actors and routing rules |
| **Manager actions on same task** | `/mgrself`, `/mgrtransfer`, `/mgrreject` | Mutually exclusive outcomes on owner-assigned tasks |
| **Onboarding** | `/onboard_worker`, `/onboard_vendor`, `/business_discovery` | All "setup" but different entities |
| **Issue vs task problem** | `/issue` vs task with problem description | Issue = tracked ticket; task = work unit |

## NL vs slash duplication

| Natural language (help examples) | Slash equivalent |
|----------------------------------|------------------|
| "mark me present" | `/present` |
| "show my tasks" | `/tasks` |
| "assign @ram clean machine" | `/assign` |
| "import inventory" (discovery phrase) | `/inventory_import_csv` or `/inventory_create` — **ambiguous** |
| "tell you about my business" | `/business_discovery` |

## Registration redundancy

- `COMMANDS` enum vs `WORKFLOW_START_COMMANDS` — 6 commands appear in both; workflow-only: `suggestion_approve`, `business_discovery`, `assign_clarify`, `task_inventory_nl`, `continue_discovery`.
- `intent-types.json` vs backend — 4+ commands missing from ML contract (see `06-command-dependencies.md`).

## Commands unlikely to merge

| Pair | Why distinct |
|------|--------------|
| /present vs /absent | Opposite attendance states |
| /issue vs /resolve | Create vs close |
| /tasks vs /complete | Read vs mutate |
| /mgrself vs /mgrassign | Manager accepts vs delegates |

## Potential future intent consolidation (observation only)

1. **Stock intake:** `inventory_create` | `inventory_import_csv` | NL "add 100 bolts"
2. **Assign task:** `assign` | `assign_clarify` | `depart_assign`
3. **Delivery:** `assign_delivery` | `task_inventory_nl`
4. **Discovery:** `business_discovery` | `continue_discovery`
