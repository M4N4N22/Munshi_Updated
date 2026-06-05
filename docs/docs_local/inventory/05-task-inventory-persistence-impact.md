# Phase 0.2 — Task Inventory Persistence — Impact Analysis

## 1. Files Modified

| File | Scope of change |
|------|-----------------|
| `backend/src/services/tasks/task-inventory-line.dto.ts` | **New** — nested DTO |
| `backend/src/services/tasks/tasks.dto.ts` | Optional `inventory_lines` on create |
| `backend/src/services/tasks/tasks.service.ts` | Persist, retrieve, delete for lines |

**Not modified:** migrations, inventory module, WhatsApp, workflow, `tasks.module.ts`, `tasks.schema.ts`, `models.ts`.

---

## 2. Direct Dependencies

| Dependency | Relationship |
|------------|--------------|
| `TaskInventoryLine` model (Phase 0.1) | `bulkCreate`, `destroy`, `include` in queries |
| `InventoryItem` model (read-only include) | Nested association in `adminFindOne` — no inventory service import |
| `CreateTaskDto` / `TaskInventoryLineDto` | REST `POST /tasks` validation |
| `DbService.sqlService` | Model access (existing pattern) |

**No dependency on:** `InventoryTransactionService`, `InventoryModule`, inventory DTOs/constants.

---

## 3. Indirect Dependencies

| Consumer | Impact |
|----------|--------|
| `TasksController` | Accepts optional `inventory_lines` on `POST /tasks` (Swagger updated via DTO decorators) |
| WhatsApp `handleAssign` | **None today** — does not pass `inventory_lines` |
| Workflow assign clarify | **None today** |
| Web/admin clients | May optionally send `inventory_lines`; omitting field = unchanged behavior |
| Cron / deadline reminders | **None** |

---

## 4. Modules Affected

| Module | Change |
|--------|--------|
| `TasksModule` | **Effective** behavior change on create/read/delete — **no module file edit** |
| `InventoryModule` | **Not affected** |
| `WhatsAppModule` | **Not affected** |
| `DbService` / SQL bootstrap | **Not affected** (Phase 0.1 registration already in place) |

---

## 5. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing REST clients | Low | High | `inventory_lines` optional; omit = same payload/behavior |
| Breaking WhatsApp assign | Low | High | No WhatsApp file changes; options param optional |
| Invalid FK references in lines | Medium | Medium | Future validation phase; document for API users |
| Response shape change on `GET /tasks/:id` | Low | Low | Additive `inventory_lines` array (empty when none) |
| Delete incomplete outside `adminRemove` | Low | Low | Pre-existing pattern for `task_updates` |
| Accidental stock movement | None | — | No inventory transaction code added |

**Overall risk:** **Low** for backward compatibility; **medium** for data quality until validation phase.

---

## 6. Rollback Strategy

1. **Code rollback:** Revert commits touching `tasks.dto.ts`, `tasks.service.ts`, `task-inventory-line.dto.ts`. Tasks work without line persistence.
2. **Data:** `task_inventory_lines` rows remain in DB but are unused — harmless orphan data.
3. **Schema rollback (optional):** Drop table only if full Phase 0 revert desired:
   ```sql
   DROP TABLE IF EXISTS task_inventory_lines;
   ```
   Not required for code-only rollback.
4. **API clients:** Stop sending `inventory_lines`; no other client changes needed.

---

## 7. Future Impact

| Future phase | How 0.2 enables it |
|--------------|-------------------|
| Task complete → stock out | Lines already stored; `completeTask` reads by `task_id` |
| WhatsApp assign with SKU/qty | Pass `inventory_lines` into `assignToUser` options |
| Partial completion | Update `quantity_completed` on existing rows |
| Low-stock alerts | After movement, compare item threshold |
| `TasksModule` → `InventoryModule` | Service injection in `tasks.service.ts` only |

**API contract:** `GET /tasks/:id` now may return `inventory_lines[]` — clients should tolerate unknown fields.

---

## NEXT IMPLEMENTATION TARGETS

1. Document REST example payload for `POST /tasks` with `inventory_lines` in API docs.
2. Add factory-scoped item validation before persist.
3. Import `InventoryModule` in `TasksModule` when `completeTask` stock hook lands.
4. Consider dedicated `GET /tasks/:id/inventory-lines` if detail response grows.
