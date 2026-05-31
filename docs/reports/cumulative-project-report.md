# Munshi Dada — Cumulative Project Report

**Date:** 2026-05-29  
**Repository:** Munshi backend (NestJS 11 + PostgreSQL + WhatsApp-first)  
**Scope:** Everything implemented from initial codebase through **Prompt 8** (document ingestion orchestration)

> **Prompt 8 addendum:** Document upload, storage abstraction, ML parser integration, contract validation, suggestion queue, and workflow auto-trigger. See `docs/reports/prompt-8-*.md`. Backend tests: **102 passing**.

---

## 1. Executive summary

Munshi is a **WhatsApp-first Business Operations Orchestration Layer** for factories. Users interact primarily through WhatsApp; the backend also exposes REST APIs for administration and TraderOS extensions.

The project evolved in five structured prompts:

| Phase | Focus | Outcome |
|-------|--------|---------|
| **Prompt 1** | Architecture analysis | Documented existing Munshi OIL system |
| **Prompt 1.5** | Infrastructure audit | CI/CD, deployment, secrets documented |
| **Prompt 2** | TraderOS foundation | 7 new DB tables + skeleton REST modules |
| **Prompt 3** | Vendor master | Full vendor CRUD (REST) |
| **Prompt 4** | Workflow engine | Multi-step sessions + vendor WhatsApp onboarding |
| **Prompt 5** | Workflow hardening | Cancel, expiry, worker WhatsApp onboarding |

**Today:** Core factory operations (tasks, attendance, departments, issues, reports) are fully live on WhatsApp. Vendor and worker onboarding run through a **generic Workflow Engine**. Inventory, procurement, and approvals have **schema + REST stubs only**.

**Tests:** 67 passing (Jest)  
**Database:** 18 tables  
**Latest commit:** `b81bd3c` — workflow hardening + worker onboarding

---

## 2. System architecture (current)

```text
                    ┌─────────────────────────────────────┐
                    │         WhatsApp Users              │
                    │   Owners · Managers · Workers       │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │   Olli WABA Gateway (OLLI_URL)      │
                    └──────────────┬──────────────────────┘
                                   │ POST /webhook
                    ┌──────────────▼──────────────────────┐
                    │         WhatsAppModule              │
                    │   handleIncomingMessage()           │
                    └──────────────┬──────────────────────┘
           ┌───────────────────────┼───────────────────────┐
           │                       │                       │
    ┌──────▼──────┐      ┌────────▼────────┐     ┌───────▼───────┐
    │  Workflow   │      │  ML Classifier  │     │ Slash bypass  │
    │   Engine    │      │   (ML_URL)      │     │ (mgr cmds)    │
    └──────┬──────┘      └────────┬────────┘     └───────┬───────┘
           │                        │                       │
           └────────────────────────┼───────────────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │      processCommand()         │
                    │   Domain services (tasks,     │
                    │   attendance, issues, etc.)   │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │   PostgreSQL (18 tables)      │
                    └───────────────────────────────┘
```

**Stack:** NestJS 11 · TypeScript · Sequelize · PostgreSQL · Swagger `/api/docs`  
**Deploy:** GitHub Actions → Docker Hub → EC2 (Docker Compose)  
**Tenancy:** All business data scoped by `factory_id`

---

## 3. Work completed by prompt

### Prompt 1 — Architecture analysis (2026-05-28)

- Deep analysis of existing Munshi codebase
- Documented WhatsApp orchestration, task routing, roles, risks
- **Output:** `docs/architecture-analysis.md` (no code changes)

### Prompt 1.5 — Infrastructure audit (2026-05-28)

- Audited CI/CD, Docker, EC2 deployment, external dependencies
- Identified Docker Hub user, secrets, and migration gaps
- **Output:** `docs/infrastructure-dependency-audit.md`, `docs/deployment-architecture.md`, `docs/infra-audit.md`

### Prompt 2 — TraderOS foundation schema (2026-05-29)

- **Migration `001_traderos_foundation.sql`** — 7 tables:
  - `vendors`, `inventory_categories`, `inventory_locations`, `inventory_items`, `inventory_transactions`, `purchase_requests`, `approval_requests`
- Sequelize models + skeleton services returning `"Not Implemented Yet"`
- REST route stubs for inventory, purchase requests, approvals
- **Output:** Prompt 2 reports, `docs/reports/current-database-analysis.md`

### Prompt 3 — Vendor master management (2026-05-29)

- **Migration `002_vendors_master.sql`** — `phone_number` required, unique name/phone per factory
- Full **Vendor CRUD** via REST (`/vendors`, search, pagination, soft deactivate)
- Validation layer + 19 unit tests
- **No WhatsApp** in Prompt 3 (REST only)

### Prompt 4 — Workflow engine + vendor onboarding (2026-05-29)

- **Migration `003_workflow_sessions.sql`** — `workflow_sessions` table
- Generic **Workflow Session Engine** (registry, session lifecycle, router)
- **`/onboard_vendor`** — 5-step WhatsApp conversation → `VendorService.createVendor()`
- WhatsApp routing: active session interception, ML + slash entry paths
- 23 workflow tests; ML integration **unchanged**
- **Output:** 5 Prompt 4 reports

### Prompt 5 — Workflow hardening + worker onboarding (2026-05-29)

- **`/cancel`** — cancel active workflow
- **Session expiry** — configurable TTL (default 24h), on-access + hourly cron
- **Recovery** — expired session notification; message falls through to normal routing
- **`/onboard_worker`** — second registry workflow (name, phone, department, DOJ)
- Reuses `FactoryService.assignMember()`, `DepartmentsService.addWorker()`, welcome message
- 67 total tests (+25 new)
- **Output:** 4 Prompt 5 reports

---

## 4. Database (18 tables)

| Module | Table | Status |
|--------|-------|--------|
| Core | `factories`, `users`, `factory_users` | Live |
| Departments | `departments`, `department_workers` | Live |
| Operations | `tasks`, `task_updates`, `attendance`, `issues` | Live |
| Workflow | `workflow_sessions` | Live |
| Vendors | `vendors` | Live (REST + WhatsApp) |
| Inventory | `inventory_categories`, `inventory_locations`, `inventory_items`, `inventory_transactions` | Schema only |
| Procurement | `purchase_requests` | Schema only |
| Approvals | `approval_requests` | Schema only |

**Migrations to apply:**

```bash
psql "$POSTGRES_CONNECTION_STRING" -f migrations/001_traderos_foundation.sql
psql "$POSTGRES_CONNECTION_STRING" -f migrations/002_vendors_master.sql
psql "$POSTGRES_CONNECTION_STRING" -f migrations/003_workflow_sessions.sql
```

---

## 5. Implementation maturity

| Capability | WhatsApp | REST | Notes |
|------------|----------|------|-------|
| Attendance | ✅ | ✅ | Present/absent daily |
| Tasks | ✅ | ✅ | Assign, complete, update, manager routing |
| Departments | ✅ | ✅ | Owner dept assignment; worker mapping |
| Issues | ✅ | ✅ | Report, list, resolve |
| Reports | ✅ | ✅ | Daily factory summary |
| Team / members | ✅ | ✅ | View active members |
| Help | ✅ | — | Command hints |
| Vendor onboarding | ✅ | ✅ | Multi-step workflow |
| Worker onboarding | ✅ | — | Multi-step workflow |
| Vendor CRUD | — | ✅ | Full CRUD + search |
| Inventory | — | ⚠️ Stub | "Not Implemented Yet" |
| Purchase requests | — | ⚠️ Stub | "Not Implemented Yet" |
| Approvals | — | ⚠️ Stub | "Not Implemented Yet" |

---

## 6. User roles

| Role | Who | Primary capabilities |
|------|-----|----------------------|
| **OWNER** | Factory owner | Assign to departments, all task powers, reports, onboard vendor/worker |
| **MANAGER** | Department head | Route owner tasks, delegate to workers, reports, onboard vendor/worker |
| **WORKER** | Shop-floor staff | Attendance, tasks, issues, updates — **cannot start workflows** |

**Constraints:**
- One user → one factory (`factory_users.user_id` unique)
- One worker → one department (`department_workers.user_id` unique)
- One manager → one department per factory

---

## 7. User experience — how people use Munshi

### 7.1 First contact — any user

```text
User opens WhatsApp → messages Munshi bot
        │
        ▼
System looks up phone in `users` + `factory_users`
        │
        ├── Not registered → "User not registered"
        └── Registered → routing begins (see 7.2)
```

**Onboarding a new worker (owner/manager UX):**

```text
Owner sends: /onboard_worker
        │
        ▼
Munshi: "What is the worker name?"
Owner:  "Anil Kumar"
Munshi: "What is the worker phone number?"
Owner:  "9876543210"
Munshi: "Select department:" [lists Sales, IT, …]
Owner:  "Sales"
Munshi: "Date of joining? YYYY-MM-DD or SKIP"
Owner:  "SKIP"
        │
        ▼
Munshi (to owner): "Worker onboarded successfully"
Munshi (to worker): "Welcome to Munshi — you can now interact on WhatsApp"
        │
        ▼
Worker can immediately: present, tasks, issues, help
```

---

### 7.2 Message routing — what happens to every WhatsApp message

```text
Incoming message
        │
        ▼
Is it /cancel ?
   YES → Cancel workflow (or "no active workflow" message) → END
        │
        NO
        ▼
Active workflow session?
   YES → Route to workflow step handler (skip ML & commands) → END
        │
   Was session just expired?
   YES → Send "workflow expired" → continue below
        │
        NO active session
        ▼
Manager slash bypass? (/mgrself, /mgrassign, /mgrtransfer, /mgrreject)
   YES → Execute command directly (skip ML) → END
        │
        NO
        ▼
Workflow start? (/onboard_vendor, /onboard_worker)
   YES → Start multi-step workflow → END
        │
        NO
        ▼
Send to ML classifier (natural language)
        │
        ├── ML returns workflow command → Start workflow → END
        └── ML returns other intent → processCommand() → END
```

**Two first-class interfaces:**

| Method | Example | Path |
|--------|---------|------|
| Natural language | "mark me present" | ML → `/present` → attendance |
| Direct slash | `/onboard_worker` | Workflow engine (no ML) |

---

### 7.3 Worker — typical day

```text
Morning
───────
Worker: "present"
Munshi: ━━━━━━━━━━━━━━━
        *Attendance recorded*
        You have been marked *Present* for today.

During the day
──────────────
Owner/Manager assigns task (Worker receives WhatsApp notification)

Worker: "show my tasks"
Munshi: [Lists pending tasks with IDs]

Worker: "complete task 4"
Munshi: *Task completed* — Task #4 …

Worker: "machine belt broken"
Munshi: *Issue reported* — management notified

Worker: /help
Munshi: [Full command guide — attendance, tasks, issues, team]
```

**Worker cannot:** start vendor/worker onboarding, run reports, assign tasks to others.

---

### 7.4 Manager — task routing flow

When an **owner assigns a task to a manager**, the manager receives a routing prompt:

```text
Owner: "Assign to sales: prepare today's figures"
        │
        ▼
Manager receives WhatsApp with options:
  • "I will do task 12"     → /mgrself
  • "@anil will do task 12" → /mgrassign (delegate)
  • /mgrtransfer 12 sales   → send to another department
  • /mgrreject 12 reason    → reject (owner notified)
```

**Manager self-accept:**

```text
Manager: "I will do task 12"
        │
        ▼
Task stays with manager → routing_status updated → worker-style completion available
```

**Manager delegates:**

```text
Manager: "@anil will do task 12"
        │
        ▼
Task reassigned to worker Anil → Anil notified on WhatsApp
```

**Manager rejects misrouted task:**

```text
Manager: /mgrreject 12 not our department
        │
        ▼
Task frozen → Owner notified with reason
```

---

### 7.5 Owner — department assignment

```text
Owner: "Assign to IT: fix server backup"
        │
        ▼
ML returns /depart_assign + depart_slug=it
        │
        ▼
Task created for IT department manager → manager gets routing prompt
```

Owners can also assign directly to individuals:

```text
Owner: "@anand clean warehouse today"
        │
        ▼
Task assigned directly to worker → immediate notification
```

---

### 7.6 Owner / Manager — vendor onboarding

**Entry:** `/onboard_vendor` or natural language ("Add a vendor") if ML maps to `/onboard_vendor`

```text
/onboard_vendor
        │
        ▼
Step 1: Vendor name?        → "ABC Steel"
Step 2: Phone number?       → "9876543210"
Step 3: GST? (SKIP ok)      → "SKIP"
Step 4: Address? (SKIP ok)  → "Delhi"
        │
        ▼
VendorService.createVendor()
        │
        ▼
Munshi: *Vendor created successfully*
        Vendor #5 · ABC Steel · 9876543210 · Delhi
```

**During workflow:** any message is treated as step input (not re-classified by ML).  
**Exit:** `/cancel` or wait 24h (session expires).

---

### 7.7 Owner / Manager — multi-step workflow UX

```text
┌─────────────────────────────────────────────────────────┐
│  ACTIVE WORKFLOW SESSION (one per phone)                │
│                                                         │
│  • All messages → workflow handler                      │
│  • ML classification OFF                                │
│  • Normal commands OFF (/present, /assign, etc.)        │
│  • /cancel → cancels session                            │
│  • 24h TTL → session EXPIRED → restart required         │
└─────────────────────────────────────────────────────────┘
```

**Cancel anytime:**

```text
User: /cancel
Munshi: *Workflow cancelled*
        You can start again with /onboard_vendor or /onboard_worker
```

**Session expired:**

```text
User: [sends answer after 24h]
Munshi: *Workflow expired*
        Please send /onboard_vendor or /onboard_worker to start again.
        [Same message then processed normally — e.g. ML classifies it]
```

---

### 7.8 Reports (Manager / Owner)

```text
Manager: /report
        │
        ▼
Munshi: Daily factory summary
        — Attendance counts
        — Task activity
        — Open issues
        (Formatted with dividers)
```

Optional date: `/report 2026-05-28` or natural language with date entity from ML.

---

### 7.9 Automated reminders (background)

| Cron | Schedule | Who receives |
|------|----------|--------------|
| Attendance reminder | Daily 9:00 IST | Workers who haven't marked attendance |
| Attendance follow-up | Every 2 hours IST | Same |
| Task deadline breach | Hourly :10 IST | Worker + assigner when deadline missed |
| Workflow expiry | Hourly | Stale ACTIVE sessions → EXPIRED |

---

## 8. REST API surface (admin / integrations)

| Route prefix | Status |
|--------------|--------|
| `/webhook` | Live — WhatsApp ingress |
| `/users` | Live |
| `/factories` | Live |
| `/departments` | Live |
| `/tasks` | Live |
| `/attendance` | Live |
| `/issues` | Live |
| `/reports` | Live |
| `/vendors` | Live — full CRUD |
| `/inventory/*` | Stub |
| `/purchase-requests` | Stub |
| `/approvals` | Stub |
| `/health` | Live |
| `/api/docs` | Swagger |

**Note:** Most REST routes lack auth guards by default; `X_SECRET` guard exists but is not globally applied.

---

## 9. External integrations

| Service | Env vars | Purpose |
|---------|----------|---------|
| PostgreSQL | `POSTGRES_CONNECTION_STRING` | Primary database |
| Olli WABA | `OLLI_URL`, `OLLI_KEY` | Send/receive WhatsApp |
| ML classifier | `ML_URL` | Natural language → command + entities |
| Meta webhook | `WHATSAPP_VERIFY_TOKEN` | GET verification |
| Workflow TTL | `WORKFLOW_SESSION_TTL_HOURS` | Default 24 |

---

## 10. Test coverage

```
yarn test → 10 suites, 67 tests passed
yarn build → succeeds
```

| Area | Tests |
|------|-------|
| Vendor validation + service | 19 |
| Vendor onboarding workflow | 8 |
| Worker onboarding (validation, service, handler) | 15 |
| Workflow session + registry + routing + hardening | 25 |

---

## 11. Git history (feature commits)

| Commit | Description |
|--------|-------------|
| `21b2b7a` | Initial commit |
| `4773609` | Ownership migration |
| `e2a74df` / `1c062ac` | GCP deployment |
| `2f34238` | TraderOS foundation schema |
| `cf721ba` | Vendor master CRUD |
| `0b4c3fe` | Workflow engine + vendor onboarding |
| `b81bd3c` | Workflow hardening + worker onboarding |

---

## 12. Not yet implemented

- Inventory CRUD and `/inventory_create` workflow
- Purchase request and approval business logic
- Manager onboarding workflow
- Procurement / financial / Account Aggregator modules
- REST authentication guards (platform-wide)
- DB foreign key constraints on TraderOS tables
- ML intent mapping verification for new workflow commands

---

## 13. Recommended next step — Prompt 6

**Inventory foundation + `/inventory_create` workflow**

1. Implement inventory category, location, item CRUD
2. Single transaction path for quantity changes
3. Third workflow type to validate engine at scale

See `docs/reports/prompt-5-next-steps.md`.

---

## 14. Documentation index

| Document | Content |
|----------|---------|
| `docs/architecture-analysis.md` | Deep architecture (Phases 1–5) |
| `docs/implementation-report.md` | Latest phase log |
| `docs/deployment-architecture.md` | CI/CD and EC2 |
| `docs/reports/cumulative-project-report.md` | This document |
| `docs/reports/prompt-*` | Per-prompt detailed reports |
| `docs/reports/future-work-report.md` | Roadmap |
| `migrations/README.md` | SQL migration index |

---

*Generated after Prompt 7 completion — reflects full codebase state as of 2026-05-29.*

---

## 15. Prompt 6 — Inventory Management (2026-05-29)

- Full inventory CRUD (categories, locations, items)
- `InventoryTransactionService` — sole quantity write path (Option B cache)
- `/inventory_create` workflow (3rd registry workflow)
- `/inventory_status` WhatsApp foundation
- Migration `004_inventory_master.sql`
- **80 tests** at completion

See `docs/reports/prompt-6-*.md`.

---

## 16. Prompt 7 — Document Processing Foundation (2026-05-29)

- **DocumentModule** with 4 entities + migration `005`
- Document registry (contracts only — no parsers)
- Extraction storage + validation contracts
- Generic suggestion engine (no auto-execution)
- Inventory bootstrap: `INITIAL_INVENTORY_IMPORT`
- New item detection: `NEW_INVENTORY_ITEM`, `STOCK_IN`
- Workflow: `SUGGESTION_APPROVAL` YES/NO via existing engine
- LLM specification framework (dual-section reports)
- **95 tests passing**

**Architectural rule:** LLM = intent classification + document parsing only. All CRUD via backend after approval.

See `docs/reports/prompt-7-*.md`.

---

## 17. Updated status

| Area | Status |
|------|--------|
| Inventory | Live (REST + workflow + document bootstrap) |
| Document processing | Foundation live (no parsers) |
| Procurement / approvals | Schema + REST stubs |
| Workflows | 4 types: vendor, worker, inventory create, suggestion approval |
| Tests | 95 passing |
| DB tables | 22 (18 + 4 document tables) |
