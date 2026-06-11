# Phase 7 — Import Execution Investigation

**Date:** 2026-06-10

---

## `processImport()` call sites

| Caller | When |
|--------|------|
| `InventoryImportUploadService.uploadCsv()` | Auto-import, REST API |
| `InventoryImportUploadService.processImportWithProvisioning()` | After CONFIRM |
| Direct tests | Integration specs |

---

## Why Added:100 becomes Updated:100

`processRow()` logic:

1. **First execution:** SKU not found → `status: 'added'` (create item + optional stock-in)
2. **Second execution:** SKU exists → `status: 'updated'` (patch fields + optional stock-in)

This is **correct per-row behavior** when import runs multiple times on the same CSV.

---

## Railway log evidence — 4 executions (2026-06-10)

| Timestamp | addedCount | updatedCount | Interpretation |
|-----------|------------|--------------|----------------|
| 10:22:51 | **100** | 0 | First `confirmImport` — all new SKUs |
| 10:22:59 | 0 | **100** | Duplicate #2 — all SKUs exist |
| 10:23:13 | 0 | **100** | Duplicate #3 |
| 10:23:37 | 0 | **100** | Duplicate #4 |

**4 separate `inventory_csv_import_complete` audit logs** = **4 real `processImport()` runs**.

---

## Triggers for each execution

| Trigger | Likelihood | Evidence |
|---------|------------|----------|
| Duplicate CONFIRM webhooks | **High** | CONFIRM has no dedup; 4 completes ~8–46s apart |
| Duplicate document webhooks on auto-import path | Medium | 4× addedCount:0 earlier at 10:13 (failed auto-import) |
| Webhook retry after 499 timeout | **High** | 499 logs at 10:20:33–10:21:24 |
| Multiple consumers / instances | Low | Single Railway backend; in-memory session |
| Session replay | Low | No replay mechanism |

---

## `confirmImport()` race

```typescript
async confirmImport(phone: string): Promise<string> {
  const pending = this.getPending(phone);
  // … no lock …
  const summary = await this.uploadService.processImportWithProvisioning(...);
  this.pendingByPhone.delete(phone);  // deleted AFTER import completes
}
```

Between read and delete, parallel CONFIRM handlers can both proceed.

---

## `batchId` does not prevent duplicate import

`generateBatchId()` uses `Date.now() % 2_000_000_000` — unique per call, **not** used as idempotency key in `processImport()`.

---

## Count summary (observed session 2026-06-10)

| Metric | Count |
|--------|-------|
| Import executions (added=100 session) | **4** |
| Import executions (failed auto-import session) | **4** |
| Review-ready events | **2** |

---

## Confidence

**95%** — Railway structured logs with `addedCount`/`updatedCount` prove repeated execution, not message-only duplication.
