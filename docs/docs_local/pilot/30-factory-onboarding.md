# Phase 1–2 — Data Model Verification & Factory Creation

**Date:** 2026-06-08  
**Environment:** munshi-staging  
**Backend:** https://backend-production-41504.up.railway.app

---

## Phase 1 — Required tables & relationships

| Table | Purpose | Key constraints |
|-------|---------|-----------------|
| `factories` | Business entity | `name` required |
| `users` | Identity by phone | `phone_number` UNIQUE |
| `factory_users` | Membership + role | `user_id` UNIQUE (one factory per user) |
| `departments` | Team within factory | `factory_id`, `slug` unique per factory; `manager_user_id` required |
| `department_workers` | Worker ↔ department | `user_id` UNIQUE (one department per worker) |

**Relationships:**

```
factories 1──* factory_users *──1 users
factories 1──* departments
departments 1──* department_workers *──1 users (WORKER role)
departments.manager_user_id → users (OWNER or MANAGER)
```

---

## Approved creation path (no bypass)

Used production REST APIs matching business rules:

| Step | API | Service logic |
|------|-----|---------------|
| Create factory | `POST /factories` | `FactoryService.createFactory()` |
| Create user + link | `POST /factories/assign-user` | `FactoryService.assignMember()` with `phone_number` |
| Create department | `POST /departments` | `DepartmentsService.create()` |
| Assign worker | `POST /departments/:id/workers` | `DepartmentsService.addWorker()` |

**Not used:** direct SQL, `/webhook/test`, dummy seed scripts.

**Roles** (`USER_ROLE`): `OWNER`, `MANAGER`, `WORKER`.

**Phone format:** `91` + 10-digit Indian mobile (e.g. `918604856137`), matching webhook `from` field and `findByPhone()` lookup.

---

## Phase 2 — Factory created

| Field | Value |
|-------|-------|
| **Factory ID** | `1` |
| **Name** | `Munshi` |
| **Created at** | `2026-06-08T03:46:59.287Z` |
| **Verified** | `GET /factories/1` → 7 members |

**Verdict: FACTORY CREATED — YES**
