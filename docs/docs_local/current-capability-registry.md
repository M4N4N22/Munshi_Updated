# Munshi Current Capability Registry

**Document date:** 2026-06-08  
**Version:** 2.0  
**Last verified build:** `95bab96` (branch `Shantanu`) — backend 340/340, ML 56/56, contract drift 39/39, web build PASS  
**Last verified UAT:** Phase 0–3 UAT (`49-uat-signoff.md`, 2026-06-06); Document Parsing UAT 7A (`50-document-uat-signoff.md`, 2026-06-06)  
**Last staging verification:** 2026-06-08 — Railway `munshi-staging` live; pilot factory Munshi; Olli webhook + ML classify smoke (see Section 0, Section 6)  
**Integration test baseline:** 115/115 PASS (`npm run test:integration -- --runInBand`)  
**Staging deployment:** `munshi-staging` on Railway — **LIVE** (see Section 0)

This document describes **what Munshi can do today**. It does not describe planned work, roadmaps, or enhancements.

---

## Section 0 — Deployment Topology (Current)

| Service | Host | Status | Notes |
|---------|------|--------|-------|
| **Backend** | https://backend-production-41504.up.railway.app | **LIVE** | Postgres up; 15/15 migrations; Olli webhook at `POST /webhook` |
| **ML** | `ml.railway.internal:8080` (private) | **LIVE** | `OPENAI_API_KEY` configured; `/classify` used by backend |
| **PostgreSQL** | `postgres.railway.internal:5432` | **LIVE** | Railway managed plugin |
| **Web** | https://munshi-dada.vercel.app | **LIVE** | Onboarding, integrations UI, CSV templates |
| **GitHub source** | `ShantanuGarg2004/Munshi_Updated` @ `Shantanu` | **CONNECTED** | Railway autodeploy from `Shantanu` branch (backend root `backend/`, ml root `ml/`) |

### Staging data (pilot factory)

| Item | Value |
|------|-------|
| Factory | **Munshi** (ID `1`) |
| Users | 7 — 3 owners, 2 managers (IT, Sales), 2 workers |
| Departments | IT (head: Shantanu2), Sales (head: Debapratim Dey) |
| Inventory / tasks | **Not seeded** on staging |
| MSG91 OTP / Zoho OAuth | **Not configured** on staging |

### Staging secrets configured

| Variable | Service | Status |
|----------|---------|--------|
| `OLLI_KEY`, `WHATSAPP_VERIFY_TOKEN` | backend | Configured |
| `OPENAI_API_KEY` | ml | Configured |
| `ONBOARDING_MSG91_*` | backend | Not set |
| `ZOHO_*` | backend | Not set |
| `ENABLE_WEBHOOK_TEST_ROUTE` | backend | `true` (staging only) |

Evidence: `docs/docs_local/deployment/36-staging-signoff.md`, `docs/docs_local/pilot/36-onboarding-signoff.md`, `docs/docs_local/pilot/23-live-webhook-readiness.md`.

---

## Section 1 — Feature Inventory (Format Reference)

Each feature in Section 2 includes:

| Field | Description |
|-------|-------------|
| **Feature Name** | User-facing capability |
| **Category** | Grouping |
| **Description** | What it does today |
| **Current State** | One of: PRODUCTION READY, READY WITH KNOWN ISSUES, CONDITIONAL, DEVELOPMENT ONLY, DISABLED, NOT VERIFIED |
| **Availability** | One of: WhatsApp, Web, REST API, Scheduled Job, Internal Service, Multiple |
| **Dependencies** | Required systems/modules |
| **Notes** | Current behaviour only |

---

## Section 2 — Feature Catalog

### Platform & Health

| Feature Name | Category | Description | Current State | Availability | Dependencies | Notes |
|--------------|----------|-------------|---------------|--------------|--------------|-------|
| Health Check | Platform | Liveness probe with Postgres status | PRODUCTION READY | REST API | PostgreSQL | Staging 2026-06-08: `/health` 200, Postgres `up` |
| Migration Health | Platform | Reports applied migration status | PRODUCTION READY | REST API | PostgreSQL | Staging: `/health/migrations` 200, 15/15 |
| Database Migrations | Platform | SQL migrations applied on startup | PRODUCTION READY | Internal Service | PostgreSQL | 15 migrations applied; `up_to_date: true` on staging |

---

### Onboarding & Organization

| Feature Name | Category | Description | Current State | Availability | Dependencies | Notes |
|--------------|----------|-------------|---------------|--------------|--------------|-------|
| Owner Onboarding (OTP) | Onboarding | Phone OTP send/verify and owner registration with factory | READY WITH KNOWN ISSUES | REST API, Web | PostgreSQL, OTP pepper, SMS (MSG91 optional) | UAT 49 PASS; **MSG91 not set on staging** — web OTP path blocked in prod mode |
| Factory Management | Organization | Create/list/update factories; assign members by phone | READY WITH KNOWN ISSUES | REST API | PostgreSQL | Staging pilot: factory **Munshi** (ID 1) created via API |
| Department Management | Organization | Create departments with slug and manager | READY WITH KNOWN ISSUES | REST API | PostgreSQL | Staging: IT + Sales departments on factory Munshi |
| Team Member Assignment | Organization | Add owner/manager/worker to factory by phone | READY WITH KNOWN ISSUES | REST API | PostgreSQL | Staging: 7 users linked; triggers Olli onboarding template + owner/manager broadcast |
| Team Bulk CSV Import | Organization | Import workers from CSV via WhatsApp after menu selection | CONDITIONAL | WhatsApp | PostgreSQL, WhatsApp Provider, Workflow Engine | Implemented; not in Phase 0–3 UAT scope |
| User Management | Organization | CRUD and lookup users by phone | READY WITH KNOWN ISSUES | REST API | PostgreSQL | Lookup: `GET /users/by-phone?phone=` (E.164 `91…`); staging: 7 users on factory Munshi |
| Owner Home Menu | Organization | Readiness snapshot and interactive owner menu on WhatsApp | READY WITH KNOWN ISSUES | WhatsApp | PostgreSQL, WhatsApp Provider, Inventory Module, Task Module | Staging: shown when ML classifies `general_chat` (e.g. bare word `members`) |
| Business Discovery | Organization | Progressive profiling workflow and REST readiness APIs | NOT VERIFIED | Multiple | PostgreSQL, Workflow Engine, WhatsApp Provider | Implemented; not exercised in UAT 49/50 |

---

### Workflows (Multi-Step WhatsApp)

| Feature Name | Category | Description | Current State | Availability | Dependencies | Notes |
|--------------|----------|-------------|---------------|--------------|--------------|-------|
| Workflow Session Engine | Workflows | DB-backed multi-step sessions with TTL and cancel | PRODUCTION READY | Internal Service | PostgreSQL, Workflow Engine | Hourly expiry cron registered |
| Worker Onboarding Workflow | Workflows | `/onboard_worker` — name, phone, department, role, DOJ | READY WITH KNOWN ISSUES | WhatsApp | Workflow Engine, PostgreSQL, WhatsApp Provider | UAT 49 PASS (start); full step-through via registry |
| Vendor Onboarding Workflow | Workflows | `/onboard_vendor` — vendor details capture | NOT VERIFIED | WhatsApp | Workflow Engine, Vendor Module, WhatsApp Provider | Registered in workflow registry |
| Inventory Create Workflow | Workflows | `/inventory_create` — stepwise item creation | NOT VERIFIED | WhatsApp | Workflow Engine, Inventory Module, WhatsApp Provider | Registered; not in UAT 49 |
| Purchase Request Create Workflow | Workflows | `/purchase_request_create` — need → approval → vendor | READY WITH KNOWN ISSUES | WhatsApp | Workflow Engine, Purchase Request Module, WhatsApp Provider | UAT 49 partial; REST create + workflow paths exist |
| Suggestion Approval Workflow | Workflows | `/suggestion_approve` — YES/NO on document suggestions | CONDITIONAL | Multiple | Workflow Engine, Document Module, Inventory Module, WhatsApp Provider | UAT 7A: inventory created on YES; messaging confirm may fail |
| Business Discovery Workflow | Workflows | `/business_discovery` — menu and collect steps | NOT VERIFIED | WhatsApp | Workflow Engine, Business Discovery Module | Registered |
| Assign Clarify Workflow | Workflows | `/assign_clarify` — collect assignee for NL-routed tasks | NOT VERIFIED | WhatsApp | Workflow Engine, Task Module | Registered; depends on ML routing |
| Workflow Cancel | Workflows | `/cancel` — cancel active session | READY WITH KNOWN ISSUES | WhatsApp | Workflow Engine | UAT 49 / transcript |

---

### Attendance

| Feature Name | Category | Description | Current State | Availability | Dependencies | Notes |
|--------------|----------|-------------|---------------|--------------|--------------|-------|
| Mark Present | Attendance | Worker marks attendance present via `/present` | READY WITH KNOWN ISSUES | WhatsApp | PostgreSQL, WhatsApp Provider | UAT 49 PASS |
| Mark Absent | Attendance | Worker marks absent via `/absent` | NOT VERIFIED | WhatsApp | PostgreSQL, WhatsApp Provider | Command registered in `/help` |

---

### Tasks

| Feature Name | Category | Description | Current State | Availability | Dependencies | Notes |
|--------------|----------|-------------|---------------|--------------|--------------|-------|
| Task Creation | Tasks | Create tasks with description, assignee, optional deadline | READY WITH KNOWN ISSUES | Multiple | PostgreSQL, Task Module, WhatsApp Provider | UAT 49 PASS via REST; WhatsApp `/assign` family |
| Task Assignment | Tasks | Assign tasks to workers by mention/slug | READY WITH KNOWN ISSUES | WhatsApp | Task Module, WhatsApp Provider | Commands: `/assign`, `/mgrassign` |
| Delivery Task Assignment | Tasks | `/assign_delivery @worker SKU qty` — task with inventory lines | READY WITH KNOWN ISSUES | WhatsApp | Task Module, Inventory Module, WhatsApp Provider | Phase 0 signoff 12/12 PASS |
| Manager Self-Assign | Tasks | Manager accepts owner task via `/mgrself` | NOT VERIFIED | WhatsApp | Task Module, Departments Module | Command registered |
| Manager Task Transfer | Tasks | `/mgrtransfer` — reroute to another department | NOT VERIFIED | WhatsApp | Task Module, Departments Module | Command registered |
| Manager Task Reject | Tasks | `/mgrreject` — reject misrouted task with reason | NOT VERIFIED | WhatsApp | Task Module, WhatsApp Provider | Command registered |
| Task Completion | Tasks | Mark task complete; triggers notifications | READY WITH KNOWN ISSUES | Multiple | Task Module, PostgreSQL, WhatsApp Provider | UAT 49 PASS |
| Task Updates | Tasks | Progress updates on tasks via `/update` | NOT VERIFIED | WhatsApp | Task Module | Command registered |
| Task Listing | Tasks | Worker/owner views tasks via `/tasks` | READY WITH KNOWN ISSUES | WhatsApp | Task Module, WhatsApp Provider | UAT 49 PASS (worker); **staging: no tasks seeded** |
| Task + Inventory Consumption | Tasks | STOCK_OUT on task complete when inventory lines attached | READY WITH KNOWN ISSUES | Multiple | Task Module, Inventory Module, PostgreSQL | Integration + UAT 49; REST qty fields use string type |
| Negative Stock Protection | Tasks | Blocks task completion when insufficient stock | PRODUCTION READY | Multiple | Task Module, Inventory Module | UAT 49 PASS — 400 on over-delivery |
| Duplicate Completion Handling | Tasks | Idempotent handling when task already completed | PRODUCTION READY | Multiple | Task Module | UAT 49 PASS |
| Task Reopen | Tasks | Reopen completed task via REST | NOT VERIFIED | REST API | Task Module, Inventory Module | Blocked when inventory-linked per Phase 0 |

---

### Inventory

| Feature Name | Category | Description | Current State | Availability | Dependencies | Notes |
|--------------|----------|-------------|---------------|--------------|--------------|-------|
| Inventory Categories | Inventory | Create/list/update/deactivate categories | READY WITH KNOWN ISSUES | REST API | PostgreSQL, Inventory Module | UAT 49 used in setup |
| Inventory Locations | Inventory | Create/list/update/deactivate locations | READY WITH KNOWN ISSUES | REST API | PostgreSQL, Inventory Module | UAT 49 used in setup |
| Inventory Items | Inventory | Create/list/update items with SKU, unit, reorder threshold | READY WITH KNOWN ISSUES | Multiple | PostgreSQL, Inventory Module | UAT 49 PASS |
| Inventory Ledger | Inventory | Stock in, stock out, adjustment with reference types | PRODUCTION READY | REST API | PostgreSQL, Inventory Module | Row locking; TASK and CSV_IMPORT references |
| Inventory Listing & Search | Inventory | Paginated item list, by-SKU lookup, quantity endpoints | READY WITH KNOWN ISSUES | REST API | PostgreSQL, Inventory Module | UAT 49 PASS |
| Low Stock Detection (API) | Inventory | List items below reorder threshold | PRODUCTION READY | REST API | PostgreSQL, Inventory Module | UAT 7A + integration |
| Inventory Status Command | Inventory | `/inventory_status [SKU]` — stock summary on WhatsApp | READY WITH KNOWN ISSUES | WhatsApp | Inventory Module, WhatsApp Provider | UAT 49 / 7A transcript; **staging: no inventory seeded** |
| Inventory Create (Workflow) | Inventory | Stepwise single-item create via WhatsApp | NOT VERIFIED | WhatsApp | Workflow Engine, Inventory Module | `/inventory_create` registered |

---

### CSV & Document Import

| Feature Name | Category | Description | Current State | Availability | Dependencies | Notes |
|--------------|----------|-------------|---------------|--------------|--------------|-------|
| CSV Inventory Import (REST) | Import | `POST /inventory/import/csv` — upsert by SKU, ledger stock-in | READY WITH KNOWN ISSUES | REST API | PostgreSQL, Inventory Module | Phase 1 signoff; UAT 7A baseline 12/12 added |
| CSV Inventory Import (WhatsApp) | Import | `/inventory_import_csv` then attach CSV file | READY WITH KNOWN ISSUES | WhatsApp | PostgreSQL, Inventory Module, WhatsApp Provider | Phase 1 signoff 5/5 integration |
| Static Import Template | Import | Downloadable CSV template on web | PRODUCTION READY | Web | None | `web/public/inventory-import/munshi-inventory-template.csv` |
| Document Upload | Import | Multipart upload to document store | CONDITIONAL | REST API | PostgreSQL, Document Module | UAT 7A: upload 201 with `auto_process=false` |
| Document Parsing (Tabular) | Import | ML `/parse` for CSV/XLS inventory sheets | CONDITIONAL | Internal Service | ML Service, Document Module | **Not OCR**; structured files only; UAT 7A 100% row parse on clean CSV |
| Extraction Storage | Import | Persist parsed payload as document extraction | PRODUCTION READY | REST API | PostgreSQL, Document Module | UAT 7A exercised |
| Suggestion Generation | Import | Build INITIAL_INVENTORY_IMPORT / STOCK_IN / NEW_ITEM suggestions | PRODUCTION READY | Internal Service | Document Module, Inventory Module | UAT 7A exercised |
| Document-Driven Inventory Creation | Import | Execute approved suggestion → items + stock-in ledger rows | CONDITIONAL | Multiple | Document Module, Inventory Module, Workflow Engine | UAT 7A: 12/12 clean doc; duplicate rows partial (Doc B) |
| WhatsApp Document → Parse Pipeline | Import | Upload file on WhatsApp into document parsing flow | DISABLED | WhatsApp | — | WhatsApp routes documents to CSV bulk import only, not document module |

---

### Purchase Requests & Procurement

| Feature Name | Category | Description | Current State | Availability | Dependencies | Notes |
|--------------|----------|-------------|---------------|--------------|--------------|-------|
| Purchase Request Creation | Procurement | Create PR with line items linked to inventory | READY WITH KNOWN ISSUES | Multiple | PostgreSQL, Purchase Request Module, Inventory Module | UAT 49 PASS via REST |
| Purchase Request Submit | Procurement | Move DRAFT → pending approval (`submit: true`) | READY WITH KNOWN ISSUES | REST API | Purchase Request Module | UAT 49: approve fails on DRAFT without submit |
| Purchase Request Approval | Procurement | Owner/manager approves pending PR | READY WITH KNOWN ISSUES | Multiple | Purchase Request Module, Workflow Engine | Requires `performed_by`; WhatsApp workflow path exists |
| Purchase Request Reject | Procurement | Reject pending PR | NOT VERIFIED | REST API | Purchase Request Module | Endpoint exists |
| Vendor Assignment on PR | Procurement | Assign vendor to approved PR | NOT VERIFIED | Multiple | Purchase Request Module, Vendor Module | Endpoint + workflow step exist |
| PR Close / Audit Trail | Procurement | Close PR; view audit history | NOT VERIFIED | REST API | Purchase Request Module | Endpoints exist |
| Low Stock PR Suggestions | Procurement | API suggests items below threshold for PR | READY WITH KNOWN ISSUES | REST API | Inventory Module, Purchase Request Module | `GET /purchase-requests/suggestions/low-stock` |
| Purchase Request Prefill (Low Stock) | Procurement | Read-only prefill + CTA `?itemId=` for WhatsApp workflow | READY WITH KNOWN ISSUES | Multiple | Purchase Request Module, Inventory Module | Integration 115 PASS; UAT 49 live 404 on stale server |
| PR from Suggestion API | Procurement | Create PR from suggestion key | NOT VERIFIED | REST API | Purchase Request Module | Endpoint exists |

---

### Alerts & Notifications

| Feature Name | Category | Description | Current State | Availability | Dependencies | Notes |
|--------------|----------|-------------|---------------|--------------|--------------|-------|
| Low Stock Owner Alerts | Alerts | WhatsApp alert when stock crosses below threshold | READY WITH KNOWN ISSUES | WhatsApp | Domain Events, Inventory Module, WhatsApp Provider | Integration Phase 3.1 PASS |
| Low Stock Manager Alerts | Alerts | Duplicate alert to department manager when distinct from owner | READY WITH KNOWN ISSUES | WhatsApp | Domain Events, Departments Module, WhatsApp Provider | Integration Phase 3.3A PASS |
| Task Completion Notifications | Alerts | Notify assigner on task complete (with stock summary when linked) | READY WITH KNOWN ISSUES | WhatsApp | Task Module, WhatsApp Provider | Phase 0 signoff |
| Integration Sync Failure Alerts | Alerts | Owner/manager WhatsApp when Zoho sync fails | READY WITH KNOWN ISSUES | WhatsApp | Domain Events, Integration Module, WhatsApp Provider | Integration Phase 3.2 PASS |
| Zoho Push Delivery Tracking | Alerts | List push delivery records per factory | READY WITH KNOWN ISSUES | REST API | Integration Module, PostgreSQL | Integration PASS; UAT 49 stale route 404 |

---

### Zoho Integration

| Feature Name | Category | Description | Current State | Availability | Dependencies | Notes |
|--------------|----------|-------------|---------------|--------------|--------------|-------|
| Zoho OAuth Connect | Integration | Authorize and store encrypted tokens | CONDITIONAL | Web, REST API | PostgreSQL, Zoho OAuth env vars, Integration Module | Code complete; UAT 49: 500 without OAuth env |
| Zoho Disconnect | Integration | Soft disconnect connection | NOT VERIFIED | REST API | Integration Module | Endpoint exists |
| Zoho Connections List | Integration | View connection status and last sync metadata | READY WITH KNOWN ISSUES | REST API | PostgreSQL, Integration Module | UAT 49 PASS (empty list) |
| Zoho Manual Pull Sync | Integration | `POST /integrations/zoho/sync/pull` | CONDITIONAL | REST API | Integration Module, Zoho API, active connection | Returns 400 without connection — expected |
| Zoho Scheduled Pull Sync | Integration | Cron pulls inventory every 10 minutes | CONDITIONAL | Scheduled Job | Integration Module, Zoho API, Cron Jobs, PostgreSQL | Cron registered; requires active connection |
| Zoho Stock Push | Integration | Push stock adjustments to Zoho on task-driven movements | CONDITIONAL | Internal Service | Integration Module, Domain Events, Zoho API | Integration Phase 2.5 PASS |
| Zoho Push Retry Processing | Integration | Retry failed pushes with backoff | CONDITIONAL | Scheduled Job | Integration Module, Cron Jobs, PostgreSQL | Every-minute cron; integration PASS |
| Item Mapping Store | Integration | Map external Zoho SKUs to Munshi inventory items | PRODUCTION READY | Internal Service | PostgreSQL, Integration Module | Used during pull/push |

---

### WhatsApp & Commands

| Feature Name | Category | Description | Current State | Availability | Dependencies | Notes |
|--------------|----------|-------------|---------------|--------------|--------------|-------|
| WhatsApp Production Webhook | WhatsApp | Olli/GetOlli inbound at `POST /webhook`; verify at `GET /webhook` | READY WITH KNOWN ISSUES | WhatsApp | OLLI, WHATSAPP_VERIFY_TOKEN | **Staging LIVE** — test webhook + inbound reply confirmed; **no `X-GetOlli-Signature` verification** |
| WhatsApp Test Webhook | WhatsApp | `POST /webhook/test` for structured message injection | READY WITH KNOWN ISSUES | REST API | WhatsApp Service | **Enabled on staging** (`ENABLE_WEBHOOK_TEST_ROUTE=true`); disable before prod |
| Structured Command Router | WhatsApp | Slash commands bypass ML (`/help`, `/tasks`, etc.) | READY WITH KNOWN ISSUES | WhatsApp | WhatsApp Service, Workflow Engine | Staging: `/members` via `team members dikhao` confirmed for factory Munshi |
| Command Help | WhatsApp | `/help` — lists available commands | READY WITH KNOWN ISSUES | WhatsApp | WhatsApp Provider | UAT 49 PASS; staging smoke PASS |
| Members List | WhatsApp | `/members` — team overview (departments, owners, managers, workers) | READY WITH KNOWN ISSUES | WhatsApp | User Module, Departments Module, WhatsApp Provider | Owners/managers only; use `/members` or *team members dikhao* — bare `members` → home menu |
| WhatsApp Outbound (Olli) | WhatsApp | Text, template, interactive buttons via Olli API | READY WITH KNOWN ISSUES | WhatsApp | OLLI_KEY, OLLI_URL | Staging: onboarding + `/members` outbound accepted; some `Re-engagement message` delivery failures |
| Issues Commands | WhatsApp | `/issue`, `/issues`, `/resolve` | NOT VERIFIED | WhatsApp | Issues Module, WhatsApp Provider | Commands registered |
| Reports Command | WhatsApp | `/report [date]` | NOT VERIFIED | WhatsApp | Reports Module, WhatsApp Provider | Command registered |

---

### Issues, Vendors, Reports, Approvals

| Feature Name | Category | Description | Current State | Availability | Dependencies | Notes |
|--------------|----------|-------------|---------------|--------------|--------------|-------|
| Issues Management | Operations | Create/list/resolve operational issues | NOT VERIFIED | Multiple | PostgreSQL, Issues Module | REST + WhatsApp commands exist |
| Vendor Management | Procurement | CRUD vendors, search, deactivate | NOT VERIFIED | REST API | PostgreSQL, Vendor Module | Used by PR vendor assignment |
| Reports | Operations | Generate/list reports via REST and `/report` | NOT VERIFIED | Multiple | PostgreSQL, Reports Module | Controller exists |
| Generic Approvals Module | Operations | Approval records separate from PR workflow | NOT VERIFIED | REST API | PostgreSQL, Approvals Module | Schema + controller exist |

---

### Domain Events & Background Processing

| Feature Name | Category | Description | Current State | Availability | Dependencies | Notes |
|--------------|----------|-------------|---------------|--------------|--------------|-------|
| Domain Event Outbox | Platform | Persist events for async processing | PRODUCTION READY | Internal Service | PostgreSQL | Used by inventory alerts, Zoho push, onboarding |
| Domain Event Processor | Platform | Dispatches pending events to handlers every minute | PRODUCTION READY | Scheduled Job | Domain Events, Cron Jobs, PostgreSQL | UAT 48 cron registered; integration PASS |
| Workflow Expiry Cron | Platform | Expire stale workflow sessions hourly | PRODUCTION READY | Scheduled Job | Workflow Engine, Cron Jobs, PostgreSQL | UAT 48 registered |
| Zoho Scheduled Sync Cron | Integration | Scheduled Zoho pull every 10 minutes | PRODUCTION READY | Scheduled Job | Integration Module, Cron Jobs | UAT 48 registered |
| Zoho Push Retry Cron | Integration | Retry failed push deliveries every minute | PRODUCTION READY | Scheduled Job | Integration Module, Cron Jobs | UAT 48 registered |

---

### ML Service (Current Scope)

| Feature Name | Category | Description | Current State | Availability | Dependencies | Notes |
|--------------|----------|-------------|---------------|--------------|--------------|-------|
| ML Document Parse | ML | `POST /parse` — tabular inventory extraction | CONDITIONAL | Internal Service | ML Service at `ML_URL` | Staging ML live; document path not re-run on staging |
| ML Intent Classification | ML | `POST /classify` — free-text message routing | READY WITH KNOWN ISSUES | Internal Service | ML Service at `ML_URL` | **Staging verified** — `team members dikhao` → `/members`; bare `members` → `general_chat` |
| ML Message Convert | ML | `POST /convert` — WhatsApp to plain text | NOT VERIFIED | Internal Service | ML Service | Endpoint exists; not exercised on staging |

---

### Finance (Schema Only)

| Feature Name | Category | Description | Current State | Availability | Dependencies | Notes |
|--------------|----------|-------------|---------------|--------------|--------------|-------|
| Finance Ledger Schema | Finance | DB tables for future ledger entries | DISABLED | — | PostgreSQL | Migration exists; no business-facing API or workflow |

---

## Section 3 — Feature Dependency Matrix

| Feature | Depends On | Required For Operation |
|---------|------------|------------------------|
| All persistent features | PostgreSQL | Yes |
| Owner Onboarding | OTP pepper, PostgreSQL | Yes |
| Owner Onboarding (SMS) | MSG91 credentials | No — dev OTP fallback |
| WhatsApp inbound/outbound | WhatsApp Provider (OLLI), messaging credentials | Yes for WhatsApp paths |
| WhatsApp webhook verify | WHATSAPP_VERIFY_TOKEN | Yes for Meta webhook |
| Structured WhatsApp commands | WhatsApp Provider | Yes |
| Worker/Vendor/PR workflows | Workflow Engine, PostgreSQL | Yes |
| Task + Inventory consumption | Task Module, Inventory Module | Yes |
| CSV Import (REST) | Inventory Module, PostgreSQL | Yes |
| CSV Import (WhatsApp) | Inventory Module, WhatsApp Provider | Yes |
| Document Parsing | ML Service, Document Module, PostgreSQL | Yes |
| Document → Inventory | Suggestion Approval, Inventory Module | Yes |
| Low Stock Alerts | Domain Events, Inventory Module, WhatsApp Provider | Yes |
| Manager Alerts | Domain Events, Departments Module | Yes |
| Purchase Requests | Inventory Module, PostgreSQL | Yes |
| PR Prefill | Purchase Request Module, Inventory Module | Yes |
| Zoho OAuth | ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REDIRECT_URI, ZOHO_ACCOUNTS_URL | Yes for live connect |
| Zoho Pull/Push | Active Zoho connection, Integration Module | Yes for sync |
| Zoho Push Retry | Cron Jobs, integration_push_deliveries table | Yes |
| Sync Failure Alerts | Domain Events, Integration Module | Yes |
| Domain Event handlers | Domain Event Processor cron | Yes |
| ML Intent Classification | ML Service running at ML_URL | Yes for free-text WhatsApp; **staging verified** with known NLP gaps (e.g. bare `members`) |
| WhatsApp Production Webhook | OLLI inbound, WHATSAPP_VERIFY_TOKEN | Yes for live staging webhook at `POST /webhook` |
| Olli webhook signature | Signing secret (not implemented) | No — `X-GetOlli-Signature` not verified today |

---

## Section 4 — External Dependencies

| Dependency | Purpose | Mandatory | Affected Features |
|------------|---------|-----------|-------------------|
| **PostgreSQL** | Primary data store | **Yes** | All features |
| **WhatsApp Provider (OLLI)** | Send/receive WhatsApp messages and media | **Yes** for WhatsApp | Commands, workflows, alerts, CSV WA import, onboarding SMS alternative |
| **WHATSAPP_VERIFY_TOKEN** | Olli/Meta webhook verification (`GET /webhook`) | **Yes** for production webhook | WhatsApp Production Webhook — **configured on staging** |
| **OLLI_URL / OLLI_KEY** | Messaging API auth (outbound + inbound routing) | **Yes** for outbound WhatsApp | All outbound notifications and workflow prompts — **configured on staging** |
| **OPENAI_API_KEY** | ML `/classify` and `/parse` | **Yes** for NLP and document parse | ML Intent Classification, ML Document Parse — **configured on staging ML** |
| **Olli Signing Secret** | Inbound webhook authenticity | **Not used** — verification not implemented | WhatsApp Production Webhook accepts unsigned POSTs |
| **ML Service (`ML_URL`)** | Document parse; optional classify | **Yes** for document parsing; optional for NLP | Document Parsing, ML Intent Classification |
| **OTP_PEPPER** | Hash onboarding OTP codes | **Yes** for onboarding | Owner Onboarding |
| **MSG91** (optional) | Production OTP SMS | No | Owner Onboarding |
| **Zoho OAuth env vars** | Connect to Zoho Inventory | **Yes** for live Zoho | Zoho Connect, Pull, Push |
| **Zoho API** | External inventory sync | **Yes** when connection active | Pull, Push, Retry |
| **MUNSHI_WEB_URL** (optional) | Template download links in messages | No | Static Import Template references |
| **Cron / ScheduleModule** | Background jobs | **Yes** for alerts/sync retry | Domain Events, Zoho sync, workflow expiry, push retry |
| **X_SECRET** | Internal/service auth (where configured) | Context-dependent | Messaging and internal calls |

### Scheduled Jobs (Registered Today)

| Job | Interval | Feature |
|-----|----------|---------|
| DomainEventsProcessorCron | Every minute | Domain Event Processor |
| ZohoScheduledSyncCron | Every 10 minutes | Zoho Scheduled Pull |
| ZohoPushRetryCron | Every minute | Zoho Push Retry |
| WorkflowExpiryCronService | Every hour | Workflow session expiry |

---

## Section 5 — Current Limitations (Existing Features Only)

1. **Document parsing** accepts structured CSV/Excel-style tabular files only. Scanned invoices, photos, and PDF tables are not supported.
2. **WhatsApp file upload** routes to CSV bulk import, not the document parsing and suggestion approval pipeline.
3. **Document parsing via REST** with `auto_process=true` fails when outbound messaging returns an auth error; manual extraction path works (UAT 7A).
4. **Duplicate SKUs within a single INITIAL_INVENTORY_IMPORT** suggestion may drop or fail to merge lines (Document B UAT).
5. **Document import** does not apply category, location, or reorder threshold from parsed fields — uses default category/location only.
6. **CSV import** requires existing category and location names that match the file (or template uses pre-seeded names).
7. **REST API** has no authentication layer; all endpoints assume a trusted network boundary.
8. **Zoho connect** requires OAuth environment variables configured; without them authorize returns an error.
9. **Zoho sync** requires an active stored connection; manual sync returns an error when none exists.
10. **Purchase request REST approve** requires request in pending state (`submit: true` on create); DRAFT cannot be approved directly.
11. **User roles** are OWNER, MANAGER, WORKER only — no separate Inventory Manager or Vendor Coordinator role types.
12. **ML intent classification** is live on staging but has NLP gaps — e.g. bare `members` maps to `general_chat` (owner home menu) instead of `/members`; use `/members` or phrases like *team members dikhao*.
13. **Olli inbound webhook** does not verify `X-GetOlli-Signature`; signing secret is unused.
14. **WhatsApp test webhook** (`/webhook/test`) is **enabled on staging** (`ENABLE_WEBHOOK_TEST_ROUTE=true`); disable before production.
15. **Staging pilot data** — factory Munshi has users and departments but **no inventory or tasks seeded**; inventory/task WhatsApp commands need seed data.
16. **MSG91 OTP** and **Zoho OAuth** are not configured on staging — web onboarding OTP and Zoho connect/sync paths are blocked there.
17. **Olli outbound delivery** — some messages fail with `Re-engagement message` (provider policy); onboarding template and structured replies generally succeed.
18. **Inventory REST mutations** expect quantity as string in several DTOs (e.g. `"20"` not `20`).
19. **Finance module** has database schema only — no user-facing capability.

---

## Section 6 — Verified Status

Legend: **Impl** = implementation reports (28–45); **IT** = integration tests; **UAT** = business UAT (49, 50); **Staging** = Railway `munshi-staging` live checks (2026-06-08)

| Feature Area | Impl | IT | UAT | Staging |
|--------------|------|-----|-----|---------|
| Platform health / migrations | Yes | PASS | PASS (48) | **PASS** — `/health`, `/health/migrations` |
| Phase 0 task-inventory | Yes (99-signoff) | 12/12 + later 115 suite | PASS (49) | **PARTIAL** — no inventory/tasks seeded |
| Phase 1 CSV import | Yes (27-signoff) | PASS | PASS (49, 7A baseline) | Not re-run |
| Phase 2 Zoho | Yes (39-signoff) | PASS | PARTIAL (49 — no OAuth env) | **BLOCKED** — `ZOHO_*` unset |
| Phase 3 alerts | Yes (41–42-signoff) | PASS | PASS (integration + 49) | Not re-run (needs stock data) |
| Phase 3.3A manager alerts | Yes (44-signoff) | PASS | PASS (integration) | Not re-run |
| Phase 3.4 PR prefill | Yes (45-signoff) | PASS | PARTIAL (49 stale route) | Not re-run |
| Document parsing 7A | Yes (documents module) | Limited | CONDITIONAL (50) | ML live; parse path not re-run |
| Onboarding & org | Yes | Partial | PASS (49) | **PASS** — factory Munshi, 7 users, 2 departments via API |
| WhatsApp webhook (Olli) | Yes | Partial | Not in UAT 49 | **PASS** — test webhook 201; inbound reply confirmed |
| WhatsApp commands | Yes | Partial | PASS (49) | **PARTIAL** — `/members` via NLP phrase; bare `members` fails |
| WhatsApp outbound (Olli) | Yes | Partial | UAT via test route | **PASS** — onboarding + team overview sent |
| Issues / Reports / Approvals | Yes | Not Verified | Not Verified | Not exercised |
| Business Discovery | Yes | Partial | Not Verified | Not exercised |
| ML classify (NLP) | Yes | Not Verified | Out of UAT 49 scope | **PARTIAL** — classify live; known intent gaps |
| Finance schema | Migration only | N/A | DISABLED | N/A |

---

## Section 7 — Executive Summary

### Feature counts by state

| Current State | Count |
|---------------|-------|
| PRODUCTION READY | 17 |
| READY WITH KNOWN ISSUES | 41 |
| CONDITIONAL | 11 |
| DEVELOPMENT ONLY | 0 |
| DISABLED | 2 |
| NOT VERIFIED | 24 |
| **Total features catalogued** | **95** |

### Can they be used today?

| Audience | Usable today? |
|----------|----------------|
| MSME owner on WhatsApp (structured commands) | **Yes** — UAT-verified; on **staging** needs inventory/task seed data for full E2E |
| MSME owner on WhatsApp (live Olli staging) | **Partial** — webhook live, onboarding + `/members` work; NLP gaps and provider delivery limits apply |
| MSME owner via REST (trusted network) | **Yes** — staging backend live; same domains plus admin CRUD |
| MSME uploading supplier CSV for reviewed import | **Yes** — via REST + ML + YES approval (conditional); not re-run on staging |
| MSME uploading invoice photos | **No** |
| MSME requiring Zoho sync | **Only after** OAuth env + connection configured — **blocked on staging** |
| MSME using free-text WhatsApp (no slash commands) | **Partial** — ML classify live on staging; not full UAT coverage; use explicit slash commands when unsure |

### Overall product state (today)

**Munshi today** is an operational **WhatsApp-first MSME backend** covering organization setup, task management with inventory linkage, inventory ledger and CSV import, tabular document import with human approval, purchase requests, low-stock and sync-failure alerting, and Zoho integration (when configured). Capabilities are **implemented and integration-tested** across Phase 0–3; **business UAT** confirms core journeys as **ready with known issues**.

**Staging (`munshi-staging`)** is **live** on Railway with backend, ML, and PostgreSQL connected to GitHub autodeploy. Pilot factory **Munshi** validates org setup, Olli webhook in/out, and ML classification with documented gaps. Remaining staging blockers: seed inventory/tasks, configure MSG91/Zoho, implement webhook signature verification, disable test webhook route before prod.

This registry is the source of truth for **what exists today**. For validation evidence, see `docs/docs_local/inventory/49-uat-signoff.md`, `50-document-uat-signoff.md`, `docs/docs_local/deployment/36-staging-signoff.md`, `docs/docs_local/pilot/23-live-webhook-readiness.md`, `docs/docs_local/pilot/36-onboarding-signoff.md`, and phase signoff reports `27-*`, `39-*`, `99-*` without treating them as future plans.

---

*End of registry.*
