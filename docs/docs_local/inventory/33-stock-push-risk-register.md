# Phase 2.5A — Stock Push Risk Register

**Run date:** 2026-06-04  
**Scope:** Pre-implementation risks for async Zoho stock push  
**Prerequisite:** Phases 2.1–2.4 complete

---

## Risk summary matrix

| ID | Category | Severity | Likelihood | Blocker? |
|----|----------|----------|------------|----------|
| R-P05-01 | Data integrity | **Critical** | Medium | **Yes** if unmitigated |
| R-P05-02 | Data integrity | **Critical** | Low | **Yes** |
| R-P05-03 | Sync | **High** | Medium | **Yes** |
| R-P05-04 | Sync | **High** | High | No |
| R-P05-05 | Technical | Medium | High | No |
| R-P05-06 | Operational | Medium | Medium | No |
| R-P05-07 | OAuth | Medium | Medium | No |
| R-P05-08 | Performance | Medium | Low | No |
| R-P05-09 | UX | Medium | High | No |
| R-P05-10 | Architecture | Low | Medium | No |

---

## Technical risks

### R-P05-05 — Domain event dispatch still no-op

| Field | Value |
|-------|-------|
| **Description** | `DomainEventsService.dispatch()` logs debug only; events never reach Zoho until registry wired. |
| **Impact** | Silent push failure — Munshi correct, Zoho stale |
| **Mitigation** | 2.5.4 implements handler registry; integration test asserts handler invoked |
| **Owner** | Phase 2.5.4 |
| **Status** | Open (known) |

### R-P05-10 — Event schema drift

| Field | Value |
|-------|-------|
| **Description** | Payload shape changes break in-flight events. |
| **Impact** | Handler crashes → retries → poison |
| **Mitigation** | Version field in payload; strict validation; default reject unknown versions |
| **Owner** | Phase 2.5.1 |

---

## Data integrity risks

### R-P05-01 — Double push (R-Z10 carry-forward)

| Field | Value |
|-------|-------|
| **Description** | Event replay or duplicate handler invocation sends two Zoho adjustments for one Munshi txn. |
| **Impact** | **Zoho qty wrong** — Munshi remains truth but external mirror corrupt |
| **Mitigation** | `integration_push_deliveries` unique `(connection_id, inventory_transaction_id)`; check before API |
| **Owner** | Phase 2.5.2 |
| **Verification** | Replay test: second invoke → 0 API calls |

### R-P05-02 — Push before ledger commit (R-ST-02)

| Field | Value |
|-------|-------|
| **Description** | Event published inside same DB transaction as movements; rollback leaves orphan push. |
| **Impact** | Zoho adjusted for movement that never committed |
| **Mitigation** | Publish only after transaction commit in `TasksService` |
| **Owner** | Phase 2.5.1 |
| **Verification** | Failure test: rollback → 0 events |

### R-P05-03 — Inbound/outbound loop (R-ST-03)

| Field | Value |
|-------|-------|
| **Description** | Pushing rows created by ZOHO_PULL or CSV_IMPORT doubles Zoho stock. |
| **Impact** | **Critical** Zoho inflation |
| **Mitigation** | Handler rejects `reference_type` not in allowlist (`TASK` only v1); never publish those events |
| **Owner** | Phase 2.5.1 + 2.5.4 |
| **Verification** | Unit test: ZOHO_PULL txn → no event / handler skip |

### R-P05-04 — Munshi qty overwritten from Zoho response (R-Z06 / R-ST-01)

| Field | Value |
|-------|-------|
| **Description** | Push handler writes Zoho response qty to `inventory_items.current_quantity`. |
| **Impact** | **Breaks ledger authority** |
| **Mitigation** | **Forbidden by design** — push service has no `InventoryTransactionService` write path |
| **Owner** | Phase 2.5.4 code review |
| **Verification** | Static review + test: push does not inject inventory repository quantity updates |

---

## Sync risks

### R-P05-06 — Unmapped items on push (R-Z09 carry-forward)

| Field | Value |
|-------|-------|
| **Description** | Task completes for item never pulled / mapped to Zoho. |
| **Impact** | Munshi correct; Zoho stale; owner confusion |
| **Mitigation** | Skip with `skipped_unmapped` delivery status; log; optional digest later |
| **Owner** | Phase 2.5.4 |

### R-P05-07 — Token expiry mid-push (R-Z04 carry-forward)

| Field | Value |
|-------|-------|
| **Description** | Access token expired when handler runs. |
| **Impact** | Push fails; retries until refresh succeeds |
| **Mitigation** | Reuse `ZohoOAuthService.refreshConnectionIfNeeded()` before API |
| **Owner** | Phase 2.5.4 |

### R-P05-08 — Zoho rate limits (R-Z08 carry-forward)

| Field | Value |
|-------|-------|
| **Description** | Burst of task completions triggers many push API calls. |
| **Impact** | 429 responses; delayed mirror |
| **Mitigation** | HTTP retry + backoff; optional per-factory rate limit in handler; batch sync_run audit |
| **Owner** | Phase 2.5.3–2.5.4 |

---

## Operational risks

### R-P05-09 — Push failure after task complete (acceptable per P2)

| Field | Value |
|-------|-------|
| **Description** | User sees task complete; Zoho not updated until retry succeeds. |
| **Impact** | Temporary mirror lag |
| **Mitigation** | Async retry; `integration_push_deliveries` + `domain_events.last_error`; optional integrations page last push status |
| **Owner** | Phase 2.5.5 |

### R-O01 — No live Zoho in CI (carry-forward)

| Field | Value |
|-------|-------|
| **Description** | CI cannot validate real Zoho adjustment API. |
| **Impact** | API contract drift |
| **Mitigation** | Mock client mandatory; staging manual checklist |
| **Owner** | All 2.5 PRs |

---

## Mitigation checklist (pre-implementation sign-off)

| # | Control | Phase |
|---|---------|-------|
| 1 | R-Z06 preserved — no direct qty writes in push path | 2.5.4 review |
| 2 | Post-commit event publish only | 2.5.1 |
| 3 | TASK-only allowlist | 2.5.1, 2.5.4 |
| 4 | Idempotency table | 2.5.2 |
| 5 | dispatch registry wired | 2.5.4 |
| 6 | Mock Zoho CI tests | 2.5.5 |
| 7 | Phases 0–2.4 regression green | Every PR |

---

## Residual risks (accepted for P2 v1)

| Risk | Acceptance rationale |
|------|---------------------|
| Minute-level push latency | Domain events cron every 1 min — acceptable for factory ops |
| TASK-only scope | CSV/admin pushes manual in Zoho until 2.5+ |
| Single-warehouse Zoho | Document in owner FAQ; multi-warehouse Phase 3+ |
| No WhatsApp push failure alert | Logs + optional API metadata sufficient for v1 |

---

## Verdict

**R-Z06 can be preserved** if push remains a read-only mirror of committed ledger rows with no `InventoryTransactionService` mutations.

**Duplicate run protection** for push is distinct from pull (Phase 2.4): use **idempotency deliveries**, not `sync_runs.status=running` gate alone.

**Failure isolation** is inherited from `domain_events` per-event processing — one failed push must not block unrelated events.

**Phase 2.5A analysis complete — ready to implement 2.5.1.**
