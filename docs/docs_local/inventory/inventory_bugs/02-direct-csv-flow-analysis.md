# Phase 2 — Direct CSV Flow Analysis (Without `/inventory_import_csv`)

**Date:** 2026-06-10

---

## Question

Is a legacy inventory import path still active when CSV is uploaded without `/inventory_import_csv`?

## Answer

**YES — with high confidence (code + logs).**

---

## Code path

`whatsapp.service.ts` → `handleIncomingDocument()`:

```typescript
// After team-pending and session-upload branches…
if (await this.inventoryBulkImport.canAutoImport(from)) {
  const summary = await this.inventoryBulkImport.importFromCsvBuffer(
    from, buffer, media.filename, media.mimeType,
  );
  await this.sendTextMessage(from, summary);
  return 'ok';
}
```

`canAutoImport()` returns `true` when `resolveOwnerManagerContext(phone)` finds an OWNER or MANAGER with a factory link — **no session required**.

`importFromCsvBuffer()` with `pending == null`:

```typescript
const useReview = pending != null && !options?.skipReview;
// → false when no session
// → calls uploadCsv() → processImport() directly
```

---

## Why review is skipped

| Condition | Review flow | Auto-import flow |
|-----------|-------------|------------------|
| `pending` session from `/inventory_import_csv` | `useReview = true` | N/A |
| No session, owner/manager phone | N/A | `useReview = false` |

Review requires `startAwaitingCsv()` first.

---

## Why "Failed: 100 / Category not found"

`processImport()` → `processRow()` requires category and location to **already exist**:

```typescript
const category = await this.repository.findCategoryByName(factoryId, row.category);
if (!category) {
  return { status: 'failed', detail: `Category "${row.category}" nahi mila` };
}
```

Auto-import path does **not** call `ensureMasterData()` (that only runs in `processImportWithProvisioning` after CONFIRM).

A CSV with 100 new categories/locations will fail every row on auto-import.

---

## Unit test confirmation

`inventory-bulk-import.service.spec.ts`:

> `imports valid CSV for owner via auto context without review`

Explicitly tests and expects `uploadCsv` without `buildImportReview`.

---

## Railway log evidence (2026-06-10 ~10:13 UTC)

Four `inventory_csv_import_complete` events with **`addedCount: 0`** within 47 seconds — consistent with auto-import failure on missing categories (not review flow).

---

## Intended vs actual product behavior

| Documented intent (`/inventory_import_csv` help text) | Legacy behavior |
|------------------------------------------------------|-----------------|
| "Upload ke baad Munshi review bhejega — CONFIRM" | Owner CSV → immediate import, no review |
| Categories/locations created on CONFIRM | Categories must pre-exist |

---

## Conclusion

**BUG 1 root cause:** `canAutoImport()` legacy path in `handleIncomingDocument()` still executes immediate `processImport()` for any owner/manager CSV upload without an active import session.
