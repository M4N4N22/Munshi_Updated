# Munshi OIL — Architecture Analysis (Phase 1)

This document is a **deep analysis of the existing codebase** to support safe, incremental extension into **TraderOS**, **Financial Intelligence**, and **Inventory Intelligence**.

**Non-goals (per Phase 1):**
- No workflow rewrites
- No refactors beyond documentation
- No new infrastructure
- No new business logic

---

## Existing Architecture Overview

### Runtime / framework
- **NestJS v11** application, started from `src/main.ts`.
- **HTTP API + Swagger**: Swagger mounted at `/api/docs`.
- **Global validation**: `ValidationPipe` with `transform: true`.
- **Global logging interceptor**: `LoggerInterceptor` logs HTTP request metadata.
- **Global exception filter**: `HttpExceptionFilter` wraps errors into `HttpResponseDto` shape.

### High-level module graph
`AppModule` (`src/app/api/app.module.ts`) imports:
- **Config**: `ConfigModule.forRoot({ isGlobal: true })`
- **Scheduler**: `ScheduleModule.forRoot()` (cron jobs run inside the API process)
- **DB**: `DbModule` (global provider)
- **Logger**: `LoggerModule`
- **Health**: `HealthCheckModule`
- **Messaging entrypoint**: `WhatsAppModule`
- **Domain services**: `UserModule`, `FactoryModule`, `IssueModule`, `ReportsModule`, `TasksModule`, `DepartmentsModule`

**Key architectural characteristic**: Most “business workflows” are orchestrated through **WhatsApp** interactions, backed by SQL entities keyed by `factory_id`.

### Controllers vs services (pattern)
Each domain folder (e.g. `src/services/tasks`) typically contains:
- a `*.module.ts` that exports the service
- a service file that includes both:
  - `@Injectable()` service class
  - an `@Controller()` controller class in the same file (e.g. `TasksController` in `tasks.service.ts`)

This is functional but creates “large files” and mixes concerns; it’s a refactor candidate later, but not required for Phase 1.

---

## Existing Domain Structure

### Core / cross-cutting (`src/core`)
- **DB Service**: `src/core/services/db-service`
  - `DbService` is a `@Global()` provider that initializes DB connections in a factory.
  - **SQL (Postgres)** is active; **Mongo** provider exists but currently commented out.
  - The app uses **Sequelize** (not Sequelize migrations) with model init functions.
- **Messaging**: `src/core/messaging`
  - `MessagingService` sends WhatsApp text/template messages via **Olli WABA gateway** (`process.env.OLLI_URL`, `process.env.OLLI_KEY`).
  - Contains reusable WhatsApp message builders (task prompts, completion messages, issue broadcasts, etc).
- **Logging**: `LoggerService`, `LoggerInterceptor`
- **HTTP error shaping**: `HttpExceptionFilter`, `HttpResponseDto`
- **Internal API guard**: `InternalCallGuard` checks header `x-secret` equals `process.env.X_SECRET` (guard exists, but endpoints need to apply it explicitly to be protected).
- **Health**: Terminus health check for SQL connection.

### Domain services (`src/services`)
Primary domain areas implemented today:
- **Factories**: factory CRUD + membership assignment (`Factory`, `FactoryUser`)
- **Users**: user CRUD, search/pagination, deletion cascade behavior
- **Departments**: department setup, manager assignment, worker mapping (`Department`, `DepartmentWorker`)
- **Tasks**: assignment + routing workflows, updates, admin endpoints, deadline reminders (`Task`, `TaskUpdate`)
- **Attendance**: mark present/absent daily (`Attendance`)
- **Issues**: create and resolve issues (`Issue`)
- **Reports**: per-factory daily report summarizing the above

### WhatsApp module (`src/modules/whatsapp`)
Acts as the **primary workflow ingestion layer**:
- Webhook controller at `/webhook` with Meta verification (GET) and inbound message (POST)
- `WhatsAppService` orchestrates:
  - AI classification call to `ML_URL /classify`
  - interpretation of intent → command routing
  - calling domain services
  - sending WhatsApp response via `MessagingService`
- Includes cron service for attendance reminders (`AttendanceCronService`)

---

## Existing Workflow Structure

### Roles and scoping
The system models a factory as the primary scope boundary:
- Many tables include `factory_id` (tasks, departments, attendance, issues, factory_users)
- Users are linked to a factory through `FactoryUser`
- Current schema strongly suggests: **a user belongs to at most one factory** (`factory_users.user_id` is `unique: true`)

Roles come from `FactoryUser.role` (see `USER_ROLE`):
- **OWNER**: can assign to departments and members broadly, receives escalations
- **MANAGER**: can assign within constraints; can route owner-created tasks
- **WORKER**: executes tasks, provides updates, marks attendance

### Task workflows (core)
Tasks are the most “workflow-rich” entity.

#### 1) Direct assignment
When assigner is not OWNER→MANAGER, routing is **direct**:
- `routing_status = DIRECT` (or historically null/empty; code handles both)
- `notifyWorkerTaskAssigned(taskId)` sends WhatsApp message to assignee.

#### 2) Owner → Manager “routing decision” flow
When an **OWNER assigns a task to a MANAGER**:
- `routing_status = AWAITING_MANAGER_ACTION`
- `owner_id = assigned_by` (owner)
- System sends a **manager routing prompt** on WhatsApp listing assignable workers and options:
  - manager self-execution (`/mgrself` or NL “I will do task N”)
  - delegate to worker (`/mgrassign` or NL “@anil will do task N”)
  - transfer to another department (`/mgrtransfer N dept`)
  - reject with reason (`/mgrreject N reason`)

The manager actions update the same `Task` row:
- **MANAGER_SELF**: manager keeps task
- **DELEGATED_TO_WORKER**: task reassigned to a worker; `assigned_by` becomes manager
- **REJECTED_BY_MANAGER**: task frozen from completion; owner notified with reason

This flow is central to “department routing” and must not break.

#### 3) Department assignment (owners only)
There is an ML-supported path to assign a task to a **department**:
- ML can return `depart_slug`, and intent `/depart_assign` (or `/assign` with no `@mention` but with `depart_slug`)
- The system resolves department → department manager, then creates a task assigned to that manager and ties `department_id` explicitly.

### Department routing constraints
`DepartmentsService` enforces key rules:
- Department slugs are normalized and unique per factory (`factory_id + slug`)
- A manager can head only one department per factory (`factory_id + manager_user_id` unique)
- Manager assignment rights:
  - Managers can assign to workers in their department **plus** workers not attached to any department in the factory
  - Owners can assign broadly

### Issues workflow
- Anyone can report an issue (via WhatsApp `/issue ...`)
- Owners/managers are broadcasted issue opened/resolved notifications via WhatsApp
- Managers resolve issues (via WhatsApp “resolve issue N”)

### Attendance workflow
- Workers mark attendance daily (present/absent)
- A cron service sends template reminders to workers who have not marked attendance that day

### Report workflow
- Generates a daily summary per factory: attendance, tasks, issues
- Used through WhatsApp `/report` (manager-only) and REST `/reports`

---

## Existing Messaging Flow (WhatsApp)

### Inbound: webhook → WhatsAppService
`WhatsAppController`:
- GET `/webhook`: Meta verification via `WHATSAPP_VERIFY_TOKEN`
- POST `/webhook`: expects `body.data` (likely from Olli WABA gateway) with:
  - `data.type === "text"`
  - `data.from`
  - `data.text`
- Also POST `/webhook/test` supports internal testing with `WhatsAppIncomingDto`.

### Classification: AI (FastAPI) call
In `WhatsAppService.handleIncomingMessage`:
- If message matches explicit “manager slash commands” (`/mgrself`, `/mgrassign`, `/mgrtransfer`, `/mgrreject`), ML is bypassed.
- Otherwise it calls:
  - `POST ${ML_URL}/classify?message=<urlencoded>`
- Response is normalized through `parseMlClassifyResponse` to:
  - `intent` (or `command`)
  - `id` (task or issue id)
  - `worker_slug` (for assignment mention)
  - `depart_slug` (department assignment)
  - `reject_reason`, `deadline`, `date`, `datetime`, `time`

### Command routing: `processCommand`
`processCommand`:
- Loads `user` by phone number (`UserService.findByPhone`)
- Derives:
  - `factoryId` from `user.factory_links.factory_id`
  - `role` from `user.factory_links.role`
- Routes intent to domain actions:
  - attendance present/absent
  - list tasks, complete task, assign, update
  - list issues, create issue, resolve issue
  - report, members/team overview
  - manager routing commands (self/delegate/transfer/reject)
  - department assign special path (owners only)
- Returns a string/body which is sent back to the same sender.

### Outbound: Olli WABA gateway
All WhatsApp sends go through `MessagingService`:
- `POST ${OLLI_URL}/external/waba/send`
- Headers: `X-API-Key: OLLI_KEY`
- Payload:
  - `type: "text"` with `text.body`
  - or `type: "template"` with `template.name/language/components`

**Async handling pattern**: “fire-and-forget” background sends via `MessagingService.fireAndForget(promise, label)` to avoid failing the main request path.

---

## Existing AI Flow

### What the AI is responsible for
AI is used to convert natural language WhatsApp text into a structured command:
- **Intent**: the command to execute (often treated as a `/command`)
- **Entity extraction**: task/issue id, mention slug, department slug
- **Time extraction**: deadline/date/time fields
- **Rejection reason extraction**: for `/mgrreject`

### How the AI response is consumed
The system is defensive about schema drift:
- Accepts both `intent` and `command`
- Accepts department slug fields: `depart_slug`, `department_slug`, `department`
- Accepts `reject_reason` or `reason`
- Treats empty strings as null

### Where AI boundaries are sharp
The app expects the AI to output data aligned to existing constraints:
- A `depart_slug` must map to an existing department in the same `factory_id`
- A `worker_slug` must map to a resolvable `@mention` for `TasksService.resolveMention`
- `id` must be numeric when required (task/issue ids)

**Operational risk**: there is no explicit versioning of the ML contract; changes to classifier output shape can silently break flows.

---

## Existing Database Design

### Technology
- **Postgres + Sequelize** using `new Sequelize(uri, { dialect: 'postgres' })`.
- Models are defined via Sequelize `Model.init` in `*.schema.ts` and registered through `src/core/services/db-service/models.ts`.
- Associations are applied by calling each model’s static `associate(models)`.

### Tables / entities (current SQL)
Registered SQL models:
- `User` (`users`): `phone_number` unique; has one `FactoryUser`
- `Factory` (`factories`)
- `FactoryUser` (`factory_users`): link user→factory + role
  - `user_id` is unique (strong single-factory membership assumption)
- `Department` (`departments`): unique `(factory_id, slug)` and unique `(factory_id, manager_user_id)`
- `DepartmentWorker` (`department_workers`): maps worker to department
  - `user_id` unique (worker can belong to one department globally; also implies single-factory membership)
- `Task` (`tasks`): `factory_id`, `assigned_to`, `assigned_by`, `owner_id`, `department_id`, `routing_status`, `deadline`, completion + rejection fields
- `TaskUpdate` (`task_updates`)
- `Attendance` (`attendance`) (daily; unique constraint appears enforced by DB/model)
- `Issue` (`issues`)

### Multi-tenancy pattern (practical)
The app implements “multi-tenancy” as **row-level tenancy by `factory_id`**, with a hard constraint that a user cannot be in multiple factories.

This has consequences for extension:
- Any new TraderOS / Inventory / Finance entities should likely include `factory_id` to remain consistent.
- Cross-factory analytics will require explicit super-admin patterns later.

### Migrations & schema management
There are **no migrations** in the repo.
- `sequelize.sync()` exists but is commented out in `DbService`.
- Production likely relies on an **externally managed schema** (manual SQL / existing DB).

**Risk**: Adding new tables/columns requires a safe migration strategy before implementing features.

---

## Existing Deployment Design

### Docker
`Dockerfile` is a two-stage build:
- build: `yarn install` → `yarn build`
- prod: copies `dist`, `node_modules`, `package.json`, `tsconfig.json`
- runs `yarn start`

**Potential mismatch**:
- Container `EXPOSE 4000`, but the app listens on `PORT ?? 3000` in `src/main.ts`.
- In production this must be coordinated via `PORT=4000` or Dockerfile updated later (do not change yet).

### CI/CD (GitHub Actions)
Workflow `.github/workflows/cicd.yml`:
- On push to `main`: builds and pushes multi-arch Docker image to Docker Hub (`latest` tag)
- Deploy step SSHes to EC2 and runs `restart-docker-compose` in a fixed `PROJECT_PATH`

### Environment variables (observed usage)
Core envs used in code:
- **API runtime**: `PORT`, `CORS_ORIGIN`
- **DB**: `POSTGRES_CONNECTION_STRING` (Mongo currently unused/commented)
- **WhatsApp inbound**: `WHATSAPP_VERIFY_TOKEN`
- **WhatsApp outbound via Olli**: `OLLI_URL`, `OLLI_KEY`, optional `WHATSAPP_ONBOARDING_TEMPLATE`
- **AI**: `ML_URL`
- **Internal guard**: `X_SECRET`

### Redis / queues
No Redis/bull/queue integration present.
Async work is handled via:
- cron jobs (scheduler)
- “fire-and-forget” promises for notifications

---

## Reusable Architectural Patterns

### 1) “Workflow via WhatsApp, persistence in SQL”
The most reusable pattern for TraderOS increments:
- incoming WhatsApp message → classify → validate role + factory → service method → DB writes → outbound WhatsApp notifications

### 2) “Factory-scoped authorization by membership”
Most service methods accept `(user_id, factory_id, ...)` and enforce:
- the resource row’s `factory_id` matches
- the user’s role matches constraints

### 3) “Routing via explicit state machine (routing_status)”
`Task.routing_status` is an explicit state machine used to protect workflows from invalid transitions.
This pattern is reusable for:
- approvals
- inventory movements approval
- payments approvals

### 4) “Notification builders centralized in MessagingService”
Avoid scattering WhatsApp formatting across services; many templates already live in `MessagingService`.

---

## Areas That Must NOT Be Broken

These are tightly coupled flows that TraderOS additions must preserve:
- **Owner → Manager routing** for tasks (`AWAITING_MANAGER_ACTION` → `MANAGER_SELF` / `DELEGATED_TO_WORKER` / `REJECTED_BY_MANAGER`)
- **Department assignment constraints** (manager assign scope; department slug normalization)
- **Worker flows**:
  - mark attendance
  - view tasks
  - update/complete tasks
- **WhatsApp inbound contract** (webhook payload shape through Olli)
- **ML contract** (intent + extracted fields) for existing intents
- **Notification side effects** (issue broadcasts, task prompts, deadline reminders)

---

## Areas That Need Refactoring (Later, not now)

### 1) `WhatsAppService` is a “god service”
It mixes:
- inbound parsing
- ML calls
- authorization
- orchestration across domains
- formatting utilities
- cron logic (attendance reminders)

Recommendation (later): split into internal components (router/handlers) while preserving behavior.

### 2) REST admin endpoints appear unauthenticated
Controllers for tasks/users/factories/departments/issues are public unless guarded externally.
Recommendation (later): apply `InternalCallGuard` or introduce proper auth.

### 3) Lack of migrations
Schema changes are currently risky.
Recommendation (later): add migrations or a controlled sync strategy.

### 4) Deployment configuration mismatch (PORT vs EXPOSE)
Recommendation (later): align container port exposure and runtime port configuration.

### 5) Observability and failure handling
Outbound messaging is synchronous in loops with small delays; there’s no queue, retry policy, or idempotency.
Recommendation (later): introduce a queue/worker pattern if volume grows.

---

## Recommended Extension Strategy (TraderOS / Finance / Inventory)

### Guiding constraints
- **Do not rewrite WhatsApp**; extend intents incrementally.
- Keep **factory-scoped row tenancy** consistent.
- Reuse the existing **workflow state machine** pattern for approvals/routing.

### Stepwise approach (safe increments)
1. **Define new SQL entities** (schema + model registration) with `factory_id`, timestamps, and clear associations.
2. Add **service methods** in new domain modules that are callable from:
   - WhatsApp intents (later)
   - internal REST endpoints (for dashboards/ops tooling)
3. Add new WhatsApp intents in the classifier **without changing existing intent semantics**.
4. Add WhatsApp command routing handlers one-by-one, reusing:
   - role checks (`OWNER/MANAGER/WORKER`)
   - department constraints (where applicable)
   - `MessagingService` for notifications

---

## Recommended Module Placement

Match existing conventions:
- New core capabilities: `src/core/<capability>` if cross-domain (e.g. ledger primitives, policy engine)
- New business domains: `src/services/<domain>` with:
  - `<domain>.module.ts`
  - `<domain>.service.ts` (+ controller if needed)
  - `<domain>.schema.ts` for Sequelize models
  - `<domain>.dto.ts`
- WhatsApp-specific routing additions remain in `src/modules/whatsapp`, but prefer delegating to domain services.

Suggested domains for Phase 1 extension:
- `src/services/traderos` (trade lifecycle, parties, contracts)
- `src/services/inventory` (items, lots/batches, movements, reconciliation)
- `src/services/finance` (ledger entries, invoices, payments, exposures)

---

## Risks & Scalability Concerns

### Contract risks
- **AI classifier contract is unversioned**: changes can break routing silently.
- Webhook payload contract depends on Olli integration; any format change affects inbound parsing.

### Data integrity risks
- **No migrations**: introducing columns/tables can cause runtime failures if DB isn’t updated first.
- Some uniqueness constraints imply hard assumptions:
  - user is in exactly one factory
  - worker is in at most one department

### Security risks
- Many REST controllers look like admin utilities but are not protected by default.
- `X_SECRET` guard exists but must be applied to routes (or enforced at gateway).

### Operational risks
- Outbound message sending is not queued; large factories may hit rate limits.
- Cron jobs run in-process; scaling horizontally can duplicate cron actions unless coordinated.

---

## Appendix: Key Files / Entry Points

- Bootstrap: `src/main.ts`
- Module wiring: `src/app/api/app.module.ts`
- DB: `src/core/services/db-service/*`
- WhatsApp ingress + orchestration: `src/modules/whatsapp/whatsapp.controller.ts`, `src/modules/whatsapp/whatsapp.service.ts`
- Messaging gateway (Olli): `src/core/messaging/messaging.service.ts`
- Task routing + notifications: `src/services/tasks/tasks.service.ts`
- Department constraints: `src/services/departments/departments.service.ts`
- CI/CD: `.github/workflows/cicd.yml`
- Container build: `Dockerfile`

---

## Related documentation

- [infrastructure-dependency-audit.md](./infrastructure-dependency-audit.md) — ownership, secrets, and migration (Phase 1.5)
- [deployment-architecture.md](./deployment-architecture.md) — CI/CD and EC2 deploy flow
- [infra-audit.md](./infra-audit.md) — executive summary index
- [implementation-report.md](./implementation-report.md) — phase completion log

