# Phase 5 — Department Assignment

**Date:** 2026-06-08  
**Factory:** Munshi (ID `1`)

---

## Departments created

| Dept ID | Name | Slug | Head (manager_user_id) | Head name |
|---------|------|------|------------------------|-----------|
| 1 | IT | `it` | 4 | Shantanu2 |
| 2 | Sales | `sales` | 5 | Debapratim Dey |

**API calls:**

```
POST /departments  { factory_id: 1, name: "IT", slug: "it", manager_user_id: 4 }
POST /departments  { factory_id: 1, name: "Sales", slug: "sales", manager_user_id: 5 }
```

---

## Worker assignments

| Worker | User ID | Department | API |
|--------|---------|------------|-----|
| Prateek | 6 | IT (ID 1) | `POST /departments/1/workers { user_id: 6 }` |
| Shantanu3 | 7 | Sales (ID 2) | `POST /departments/2/workers { user_id: 7 }` |

---

## Manager ↔ department mapping

| Manager | Dept head of |
|---------|--------------|
| Shantanu2 (ID 4) | IT |
| Debapratim Dey (ID 5) | Sales |

Managers are department heads via `departments.manager_user_id` (not `department_workers`).

---

## Owners

Owners (Divyansh, Ayush, Shantanu1) have **no department assignment** — expected for OWNER role.

---

## Verification

`GET /departments?factory_id=1`:

- IT → manager Shantanu2, workers: [Prateek]
- Sales → manager Debapratim Dey, workers: [Shantanu3]

**Verdict: DEPARTMENTS ASSIGNED — YES**
