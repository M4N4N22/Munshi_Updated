# Phase 0.3 — Task Completion → Inventory Movement — Regression Report

Classifications: **PASS**, **FAIL**, **NOT VERIFIED**.

---

## Phase 0.1

| Check | Result | Evidence |
|-------|--------|----------|
| Migration unchanged | **PASS** | No migration edits in Phase 0.3 |
| `TaskInventoryLine` model | **PASS** | `tasks.schema.ts` unchanged |
| Associations | **PASS** | Unchanged |
| Model registration | **PASS** | `models.ts` unchanged |

---

## Phase 0.2

| Check | Result | Evidence |
|-------|--------|----------|
| DTO `inventory_lines` | **PASS** | `tasks.dto.ts` unchanged |
| `persistInventoryLines` | **PASS** | Still used on create paths |
| `adminFindOne` retrieval | **PASS** | Include unchanged |
| `adminRemove` deletion | **PASS** | Destroy lines unchanged |
| `assignToUser` / `adminCreate` persist | **PASS** | Unchanged |

---

## Existing Functionality

### Task creation

| Check | Result | Evidence |
|-------|--------|----------|
| `assignToUser` without lines | **PASS** | No changes to create flow |
| `adminCreate` | **PASS** | Unchanged |
| `assignToAll` without lines | **PASS** | Only adds reject when lines present |

### Task updates

| Check | Result | Evidence |
|-------|--------|----------|
| `addUpdate` | **PASS** | Unchanged |
| `adminUpdate` non-complete patches | **PASS** | Movement only when `becomesComplete` |

### Workflows

| Check | Result | Evidence |
|-------|--------|----------|
| Workflow module | **PASS** | Not modified |
| Assign clarify | **PASS** | Still creates via `handleAssign` |

### Inventory

| Check | Result | Evidence |
|-------|--------|----------|
| Inventory schema | **PASS** | Not modified |
| Transaction service internals | **PASS** | Used via public API only |

### Purchase requests

| Check | Result | Evidence |
|-------|--------|----------|
| Module | **PASS** | Not modified |

### WhatsApp completion

| Check | Result | Evidence |
|-------|--------|----------|
| `whatsapp.service.ts` | **PASS** | Not modified |
| Still calls `completeTask` | **PASS** | Unchanged entrypoint |

---

## Phase 0.3

| Check | Result | Evidence |
|-------|--------|----------|
| Movement on completion | **PASS** | Helper + three callers |
| Insufficient stock protection (code) | **PASS** | Movement before update |
| Idempotency | **PASS** | Transition guards on all paths |
| TASK references | **PASS** | Helper sets `reference_type` / `reference_id` |
| assignToAll + lines blocked | **PASS** | `BadRequestException` |
| TRANSFER rejected | **PASS** | Helper validation |
| Build | **PASS** | `yarn build` exit 0 |
| Live regression | **NOT VERIFIED** | No Postgres/runtime suite |

---

## Regression Summary

| Area | Classification |
|------|----------------|
| Phase 0.1 | **PASS** |
| Phase 0.2 | **PASS** |
| Task creation (no lines / single assign) | **PASS** |
| Task updates | **PASS** |
| Workflows | **PASS** |
| Inventory internals | **PASS** |
| Purchase requests | **PASS** |
| WhatsApp completion entry | **PASS** |
| Phase 0.3 movement | **PASS** (code) |
| End-to-end runtime | **NOT VERIFIED** |

**Conclusion:** Phase 0.3 is additive. Tasks without inventory lines behave as before. Unsafe `assignToAll` + lines is blocked.

---

## NEXT IMPLEMENTATION TARGETS

1. Full regression with Postgres after deploy.
2. Confirm generic task complete (no lines) via WhatsApp unchanged.
