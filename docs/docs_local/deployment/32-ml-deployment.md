# ML Deployment

**Project:** munshi-staging  
**Date:** 2026-06-08

---

## Service configuration

| Setting | Value |
|---------|-------|
| **Service Name** | `ml` |
| **Service ID** | `f18087b3-ee5f-43d3-8356-0ea4110626b7` |
| **Root directory** | `ml` (monorepo upload) |
| **Build** | Dockerfile / `pip install -r requirements.txt` |
| **Start** | `sh -c "python -m uvicorn main:app --host 0.0.0.0 --port $PORT"` |
| **Health check** | `/health` |
| **Networking** | Private (`ml.railway.internal`) |

---

## Active deployment

| Field | Value |
|-------|-------|
| **Deployment ID** | `5b66af41-b6fc-4602-843b-a18365664c62` |
| **Status** | **SUCCESS** |
| **Private domain** | `ml.railway.internal` |
| **Port** | `8080` |

---

## Health validation

| Test | Result |
|------|--------|
| `GET /health` (internal) | **HTTP 200** |
| Classifier startup logs | **API Ready** |

Deploy logs confirm health check passed and hybrid classifier loaded.

---

## Failed attempts (resolved)

| Deployment ID | Failure |
|---------------|---------|
| `2655b54e` | Wrong upload path (`ml/ml` missing) |
| `e4bacc82` | `$PORT` not expanded in start command |

---

## Secrets

| Variable | Status |
|----------|--------|
| `OPENAI_API_KEY` | **Not set on Railway** — classifier still loads; set for LLM fallback/extraction reliability |

---

## Backend reference

```
ML_URL=http://ml.railway.internal:8080
```
