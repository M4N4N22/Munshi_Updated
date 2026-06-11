# Phase 3.5 — Session-Awareness Audit

---

## Session types

| Type | Storage | ML involved? |
|------|---------|--------------|
| `workflow_sessions` table | Postgres | No — when active |
| Inventory CSV import | In-memory Map | No |
| Team CSV import | In-memory Map | No |
| Low-stock disambiguation | Context service | No — numeric pick |

---

## Active workflow behavior

When `sessionState.session` exists (`whatsapp.service.ts`):

1. Direct slash in `KNOWN_SLASH_COMMANDS` → `processCommand` (exits workflow message handling)
2. Else → `handleActiveWorkflowMessage` — **no ML**

**Session suppression:** Classify not called for free text in active workflow.

---

## Pre-ML session handlers (before classify)

| Check | Order | Effect |
|-------|-------|--------|
| `isCancelCommand` | Early | Cancels workflow + import sessions |
| `isAwaitingImportConfirm` | Before workflow | CONFIRM/CANCEL → import handler |
| `isAwaitingCsv` (inventory) | Before workflow | Prompt upload only |
| `isAwaitingCsv` (team) | Before workflow | Prompt upload only |

---

## Slash bypass during session

During active workflow, these still hit `processCommand` via direct slash match:

- Any command in `parseDirectSlashCommand` (COMMANDS set)
- Not the separate `slashBypass` regex (that's for no-session path)

**mgr* and assign_delivery bypass** applies only when **no** active session in the no-session branch — actually when session active, direct slash still works via line 460-467.

---

## Workflow-specific ML interaction

| Workflow | ML at start | ML during steps |
|----------|-------------|-----------------|
| Worker onboarding | `/onboard_worker` via workflow start or classify | ❌ Step handlers |
| Vendor onboarding | Same | ❌ |
| Inventory create | workflow or classify | ❌ |
| Business discovery | discovery regex / classify | ❌ COLLECT/MENU |
| Purchase request | CTA, classify, or slash | ❌ |
| Assign clarify | classify or assign handler | ❌ ASSIGNEE pick |
| Task inventory NL | **extract endpoint** not classify | ❌ disambiguation steps |
| Suggestion approve | Document pipeline | ❌ YES/NO |

---

## Expired sessions

`resolveActiveSession` returns `expiredJustNow` → expired message; next message uses fresh routing including ML.

**ML not informed** session expired.

---

## CONFIRM / CANCEL

Handled in `InventoryBulkImportService.handleReviewReply` — string match, not ML.

Risk: If message reaches classify, CONFIRM could be misclassified — mitigated by pre-ML gate `isAwaitingImportConfirm`.

---

## Session awareness score

| Capability | Status |
|------------|--------|
| Suppress classify during workflow | ✅ Backend |
| CONFIRM/CANCEL non-intent | ✅ Backend |
| ML knows session state | ❌ |
| ML knows workflow step | ❌ |
| Clarify within session via ML | ❌ |
