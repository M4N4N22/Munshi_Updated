# Architecture Impact Report — TraderOS Foundation (Prompt 2)

**Date:** 2026-05-29

---

## Summary

Prompt 2 introduces **additive-only** changes to the Munshi backend. No existing runtime paths were modified. The system architecture evolves from a **Workforce Operations Layer** toward **Business Operations Orchestration (TraderOS)** by reserving schema and module boundaries for inventory, vendors, procurement, and approvals.

---

## Layer Impact

| Layer | Before | After Prompt 2 |
|-------|--------|----------------|
| **Ingress (WhatsApp)** | Sole workflow entry | Unchanged |
| **AI (ML classify)** | Intent routing | Unchanged |
| **Domain services** | users, factories, departments, tasks, attendance, issues, reports | + vendors, inventory, purchase-requests, approvals |
| **Persistence** | 9 SQL tables | +7 SQL tables (via migration) |
| **API surface** | Operational + admin REST | +4 route prefixes (skeleton) |
| **Scheduling** | Task deadline + attendance crons | Unchanged |

---

## Module Dependency Graph (Updated)

```text
AppModule
├── DbModule (global)
├── WhatsAppModule ──► Tasks, Users, Departments, Attendance, Issues, Reports, Messaging
├── TasksModule
├── DepartmentsModule
├── UserModule / FactoryModule / IssueModule / ReportsModule / AttendanceModule
├── VendorModule          [NEW - skeleton]
├── InventoryModule       [NEW - skeleton]
├── PurchaseRequestModule [NEW - skeleton]
└── ApprovalModule        [NEW - skeleton]
```

New modules depend only on `DbModule` (global). They do **not** import `WhatsAppModule`, preventing circular dependencies and keeping WhatsApp stable.

---

## Data Model Impact

### Tenant boundary unchanged

`factory_id` remains the isolation key. All TraderOS tables include `factory_id`, consistent with `tasks`, `issues`, `departments`.

### Factory hub extended

```text
Factory
 ├── (existing) departments, tasks, issues, attendance, members
 └── (new) vendors, inventory_*, purchase_requests, approval_requests
```

### User hub extended

Users can be linked as requester/approver on new entities without changing `users` table columns.

### No breaking schema changes

Existing columns, indexes, and Sequelize associations for operational tables are untouched.

---

## Cross-Cutting Concerns

| Concern | Impact |
|---------|--------|
| **Auth** | New routes inherit same open REST pattern as `/tasks`, `/users` |
| **Validation** | DTOs defined with class-validator for future implementation |
| **Swagger** | New DTOs include `@ApiProperty` — will appear in `/api/docs` |
| **Error handling** | Global `HttpExceptionFilter` applies to new controllers |
| **Logging** | `LoggerInterceptor` applies to new HTTP routes |
| **Transactions** | Not yet used in skeleton services; follow `UserService.remove` pattern later |

---

## Deployment Impact

- **Application binary:** Larger bundle (new modules); no new npm dependencies.
- **Database:** Requires one-time migration `001_traderos_foundation.sql`.
- **Environment variables:** No new required env vars for skeleton.
- **CI/CD:** No workflow changes.
- **Docker:** No Dockerfile changes.

---

## Performance Considerations

At current scale, impact is negligible:

- Seven empty tables with indexes on `factory_id`
- No additional queries at startup beyond Sequelize model registration
- No new cron jobs

At 1000-factory scale, review:

- Index-only scans on `(factory_id, status)` for approval queues
- Archival strategy for `inventory_transactions` (append-only growth)

---

## Testing Impact

- No existing tests in repo were broken (build verified via `yarn build`).
- Prompt 3 should add integration tests per module with factory-scoped fixtures.

---

## Documentation Impact

New reports under `docs/reports/`:

- `current-database-analysis.md`
- `migration-notes.md`
- `prompt-2-foundation-schema-report.md`
- `architecture-impact-report.md` (this document)
- `future-work-report.md`

---

## Verdict

**Safe to merge** from an architecture standpoint for preserving existing Munshi operations, provided:

1. Migration is applied deliberately (not assumed at app boot).
2. Prompt 3 implements business logic incrementally behind the established module boundaries.

---

*End of architecture impact report.*
