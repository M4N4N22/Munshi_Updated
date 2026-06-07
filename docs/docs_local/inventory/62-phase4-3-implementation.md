# Phase 4.3 — Implementation Report

**Run date:** 2026-06-07

---

## Deliverables

| Component | File |
|-----------|------|
| WhatsApp entry routing | `whatsapp.service.ts` |
| NL orchestrator | `task-inventory-nl.orchestrator.ts` |
| ML client | `ml-task-inventory.client.ts` |
| Confirmation messages | `task-inventory-confirmation.service.ts` |
| Task creation adapter | `task-inventory-creation.service.ts` |
| Reply parsing helpers | `task-inventory-nl.helper.ts` |
| Workflow handler | `handlers/task-inventory-creation.handler.ts` |
| Workflow type + steps | `workflow.constants.ts` |
| Session interface | `workflow.interfaces.ts` |
| Registry + module wiring | `workflow.registry.ts`, `workflow.module.ts` |
| Engine initial step support | `workflow-engine.service.ts` (`initialStep` param) |

---

## Behaviour Summary

1. **Non-slash** owner/manager messages call ML extract before classify.
2. If `task_kind` is `delivery`, `issue`, or `inventory_count`, run Phase 4.2 resolution.
3. Start `TASK_INVENTORY_CREATION` workflow with appropriate first step.
4. User disambiguates (numbered reply) or confirms (CONFIRM/YES/1).
5. On confirm, reuse `TasksService.assignToUser` with inventory lines (delivery/issue).

---

## Tests Added

| File | Focus |
|------|-------|
| `task-inventory-nl.helper.spec.ts` | Confirm/cancel/selection parsing |
| `task-inventory-confirmation.service.spec.ts` | Message builders |
| `task-inventory-nl.orchestrator.spec.ts` | NL routing bootstrap |
| `task-inventory-creation.handler.spec.ts` | Confirm, cancel, selection, duplicate |

Phase 4.1/4.2 tests unchanged.

---

## Contract Updates

- `WORKFLOW_TYPE.TASK_INVENTORY_CREATION` added to backend constants
- `contracts/workflow-types.json` + `contracts/typescript/index.ts` updated (internal start command `/task_inventory_nl`)

---

*End of implementation report.*
