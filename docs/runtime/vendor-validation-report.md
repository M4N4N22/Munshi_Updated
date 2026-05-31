# Vendor Module Validation Report

**Date:** 2026-05-31  
**Factory under test:** `factory_id=3` (Munshi Dada)

## Endpoints investigated

| Method | Path | Pre-fix | Post-fix |
|--------|------|---------|----------|
| GET | `/vendors?factory_id=3` | 500 | **200** |
| GET | `/vendors/search?factory_id=3&q=steel` | 500 | **200** |
| GET | `/vendors/:id?factory_id=3` | 500 | **200** (when row exists) |
| POST | `/vendors` | 500 | **201** |

---

## Root cause (pre-fix)

**Category: Deployment / migration issue**

PostgreSQL error surfaced via HTTP 500:

```json
{
  "meta": {
    "success": false,
    "message": "Something went wrong",
    "failures": { "message": "relation \"vendors\" does not exist" }
  }
}
```

### Investigation path

1. **Missing migration?** ✅ Yes — `001_traderos_foundation.sql` creates `vendors`; never applied.
2. **Missing table?** ✅ Confirmed via `runtime-db-inspect.mjs`.
3. **Incorrect query?** ❌ SQL is valid; Sequelize `SELECT FROM vendors` fails only because table absent.
4. **Incorrect DTO?** ❌ Query params validated correctly (`factory_id` as number via pipe/DTO elsewhere).
5. **Incorrect repository?** ❌ No code path reached on missing table.

**Not a vendor module code defect** for GET failures.

---

## Remediation

Applied migrations 001–002 via `scripts/apply-migrations.mjs`.

---

## Re-test evidence

Script: `scripts/runtime-module-retest.mjs`

### GET list (empty)

```
GET /vendors?factory_id=3 → 200 (290ms)
Body: {"data":[],"total":0,"page":1,"limit":25}
```

### POST create

```
POST /vendors
Body: {"factory_id":3,"name":"Runtime Test Vendor","phone_number":"919876543210"}
→ 201 (330ms)
Body: {"id":1,"factory_id":3,"name":"Runtime Test Vendor","phone_number":"919876543210",...}
```

### GET by id

```
GET /vendors/1?factory_id=3 → 200 (53ms)
```

### Search

```
GET /vendors/search?factory_id=3&q=Runtime → 200 (170ms)
```

Smoke test (`scripts/swagger-smoke-test.mjs`): vendor GET routes **pass** in 23/23 suite.

---

## Stack trace note

No application stack trace beyond Sequelize `DatabaseError: relation "vendors" does not exist` in server logs. Exception filter wraps as:

```json
{ "meta": { "success": false, "message": "Something went wrong" } }
```

---

## Audit script false negative (POST)

`swagger-full-audit.mjs` POST vendor test used field `phone` instead of `phone_number`:

```
400: phone_number must be longer than or equal to 10 characters
```

Swagger DTO requires `phone_number` — audit script error, not API bug.

---

## Conclusion

| Question | Answer |
|----------|--------|
| Failure cause | Missing DB table (migration 001 not applied) |
| Code fix required? | **No** for GET failures |
| Module validated at runtime? | **Yes** after migrations |
| Production ready? | **Yes**, contingent on migrations in target DB |
