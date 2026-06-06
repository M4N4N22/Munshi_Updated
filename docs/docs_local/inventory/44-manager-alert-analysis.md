# Phase 3.3A — Manager Alert Analysis

**Run date:** 2026-06-06  
**Scope:** Department manager recipient resolution for low-stock WhatsApp alerts

---

## 1. Factory Structure (As-Built)

| Entity | Key fields | Notes |
|--------|------------|-------|
| `factories` | id, name | Tenant root |
| `factory_users` | user_id, factory_id, role | OWNER, MANAGER, WORKER |
| `departments` | factory_id, name, slug, **manager_user_id** | One manager per dept row |
| `department_workers` | department_id, user_id | Workers in dept (not used for alerts) |
| `tasks` | factory_id, **department_id**, assigned_to, owner_id | Task may have department |
| `inventory_items` | factory_id, category_id, **location_id** | No department_id column |
| `inventory_locations` | factory_id, name, code | No department link |

---

## 2. Inventory ↔ Department Relationship

**Finding:** There is **no direct** foreign key from `inventory_items` to `departments`.

Items link to:
- `category_id` → `inventory_categories`
- `location_id` → `inventory_locations`

Neither category nor location tables reference departments.

---

## 3. Task ↔ Department Relationship

**Finding:** `tasks.department_id` → `departments.id` → `departments.manager_user_id` → `users.phone_number`

This is the **only existing path** from a stock movement context to a department manager when the movement is task-linked.

Low-stock event payload already includes (Phase 3.1):
- `reference_type` (e.g. `TASK`)
- `reference_id` (task id)

No event schema changes required.

---

## 4. Resolution Strategy

```text
Low stock event payload
      ↓
reference_type == TASK?
      ├─ No  → owner only
      └─ Yes → load task.department_id
                 ├─ null → owner only
                 └─ set  → department.manager_user_id → manager phone
      ↓
uniqueAlertPhones(owner, manager)
      ↓
Independent WhatsApp sends
```

---

## 5. Edge Cases

| Case | Behavior |
|------|----------|
| Owner == manager (same phone) | Single send (deduped) |
| Manager phone missing | Owner only |
| Owner phone missing | Manager only (if resolved) |
| Non-TASK stock out | Owner only |
| Send failure for one recipient | Other recipient still notified |

---

## Conclusion

Manager alerts use **TASK → department → manager** only. No schema changes. No inventory/event logic changes.
