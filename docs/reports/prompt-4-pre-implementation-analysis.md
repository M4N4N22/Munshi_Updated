# Prompt 4 — Pre-Implementation Analysis

**Date:** 2026-05-29  
**Purpose:** Document current WhatsApp/ML/command architecture and integration plan for Workflow Engine **before** any Prompt 4 code changes.

---

## 1. Current WhatsApp Message Flow

### Ingress

| Step | Component | Behavior |
|------|-----------|----------|
| 1 | `WhatsAppController` `POST /webhook` | Expects Olli-shaped `{ data: { type, from, text } }` |
| 2 | `WhatsAppController` `POST /webhook/test` | Direct DTO for local testing |
| 3 | `WhatsAppService.handleIncomingMessage` | Central orchestrator |
| 4 | `MessagingService.sendText` | Outbound reply via Olli WABA API |

### `handleIncomingMessage` today (pre–Prompt 4)

```text
Incoming { from, message }
        │
        ├─► Slash bypass?  (/mgrself|mgrassign|mgrtransfer|mgrreject)
        │       YES → processCommand (skip ML)
        │
        └─► NO → POST ML_URL/classify?message=...
                    │
                    parseMlClassifyResponse
                    │
                    processCommand({ command: ml.intent, ...entities })
        │
        Send text reply to user
```

**Important nuance:** Most slash commands (e.g. `/present`, `/help`) currently **still go through ML**, not direct parsing. Only manager routing slash commands bypass ML. Natural language and slash both ultimately reach `processCommand` with a resolved `command` string.

---

## 2. Current ML Classification Flow

| Aspect | Detail |
|--------|--------|
| Endpoint | `POST ${ML_URL}/classify?message=<urlencoded>` |
| Client | `axios` in `WhatsAppService.handleIncomingMessage` |
| Contract | **Not modified in Prompt 4** |
| Parser | `parseMlClassifyResponse()` — supports nested `data`, field aliases |

### ML output fields consumed

| Field | Used for |
|-------|----------|
| `intent` / `command` | Routed as `body.command` |
| `id` | Task/issue id |
| `worker_slug` | Manager assign mention |
| `depart_slug` | Department assignment |
| `reject_reason` | Manager reject |
| `deadline`, `date`, `datetime`, `time` | Task deadlines, reports |

ML is a **black box** — backend only consumes structured output. Prompt 4 adds **no ML changes**.

---

## 3. Current Command Routing Flow

### Command normalization

In `processCommand`:

```typescript
const command = body.command?.startsWith('/')
  ? body.command
  : `/${body.command}`;
```

All handlers compare against `COMMANDS.*` constants (lowercase variants via `cmdLc`).

### Auth gate (all commands)

1. `UserService.findByPhone(phone)` — unregistered → `UnauthorizedException`
2. Resolve `factoryId`, `role` from `factory_links`
3. Missing factory → `NotFoundException`

### Command dispatch order (simplified)

| Order | Command(s) | Role |
|-------|------------|------|
| Early | `/report` | Manager+ |
| | `/help` | All |
| | `/depart_assign` + slug (ML) | Owner |
| | `/mgrself`, `/mgrassign`, `/mgrtransfer`, `/mgrreject` | Manager |
| | `/present`, `/absent` | All |
| | `/members` | Manager+ |
| | `/tasks`, `/complete`, `/assign`, `/update` | Role-specific |
| | `/issue`, `/issues`, `/resolve` | Mixed |
| Default | unknown | `waUnknownCommand()` |

**No workflow or TraderOS commands exist yet.**

---

## 4. Current `processCommand()` Flow

```text
processCommand(body)
  → resolve user + factory + role
  → sequential if/else command handlers
  → each handler calls domain service (TasksService, AttendanceService, etc.)
  → returns string (WhatsApp formatted text)
```

Characteristics:

- **Monolithic** — all logic in `WhatsAppService` (~1000 lines)
- **Synchronous** — single message → single response
- **No session state** — every message is stateless except DB side effects
- **Role guards** — `ensureManager()`, `ensureWorker()` private methods

---

## 5. Current Role Architecture

| Role | Source | Capabilities (summary) |
|------|--------|------------------------|
| `OWNER` | `factory_users.role` | Assign to departments, broad task assign, see rejected tasks |
| `MANAGER` | same | Department-scoped assign, manager routing, reports |
| `WORKER` | same | Own tasks, attendance, issue report |

Constants: `USER_ROLE` in `users.constants.ts`.

Vendor REST (Prompt 3) has **no role guard** on HTTP; WhatsApp vendor onboarding will use `ensureManager()` (owner + manager).

---

## 6. Current Vendor Module (Prompt 3)

| Layer | File | Status |
|-------|------|--------|
| Schema | `vendors.schema.ts` | `phone_number` required, factory-scoped |
| Validation | `vendors.validation.ts` | name, phone, GST, address normalization |
| Repository | `vendors.repository.ts` | CRUD + search |
| Service | `vendors.service.ts` | **`createVendor()`** production-ready |
| Controller | `vendors.controller.ts` | REST `/vendors` |
| Tests | 19 passing unit tests | |

### `createVendor()` contract

```typescript
createVendor(dto: CreateVendorDto): Promise<IVendorRecord>
// Required: factory_id, name, phone_number
// Optional: email, address, gst_number, notes
// Throws: ConflictException (duplicate name/phone), BadRequestException (validation)
```

**Prompt 4 vendor onboarding MUST call `VendorService.createVendor()` — no duplicate business logic.**

---

## 7. Current Integration Points

| Integration | Touch point for Prompt 4 |
|-------------|-------------------------|
| WhatsApp ingress | `handleIncomingMessage` — add workflow intercept **first** |
| ML classify | Unchanged — ML may return `/onboard_vendor` intent |
| Command dispatch | `processCommand` — delegate `/onboard_vendor` to WorkflowRouter |
| Direct slash | New bypass for `/onboard_vendor` only (preserves ML path for existing commands) |
| Vendor CRUD | `VendorService.createVendor()` at workflow completion |
| DB | New `workflow_sessions` table (migration 003) |
| Modules | New `WorkflowModule`; import in `WhatsAppModule` |

### What must NOT change

- ML URL, request shape, response parsing
- Manager slash bypass (`/mgrself`, etc.)
- All existing `COMMANDS` handlers and their behavior
- Attendance cron, task deadline cron
- Vendor REST API

---

## 8. Workflow Engine Integration Plan

### New routing (after Prompt 4)

```text
Incoming message
        │
        ▼
Active workflow session for phone?  ──YES──► WorkflowEngine.handleStep()
        │                                      (NO ML, NO processCommand)
        NO
        │
        ├─► Mgr slash bypass? ──YES──► processCommand (unchanged)
        │
        ├─► Workflow start slash (/onboard_vendor)? ──YES──► WorkflowEngine.start()
        │
        └─► ML classify ──► processCommand
                              │
                              ├─► /onboard_vendor? ──► WorkflowEngine.start()
                              └─► existing handlers (unchanged)
```

### Design principles

1. **Command-driven** — `/onboard_vendor` is canonical; ML only produces same command string
2. **Pluggable registry** — `WorkflowRegistry` maps command → handler class
3. **No vendor logic in WhatsAppService** — only calls `WorkflowRouterService`
4. **Session in DB** — survives process restarts; one ACTIVE session per phone (partial unique index)
5. **Minimal WhatsApp diff** — ~30 lines routing glue, not a rewrite

### New components

| Component | Responsibility |
|-----------|----------------|
| `WorkflowSession` entity + migration | Persist multi-step state |
| `WorkflowSessionService` | create/get/update/complete/cancel/expire |
| `WorkflowRegistry` | Command → handler lookup |
| `WorkflowEngineService` | Orchestrate start + step |
| `VendorOnboardingWorkflowHandler` | Step prompts + validation |
| `WorkflowRouterService` | Facade for WhatsApp integration |

---

## 9. Risks Before Implementation

| Risk | Mitigation |
|------|------------|
| Breaking ML path for `/present` | Do NOT route all slash commands direct; only `/onboard_vendor` bypass |
| Stale active sessions | `expireSession()` + optional TTL in future |
| Duplicate active sessions | DB partial unique index on `(phone_number) WHERE status='ACTIVE'` |
| User starts workflow while another active | Cancel previous or reject — will reject with message |
| Vendor validation errors mid-flow | Catch exceptions, re-prompt same step with error text |

---

## 10. Approval to Proceed

Analysis complete. Implementation may begin with:

1. Migration `003_workflow_sessions.sql`
2. `WorkflowModule` + handler registry
3. Vendor onboarding handler using `VendorService.createVendor()`
4. WhatsApp routing integration (minimal)
5. Unit tests + documentation

---

*End of pre-implementation analysis.*
