# Phase 4 Remediation — Root Cause Analysis

**Run date:** 2026-06-07  
**Prior verdict:** PARTIAL PASS (`65-phase4-live-validation-summary.md`)  
**Target verdict:** FULL PASS

---

## Defect LIVE-001 / LIVE-002 — Double disambiguation → CANCELLED; no delivery tasks

### Symptom

`Ram ko N cement deliver kar do` with ambiguous cement SKUs and ambiguous Ram workers:

1. Session started at `WAITING_INVENTORY_SELECTION` with `inventory_candidates` only.
2. User replied `1`.
3. Session **CANCELLED** with unresolved-worker message instead of worker selection or confirmation.

### Root cause

`TaskInventoryNlOrchestratorService.buildBootstrap()` returned early on inventory ambiguity **before** persisting worker resolution state (`worker_candidates` or resolved `worker_user_id`). After inventory pick, `TaskInventoryCreationWorkflowHandler.handleInventorySelection()` found no worker data and cancelled.

### Secondary issue (discovered in remediation)

`handleStep()` evaluated `isCancelReply()` **before** selection-step routing. Reply `2` (valid second-option index) matched cancel token `2` and cancelled the session during worker/inventory disambiguation.

### Impact

All live delivery paths requiring inventory and/or worker disambiguation failed (LIVE-001, LIVE-002, G4–G6).

---

## Defect LIVE-004 — Session expiry not enforced on reply

### Symptom

SQL aged `updated_at` by 25 hours; user reply still routed into active workflow; session remained `ACTIVE`.

### Root causes (two)

1. **`isExpired()` used `created_at` only** — live test aged `updated_at` while `created_at` stayed recent, so TTL check never fired.
2. **`toRecord()` dropped Sequelize `updatedAt`** — Sequelize exposes camelCase `updatedAt` on model instances; `toRecord()` read only `row.updated_at` (undefined), so `isExpired()` fell back to recent `created_at` even after fix (1).

### Impact

Expired sessions could accept replies indefinitely; G13 failed in live validation.

---

## Defect LIVE-005 — `/help` regression

### Symptom

`POST /webhook/test` with `/help` returned HTTP 400 or `"data":"error"` during live validation.

### Root causes

1. **Active workflow intercepted `/help`** — slash commands were routed to task-inventory handler as invalid selection.
2. **Unknown slash commands went through ML classify** instead of direct `processCommand()`.
3. **Owner `/help` used interactive owner-home outbound** — OLLI send failures (rate limit / credentials) threw from `finish()` → HTTP 400.
4. No text fallback when owner-home send failed.

### Impact

Regression smoke G15 failed; `/help` unusable during active NL workflow.

---

## Confirmation token gap (Part 5)

`theek hai` was not in `TASK_INVENTORY_CONFIRM_REPLIES` (only `theek`). Delivery workflows never reached confirm step in the prior live run, so this was unproven live.

---

## Duplicate confirmation (Part 6)

Handler already guarded via `task_created_id` in `handleConfirmation()`. Not proven live because delivery never reached confirm step. Unit tests and G12 live run confirm protection.

---

## Out of scope (unchanged)

| Item | Status |
|------|--------|
| LIVE-003 OLLI notifications | Environment / rate-limit — send attempted, API may reject |
| ML extraction behavior | Not modified |
| Intent hardening / Phase 4.5 | Not started |

---

*End of remediation analysis.*
