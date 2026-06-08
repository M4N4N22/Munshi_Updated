# Post-Deploy Validation

**Date:** 2026-06-08  
**Environment:** munshi-staging

---

## Service startup

| Service | Status | Evidence |
|---------|--------|----------|
| PostgreSQL | **PASS** | Railway SUCCESS; backend connects `postgres.railway.internal:5432` |
| ML | **PASS** | Deployment SUCCESS; logs: `API Ready`, health 200 |
| Backend | **PASS** | Deployment SUCCESS; Nest started on port 8080 |

---

## Database connectivity

```
GET https://backend-production-41504.up.railway.app/health
→ Postgres.status: "up"
```

Deploy logs:

```
Successfully connected to PostgreSQL (postgres.railway.internal:5432)
```

---

## Migration state

```
GET /health/migrations
→ status: "ok"
→ up_to_date: true
→ applied_count: 15
→ pending_count: 0
```

All migrations applied on first backend start.

---

## Inter-service connectivity

| Path | Status |
|------|--------|
| Backend → Postgres | **PASS** |
| Backend → ML | **PASS** (webhook smoke tests returned 201) |
| ML → OpenAI | **UNKNOWN** — `OPENAI_API_KEY` not set |

---

## Log excerpts

**ML:**

```
Hybrid Intent Classifier Loaded (v2 - robust)
API Ready
GET /health HTTP/1.1 200 OK
```

**Backend:**

```
[migrate] Database schema is up to date
Nest application successfully started
Application listening on port 8080
```
