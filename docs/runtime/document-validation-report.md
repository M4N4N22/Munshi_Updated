# Document Module Validation Report

**Date:** 2026-05-31

## Endpoints investigated

| Method | Path | Pre-fix | Post-fix |
|--------|------|---------|----------|
| GET | `/documents/registry/types` | 200 | 200 |
| GET | `/documents?factory_id=3` | **400** | **200** |
| GET | `/documents/:id?factory_id=3` | **400** | **200/404** |
| GET | `/documents/:id/suggestions?factory_id=3` | **400** | **200/404** |

---

## Root cause: GET list / by-id (pre-fix)

**Category: Actual code defect (DTO validation)**

### API response (evidence)

```json
GET /documents?factory_id=3
HTTP 400
{
  "meta": {
    "message": "Bad Request Exception",
    "failures": {
      "message": [
        "factory_id must be a number conforming to the specified constraints"
      ]
    }
  }
}
```

### Code analysis

`DocumentFactoryQueryDto` in `src/services/documents/documents.dto.ts`:

```typescript
// BEFORE (broken for query strings)
export class DocumentFactoryQueryDto {
  @IsNumber()
  factory_id: number;
}
```

Query parameters arrive as **strings** (`"3"`). `@IsNumber()` fails without coercion even though global `ValidationPipe({ transform: true })` is enabled — `@Transform` or `@Type(() => Number)` required.

`UploadDocumentDto` in the same file **already had** `@Transform(({ value }) => Number(value))` — inconsistency confirmed defect.

### Ruled out

| Hypothesis | Result |
|------------|--------|
| Missing migration only | Partial — `documents` table also missing pre-001; GET failed with 400 **before** SQL |
| Repository issue | ❌ Validation fails before service |
| Missing table | Would be 500 post-validation; pre-fix never reached DB |

---

## Fix applied

```typescript
export class DocumentFactoryQueryDto {
  @Transform(({ value }) => Number(value))
  @IsNumber()
  factory_id: number;
}
```

File: `src/services/documents/documents.dto.ts`  
Server hot-reload picked up change (Nest watch mode).

---

## Migration dependency

`documents`, `document_processing_jobs`, `document_extractions`, `document_suggestions` require `005_document_processing.sql`.

Pre-migration: tables missing.  
Post-migration: tables exist (verified in database-validation-report).

---

## Re-test evidence

```
GET /documents?factory_id=3 → 200 (98ms) → []
GET /documents/registry/types → 200 (3ms) → [PURCHASE_INVOICE, GOODS_RECEIPT, STOCK_REGISTER, ...]
```

Smoke test: `GET /documents?factory_id=3` **passes** in 23/23 suite.

### GET by id (no rows yet)

```
GET /documents/1?factory_id=3 → 404 (expected when empty)
```

---

## Upload / process (not fully runtime-tested)

`POST /documents/upload` and `POST /documents/:id/process` depend on:

- `DOCUMENT_STORAGE_PATH` or storage provider config
- `ML_URL` for parsing (`http://13.126.57.78:8000` — **reachable**, `{"status":"ok"}`)

Not exercised end-to-end in this sprint (requires multipart file). Schema and registry endpoints validated.

---

## Conclusion

| Issue | Category | Fixed? |
|-------|----------|--------|
| GET 400 on `factory_id` | **Code defect (DTO)** | ✅ Yes |
| Missing document tables | **Migration** | ✅ Applied |
| Upload/process E2E | **Config + ML** | ⚠️ Partially ready |

**Document read APIs:** Runtime validated after DTO fix + migration 005.
