# Backend Health Audit — Executive Summary

**Run date:** 2026-06-06  
**Scope:** Full `backend/` codebase + inventory reports `28-*` through `45-*`  
**Method:** Static code review, build verification, test inventory cross-check  
**Constraint:** Analysis only — no code modified

---

## Overall Health: **RED**

The backend compiles cleanly and shows strong patterns in **inventory concurrency**, **Zoho push idempotency**, and **integration integration tests** (115 passing). However, **REST APIs are effectively unauthenticated** — there is no global guard, `InternalCallGuard` is never applied, and most controllers trust `factory_id` / numeric IDs in query parameters without verifying caller identity. If the HTTP surface is internet-exposed, this is a production blocker.

WhatsApp-first flows derive identity from phone lookup and are better scoped for their channel, but they do not protect REST.

---

## Build Health (Part 1)

| Check | Result | Evidence |
|-------|--------|----------|
| TypeScript compile | **PASS** | `npm run build` → `nest build` exit 0 |
| Nest bootstrap | **PASS** | `AppModule` imports 19 feature modules (`app.module.ts:28–56`) |
| Global pipes | Partial | `ValidationPipe` with `transform: true` (`main.ts:61–65`); `whitelist` not enabled |
| Global guards | **Missing** | No `APP_GUARD`; `InternalCallGuard` defined but unused (`guards.ts:11–25`) |
| Circular deps | Present (managed) | `forwardRef` between `DomainEventsModule`, `IntegrationModule`, `InventoryModule`, `DocumentModule` ↔ `WorkflowModule` |
| Cron jobs | 4 active | Domain events (1 min), Zoho scheduled pull (10 min), push retry (1 min), workflow expiry (hourly) |

---

## Database Health (Part 2)

| Area | Assessment |
|------|------------|
| Migrations | 15 SQL files (`000`–`013`); applied at boot via `migration-bootstrap.mjs` unless `SKIP_MIGRATION_BOOTSTRAP=1` |
| Factory isolation | Enforced in **service WHERE clauses** for inventory, integrations, purchase requests — not at HTTP layer |
| Transactions | Inventory movements, task completion, purchase request create, Zoho pull per-item — use Sequelize transactions |
| Indexes | Good partial indexes: `uq_workflow_sessions_active_phone`, `uq_integration_connections_factory_provider_active`, `idx_domain_events_pending` |
| Gaps | `domain_events` lacks `FOR UPDATE SKIP LOCKED` processing; finance tables migrated but no application layer |
| Soft delete | Not used for inventory items (`is_active` flag instead) |

---

## Domain Events (Part 3)

Outbox pattern is operational with 3 wired handlers (`zoho.stock_push.requested`, `inventory.low_stock`, `integration.sync_failed`). Phase 3 reports (41–44) confirm low-stock and sync-failure alerts are implemented.

**Key risks:** no multi-instance row locking; `PROCESSING` rows can stick after crash; events with no handler are marked `COMPLETED`; optional missing handlers also complete silently.

---

## Inventory (Part 4)

**Strengths:** row-level `FOR UPDATE` lock (`inventory.repository.ts:156–161`); negative stock guard (`inventory-transaction.service.ts:155–161`); low-stock events post-commit only on threshold cross (Phase 3.1).

**Gaps:** Zoho pull updates metadata only for existing mappings, not quantity (`zoho-pull-sync.service.ts:282–311`); CSV import processes rows sequentially without batch transaction; unbounded transaction history list.

---

## Integrations (Part 5)

OAuth, encrypted tokens, factory-scoped integration auth (`IntegrationAuthValidationService`) are solid **when caller identity is trusted**. OAuth state nonces are in-memory (`zoho-oauth-state.service.ts:28`) — not HA-safe (documented in `30-zoho-oauth-security-review.md` SR-01).

Push delivery idempotency via unique constraint + race handling is production-grade (`integration-push-delivery.helper.ts:20–52`).

---

## Workflows (Part 6)

Seven workflow handlers registered; session TTL + expiry cron; DB unique index prevents duplicate active sessions per phone (`003_workflow_sessions.sql:27–30`). Prefill from low stock (Phase 3.4) reuses existing purchase request flow without auto-create.

---

## Security (Part 7)

| Severity | Count (summary) |
|----------|-----------------|
| CRITICAL | 3 |
| HIGH | 9 |
| MEDIUM | 14 |
| LOW | 11 |
| INFO | 8 |

See `46-backend-bugs.md` and `46-backend-risks.md` for detail.

---

## Performance (Part 8)

Primary concerns: unbounded `findAll` on worker pending tasks (`tasks.service.ts:756–765`), workflow expiry scan (`workflow-session.service.ts:96–98`), inventory transaction history, serial domain-event batch processing. Zoho scheduled sync and push retry process connections/deliveries sequentially.

---

## Test Coverage (Part 9)

| Metric | Value |
|--------|-------|
| Integration specs | 18 files, 115 tests (per Phase 3.4 validation) |
| Unit specs | ~65 under `src/` |
| Strongest | Zoho stack, inventory CSV, low-stock alerts, push idempotency |
| Weakest | `whatsapp.service.ts` (~1800 lines), co-located REST controllers (users, factories, issues), onboarding service |

---

## Dead Code (Part 10)

Finance schema without module; `ApprovalModule` stub; unused `InternalCallGuard`; reserved domain event types never handled; `forwardRef` import unused in `business-discovery.module.ts`.

---

## Prior Report Context (28–45)

| Report range | Relevance to this audit |
|--------------|-------------------------|
| 28–29 | Zoho + integration foundation — architecture confirmed in code |
| 30–39 | Phase 2 OAuth, pull, push, retry — implemented; SR-01/02 still open |
| 38–39 | Push handler runtime — no open defects at signoff |
| 40 | Phase 3 gap analysis — **partially superseded** by 41–45 (3.1–3.4 now shipped) |
| 41–42 | Low stock + sync failure — implemented and tested |
| 44 | Manager alerts — handler-only extension |
| 45 | Purchase request prefill — read-only transport, no auto-create |

---

## Recommended Priority Order (analysis only — not implemented)

1. **REST authentication + authorization** (session/JWT or API gateway)
2. **Domain event processor hardening** (row lock, PROCESSING recovery)
3. **Remove or protect** `POST /webhook/test`, restrict Swagger in production
4. **Multi-instance OAuth state** (Redis/DB nonces)
5. **Test coverage** for WhatsApp orchestration and security-sensitive REST

---

## Signoff Reference

See `46-backend-signoff.md` for severity counts and health rating.
