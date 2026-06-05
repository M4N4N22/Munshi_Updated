# Phase 2.0 — Zoho Integration Risk Register

**Run date:** 2026-06-06  
**Scope:** Pre-implementation risks for Phase 2 Zoho Inventory integration

---

## Risk summary matrix

| ID | Category | Severity | Likelihood | Phase 2 blocker? |
|----|----------|----------|------------|------------------|
| R-Z01 | Technical | Medium | High | No |
| R-Z02 | OAuth | **High** | Medium | **Yes** if unmitigated |
| R-Z03 | OAuth | Medium | Medium | No |
| R-Z04 | Sync | **High** | Medium | **Yes** if unmitigated |
| R-Z05 | Data integrity | **High** | Medium | **Yes** if unmitigated |
| R-Z06 | Data integrity | Medium | High | No |
| R-Z07 | Sync | Medium | Medium | No |
| R-Z08 | Operational | Medium | Low | No |
| R-Z09 | UX | Medium | High | No |
| R-Z10 | Performance | Medium | Low | No |

---

## Technical risks

### R-Z01 — No existing integration module

| Field | Value |
|-------|-------|
| **Description** | Greenfield `integrations/` layer; no patterns for external ERP connectors beyond CSV/document ML. |
| **Impact** | Inconsistent abstractions; duplicate HTTP/retry code |
| **Mitigation** | Single `ZohoInventoryClient`; shared `integration_sync_runs` audit for pull and push; follow `OlliMediaService` retry style |
| **Owner** | Phase 2.1 |

### R-Z02 — Token storage without encryption utility

| Field | Value |
|-------|-------|
| **Description** | Repo has no encrypt/decrypt helper; tokens in plaintext would violate P2 security expectation. |
| **Impact** | **Critical** — credential leak from DB backup |
| **Mitigation** | Introduce `TokenCryptoService` with env `INTEGRATION_TOKEN_ENCRYPTION_KEY`; never log tokens; rotate key procedure documented |
| **Owner** | Phase 2.2 — **blocker for prod OAuth** |

### R-Z03 — OAuth redirect URI / multi-environment drift

| Field | Value |
|-------|-------|
| **Description** | Dev tunnel, Vercel web, and prod API hosts differ; Zoho app allows fixed redirect URIs. |
| **Impact** | Connect flow fails in some environments |
| **Mitigation** | Document all URIs in DevOps runbook; `ZOHO_REDIRECT_URI` per env; web callback proxies to API if needed |
| **Owner** | Phase 2.2 |

---

## OAuth risks

### R-Z04 — Token expiry during long sync

| Field | Value |
|-------|-------|
| **Description** | Initial pull of large catalog may exceed access token TTL. |
| **Impact** | Partial sync, inconsistent mappings |
| **Mitigation** | Refresh before each run; checkpoint pagination cursor in `sync_run.metadata`; resume partial runs |
| **Owner** | Phase 2.3 |

### R-Z05 — CSRF / factory binding on callback

| Field | Value |
|-------|-------|
| **Description** | OAuth callback must bind tokens to correct `factory_id` and owner user. |
| **Impact** | Cross-tenant token assignment |
| **Mitigation** | Signed `state` JWT: `{ factoryId, userId, nonce, exp }`; validate on callback |
| **Owner** | Phase 2.2 — **blocker** |

---

## Sync risks

### R-Z06 — Quantity overwrite (Zoho pull)

| Field | Value |
|-------|-------|
| **Description** | Setting Munshi `current_quantity` from Zoho stock level destroys task/CSV ledger trust (same class as R-D01). |
| **Impact** | **Critical** — Phase 0 guards and stock levels wrong |
| **Mitigation** | **Mandatory:** pull bootstrap uses `recordStockIn(ZOHO_PULL)` only; periodic pull updates metadata or explicit additive adjustment policy; never SET qty from Zoho snapshot after ops started |
| **Owner** | Phase 2.3 — same discipline as CSV import |

### R-Z07 — SKU collision CSV vs Zoho

| Field | Value |
|-------|-------|
| **Description** | Same SKU imported via CSV then pulled from Zoho may double-count stock or conflict on metadata. |
| **Impact** | Inflated inventory or mapping ambiguity |
| **Mitigation** | Upsert by `(factory_id, sku)`; mapping table links Zoho id; qty always additive with distinct `reference_type`; document in owner FAQ |
| **Owner** | Phase 2.3 |

### R-Z08 — Zoho API rate limits

| Field | Value |
|-------|-------|
| **Description** | Zoho Inventory API throttling on large factories. |
| **Impact** | Failed nightly sync |
| **Mitigation** | Exponential backoff; batch size env; partial success in `sync_runs`; domain event retry |
| **Owner** | Phase 2.4 |

### R-Z09 — Unmapped items on push

| Field | Value |
|-------|-------|
| **Description** | Task completes for item with no Zoho mapping. |
| **Impact** | Munshi correct, Zoho stale — owner confusion |
| **Mitigation** | Push skips with logged warning; optional WhatsApp digest of unmapped SKUs; initial pull creates mappings |
| **Owner** | Phase 2.5 |

---

## Data integrity risks

### R-Z10 — Double push idempotency

| Field | Value |
|-------|-------|
| **Description** | Domain event replay or cron retry sends duplicate adjustment to Zoho. |
| **Impact** | Zoho qty wrong (opposite of Munshi truth) |
| **Mitigation** | Idempotency key `(connection_id, inventory_transaction_id)`; store push result on sync run or push_queue table |
| **Owner** | Phase 2.5 |

### R-D03 carry-forward — Category/location missing on pull

| Field | Value |
|-------|-------|
| **Description** | Zoho category/warehouse name not in Munshi masters. |
| **Impact** | Row failures (same as CSV Phase 1.2) |
| **Mitigation** | Pre-flight readiness check; fail row with Hinglish detail; optional auto-create flag in Phase 2.3+ |
| **Owner** | Phase 2.3 |

---

## Operational risks

### R-O01 — Domain event dispatch no-op (current state)

| Field | Value |
|-------|-------|
| **Description** | `DomainEventsService.dispatch()` is still no-op; push and failure alerts depend on wiring. |
| **Impact** | Events persisted but never processed until handler registry built |
| **Mitigation** | Phase 2.5 implements first real handler; add integration test that dispatch invokes handler |
| **Owner** | Phase 2.5 / Phase 3 overlap |

### R-O02 — DEF-ACC-001 OLLI failures (carry-forward)

| Field | Value |
|-------|-------|
| **Description** | WhatsApp summary may fail to send while sync succeeds. |
| **Impact** | Owner uncertainty |
| **Mitigation** | Decouple sync commit from notify; log `sync_run_id`; web status page |
| **Owner** | Phase 2.3+ |

### R-O03 — No Zoho developer account in CI

| Field | Value |
|-------|-------|
| **Description** | Integration tests cannot hit live Zoho API in CI. |
| **Impact** | Live API regressions caught late |
| **Mitigation** | Mock HTTP client in all CI tests; optional manual staging checklist |
| **Owner** | All Phase 2 PRs |

---

## Multi-tenant / security

| Risk | Mitigation |
|------|------------|
| Cross-factory token access | All queries filter `factory_id`; connection belongs to factory |
| Worker triggers sync | Owner/manager role guard on all integration endpoints |
| Token in API responses | Never expose tokens in REST JSON; mask in logs |
| Long-lived refresh token theft | Encrypt at rest; disconnect revokes and nulls tokens |

---

## Recommended mitigations (priority order)

1. **R-Z06 / R-Z05** — Ledger-only qty changes; signed OAuth state; encrypted tokens.
2. **R-Z07** — Unified upsert by SKU + mapping table.
3. **R-Z10** — Push idempotency before production push.
4. **R-O01** — Wire domain event dispatch registry.
5. **R-Z08** — Backoff and partial success reporting.

---

## Open decisions (resolve before Phase 2.3)

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | Auto-create category/location on Zoho pull? | Strict fail vs auto-create | Strict fail v1 (match CSV) |
| 2 | Periodic pull updates qty? | Metadata only vs additive adjustment | Metadata only v1; qty additive only on initial sync |
| 3 | Push on CSV import? | Yes vs task-only | Task-only v1; CSV push in 2.5+ if needed |
| 4 | Zoho Books vs Inventory first? | Inventory only vs both | **Zoho Inventory** per P2 |
| 5 | Push queue table vs domain events only? | Table vs outbox | Outbox + idempotency table if replay issues |

---

## Phase 0 / Phase 1 regression requirement

Every Phase 2 PR must run:

```bash
cd backend
yarn test:integration   # 28/28 minimum (Phase 0 + 1.2 + 1.3 + 1.4)
yarn test inventory-csv.parse.spec.ts inventory-csv.template.spec.ts
```

No changes to `InventoryTransactionService.applyMovement` internals.
