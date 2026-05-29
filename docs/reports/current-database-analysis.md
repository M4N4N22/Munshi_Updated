# Current Database Analysis

**Phase:** Prompt 2 — TraderOS Foundation  
**Date:** 2026-05-29  
**Scope:** Pre-expansion snapshot of all Sequelize SQL models in the Munshi backend

---

## Overview

Munshi uses **PostgreSQL** via **Sequelize** with a custom `DbService` bootstrap:

- Models defined in `src/services/**/*.schema.ts` with static `setup()` + `associate()` methods
- Registered centrally in `src/core/services/db-service/models.ts`
- **No automatic schema sync** at runtime (`sequelize.sync()` is commented out)
- **No migrations existed** prior to Prompt 2 (schema managed externally)

Multi-tenancy is implemented as **row-level scoping by `factory_id`** on operational entities.

---

## Existing Tables (Pre–Prompt 2)

### 1. `users`

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, auto-increment |
| phone_number | STRING | NOT NULL, UNIQUE |
| name | STRING | nullable |
| profile_picture | STRING | nullable |
| created_at, updated_at | timestamps | underscored |

**Relationships:**
- `hasOne` → `factory_users` (as `factory_links`)
- `hasMany` → tasks (assignee, assigner), issues (reporter)

**Dependencies:** WhatsApp auth resolves users by `phone_number`. Deleting users cascades through transactional logic in `UserService.remove`.

---

### 2. `factories`

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK |
| name | STRING | NOT NULL |
| address | STRING | nullable |

**Relationships:** `hasMany` → factory_users, tasks, issues, attendance, departments

**Role:** Primary tenant boundary for all factory-scoped data.

---

### 3. `factory_users`

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK |
| user_id | INTEGER | NOT NULL, **UNIQUE** |
| factory_id | INTEGER | NOT NULL |
| role | STRING | NOT NULL (OWNER / MANAGER / WORKER) |
| doj | DATE | nullable |

**Relationships:** `belongsTo` User, Factory (CASCADE on delete)

**Critical constraint:** `user_id` unique → **one factory per user** today.

---

### 4. `departments`

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK |
| factory_id | INTEGER | NOT NULL |
| name | STRING | NOT NULL |
| slug | STRING | NOT NULL |
| manager_user_id | INTEGER | NOT NULL |

**Indexes:** UNIQUE `(factory_id, slug)`, UNIQUE `(factory_id, manager_user_id)`

**Relationships:** belongsTo Factory, User (manager); hasMany DepartmentWorker

**Workflow dependency:** Owner→Manager task routing, department assignment via WhatsApp/ML.

---

### 5. `department_workers`

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK |
| department_id | INTEGER | NOT NULL |
| user_id | INTEGER | NOT NULL, **UNIQUE** |

**Relationships:** belongsTo Department (CASCADE), User

**Constraint:** Worker can belong to **at most one department globally**.

---

### 6. `tasks`

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK |
| factory_id | INTEGER | NOT NULL |
| assigned_to, assigned_by | INTEGER | NOT NULL |
| description | TEXT | NOT NULL |
| deadline | DATE | nullable |
| deadline_breach_reminded_at | DATE | nullable |
| routing_status | STRING | nullable (state machine) |
| owner_id, department_id | INTEGER | nullable |
| completed_by, rejected_by | INTEGER | nullable |
| rejection_reason | TEXT | nullable |
| rejected_at | DATE | nullable |
| is_completed | BOOLEAN | default false |
| batch_id | UUID | nullable |

**Relationships:** belongsTo User (multiple roles), Factory, Department; hasMany TaskUpdate

**Workflow dependency:** Core WhatsApp task assignment, manager routing, deadline cron.

---

### 7. `task_updates`

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK |
| task_id, user_id | INTEGER | NOT NULL |
| message | TEXT | NOT NULL |

**Relationships:** belongsTo Task (CASCADE), User

---

### 8. `attendance`

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK |
| user_id, factory_id | INTEGER | NOT NULL |
| date | DATEONLY | NOT NULL |
| is_present | BOOLEAN | NOT NULL |

**Index:** UNIQUE `(user_id, factory_id, date)`

**Workflow dependency:** WhatsApp present/absent + attendance reminder cron.

---

### 9. `issues`

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK |
| factory_id, reported_by | INTEGER | NOT NULL |
| message | TEXT | NOT NULL |
| is_resolved | BOOLEAN | default false |

**Workflow dependency:** WhatsApp issue reporting and manager resolution broadcasts.

---

## Entity Relationship Summary (Existing)

```text
Factory
 ├── FactoryUser → User
 ├── Department → DepartmentWorker → User
 ├── Task → TaskUpdate
 ├── Issue
 └── Attendance → User

User (phone_number unique)
 └── factory_users (one factory)
```

---

## Dependencies on Database Design

| Consumer | Tables used |
|----------|-------------|
| WhatsApp ingress | users, factory_users, tasks, departments, attendance, issues |
| ML classifier | indirect (via WhatsApp command routing) |
| Messaging / Olli | users (phone), factories (name) |
| Task deadline cron | tasks, users |
| Attendance cron | factory_users, attendance, users |
| Reports | attendance, tasks, issues, factory_users |
| Admin REST | all operational tables |

---

## Constraints & Risks (Pre–Prompt 2)

| Risk | Severity | Notes |
|------|----------|-------|
| No migration history | High | Schema drift between environments |
| Single-factory user constraint | Medium | Limits true multi-factory employees |
| No DB-level FKs on many relations | Medium | Integrity enforced in application code only |
| `sequelize.sync` disabled | Low (good) | Requires explicit migrations for new tables |
| Hard exit on DB failure | Medium | App won't start without Postgres |

---

## Prompt 2 Additions (Reference)

Seven new tables added via `migrations/001_traderos_foundation.sql`:

- `vendors`
- `inventory_categories`, `inventory_locations`, `inventory_items`, `inventory_transactions`
- `purchase_requests`
- `approval_requests`

**Existing tables were not modified.** See [migration-notes.md](./migration-notes.md).

---

*End of current database analysis.*
