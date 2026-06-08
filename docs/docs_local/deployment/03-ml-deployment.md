# ML Deployment Validation (Railway)

**Status:** Validated — not deployed  
**Branch:** `Shantanu`  
**Date:** 2026-06-07

---

## Directory verified: `ml/`

| Check | Result | Evidence |
|-------|--------|----------|
| `requirements.txt` | PASS | fastapi, torch, uvicorn, openai, sentence-transformers, etc. |
| `main.py` | PASS | FastAPI app with lifespan model loading |
| Uvicorn startup | PASS | Railway start uses `python -m uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Health endpoint | PASS | `GET /health` → `{"status":"ok"}` |
| Classify endpoint | PASS | `POST /classify?message=...` |
| Task inventory extraction | PASS | `POST /extract/task-inventory?message=...` |
| Document parse | PASS | `POST /parse` (JSON body) |
| Source tree completeness | PASS | `parsers/`, `contracts/`, `extractors/`, `bot_engine.py` required at runtime |
| Tests | PASS | 56 ML tests pass (per release audit) |

---

## `requirements.txt` summary

| Package | Role |
|---------|------|
| `fastapi`, `uvicorn` | HTTP server |
| `torch`, `sentence-transformers`, `transformers` | Hybrid intent classifier |
| `openai` | LLM fallback + converters |
| `pydantic` | Request/response models |
| `python-dotenv` | Local `.env` loading (`bot_engine.py`) |
| `openpyxl`, `pandas` | Document parsers |

**Build time:** Expect 3–8 minutes (torch wheel download).

---

## `main.py` startup

- **Lifespan handler** loads `IntentClassifier`, `CommandParser`, `WaConverter`, `TaskInventoryExtractor`, `ParserRouter` at startup.
- **Root:** `GET /` → service metadata
- **Health:** `GET /health` → lightweight (does not re-load models)
- **Default local port** in `__main__`: 8000 — **ignored on Railway** (use `$PORT`)

Local dev:

```bash
uvicorn main:app --reload
```

Production (Railway):

```bash
python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

---

## Health endpoint

```http
GET /health
```

Response:

```json
{"status": "ok"}
```

**PASS criteria:** HTTP 200 within health check window (allow long timeout on first deploy).

**Note:** First request to `/classify` may be slower while models warm; `/health` returns immediately after app lifespan completes.

---

## Intent commands (`/help`, `/present`, `/members`)

These are **ML classification intents**, not HTTP routes. They are returned by:

- `POST /classify?message=help chahiye` → `{"intent": "/help", ...}`
- `POST /classify?message=aaj main present hoon` → `{"intent": "/present", ...}`
- `POST /classify?message=team members dikhao` → `{"intent": "/members", ...}`

Command parser runs before hybrid classifier (`bot_engine.py`).

Backend calls ML via `ML_URL` in `whatsapp.service.ts` and dedicated clients.

---

## Dockerfile caveat

Legacy `ml/Dockerfile` copies only `main.py` and `bot_engine.py`. **Do not deploy ML via that Dockerfile.**

Use Railway **GitHub source build** with root directory `ml` — full tree is deployed.

---

## Exact Railway settings

| Setting | Value |
|---------|-------|
| **Root Directory** | `ml` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `python -m uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Health Check Path** | `/health` |
| **Health Check Timeout** | **300s** (model load on cold start) |
| **Public Networking** | **Disabled** (private service) |
| **Memory** | ≥ **2048 MB** recommended |

### Required environment variables

| Variable | Source |
|----------|--------|
| `OPENAI_API_KEY` | OpenAI dashboard (**rotate** if key was ever committed to git history) |
| `PORT` | Railway auto-injects |

---

## Backend consumption

Backend sets:

```
ML_URL=http://${{ML.RAILWAY_PRIVATE_DOMAIN}}:${{ML.PORT}}
```

Used by:

- `whatsapp.service.ts` — `/classify` for incoming WhatsApp messages
- `ml-task-inventory.client.ts` — `/extract/task-inventory`
- `ml-parser.adapter.ts` — `/parse` for document ingestion

`/resolve/task-inventory` on Backend is guarded by `x-secret`; it proxies to ML internally.

---

## Validation verdict

**ML deployment configuration: PASS**

Ready for Railway private source deploy from `ml/` root.
