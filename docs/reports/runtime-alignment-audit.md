# Runtime Alignment Audit

**Date:** 2026-06-01  
**Scope:** Local runtime path investigation (no intent/workflow/business logic changes)

---

## Executive summary

The Local Validation Sprint correctly identified that **webhook traffic was hitting production ML** despite local ML running on port 8000. Root cause: **`ML_URL` in `.env.local` pointed to production** (`http://13.126.57.78:8000`). After configuration-only fix and backend restart, webhook classification aligns with **local ML** (`http://127.0.0.1:8000`).

---

## Configuration files audited

| File | Purpose | Finding |
|------|---------|---------|
| `.env.local` | Loaded by `yarn dev` via `env-cmd -f .env.local` | **Was misconfigured:** `ML_URL=http://13.126.57.78:8000` |
| `.env` | Not present in repo (gitignored) | N/A |
| `docker-compose.example.yml` | Example stack | Had no `ML_URL`; updated to document local ML for Docker |
| `package.json` | `"dev": "env-cmd -f .env.local nest start --watch"` | Dev server always loads `.env.local` |
| `src/app/api/app.module.ts` | `ConfigModule.forRoot({ isGlobal: true })` | Loads default `.env` if present; **does not** auto-load `.env.local` unless via `env-cmd` |
| `src/modules/whatsapp/whatsapp.service.ts` | Intent routing | `const ml_url = process.env.ML_URL \|\| 'http://localhost:8000'` then `POST ${ml_url}/classify?message=...` |
| `src/services/documents/parser/ml-parser.adapter.ts` | Document parse | Same `ML_URL` default `http://localhost:8000` |
| `src/core/services/db-service/db.service.ts` | Database | `POSTGRES_CONNECTION_STRING` from env |
| LLM `main.py` | Local ML service | Binds `0.0.0.0:8000`; `/classify` POST endpoint |
| LLM `.env.example` | OpenAI key only | No backend integration vars |

---

## Which ML endpoint does `POST /webhook/test` call?

### Code path

```
POST /webhook/test
  → WhatsAppController.handleMessage()
  → WhatsAppService.handleIncomingMessage()
  → (if no active workflow session)
  → axios.post(`${process.env.ML_URL || 'http://localhost:8000'}/classify?message=...`)
  → parseMlClassifyResponse()
  → workflowRouter.startWorkflowFromMlCommand() OR processCommand()
```

**Source:** `src/modules/whatsapp/whatsapp.service.ts` lines 142–146.

### Evidence (before fix)

| Setting | Value |
|---------|-------|
| `.env.local` `ML_URL` | `http://13.126.57.78:8000` |
| Discovery phrase webhook behavior | `general_chat` / `/depart_assign` (production ML signatures) |
| Local ML direct classify | `/business_discovery` (different from webhook) |

**Conclusion:** Webhook used **production ML** because `ML_URL` was set to prod in `.env.local`.

### Evidence (after fix + backend restart)

| Setting | Value |
|---------|-------|
| `.env.local` `ML_URL` | `http://127.0.0.1:8000` |
| Backend log `ml-classify` for discovery phrase | `intent: '/business_discovery'` |
| Backend log for vendor phrase | `intent: '/onboard_vendor'` → Vendor onboarding workflow started |
| Backend log for inventory phrase | `intent: '/inventory_status'` → Inventory status query executed |
| Backend log for PR phrase | `intent: '/purchase_request_create'` → PR workflow started |

These intents match **local ML direct classify**, not production ML (which returned `general_chat` / `/depart_assign` for the same phrases in prior sprint).

---

## Runtime endpoints in use (local dev)

| Component | Config key | Current value | Notes |
|-----------|------------|---------------|-------|
| Backend | `PORT` | `4001` | `http://localhost:4001` |
| ML (intent + parse) | `ML_URL` | `http://127.0.0.1:8000` (after fix) | Must match running uvicorn |
| Database | `POSTGRES_CONNECTION_STRING` | `postgresql://munshi:munshi@65.1.128.181:5431/munshi_data` | Remote host, not localhost Docker |

**Note:** Database is remote AWS Postgres, not a local Docker Postgres container. Backend and ML are local processes.

---

## How to switch ML target (no code changes)

### Option A — Edit `.env.local` (recommended for `yarn dev`)

```env
# Local ML
ML_URL=http://127.0.0.1:8000

# Production ML (comment out local line, uncomment this)
# ML_URL=http://13.126.57.78:8000
```

**Restart backend** after changing (`yarn dev` or kill process on :4001).

### Option B — Shell override (one session)

```powershell
$env:ML_URL="http://127.0.0.1:8000"
yarn start
```

### Option C — Production ML without editing file

```powershell
$env:ML_URL="http://13.126.57.78:8000"
yarn dev
```

(`env-cmd` loads `.env.local` first; shell override depends on order — prefer editing `.env.local` for clarity.)

### Option D — Docker backend

Set `ML_URL: http://host.docker.internal:8000` in `docker-compose.yml` (see updated `docker-compose.example.yml`).

---

## Misconfiguration summary

| Issue | Severity | Fixed? |
|-------|----------|--------|
| `ML_URL` pointed to production in `.env.local` | **P0** | Yes — set to `127.0.0.1:8000` |
| Backend not restarted after env change | **P1** | Yes — restarted via `yarn dev` |
| `docker-compose.example.yml` missing `ML_URL` | **P2** | Yes — documented |
| Remote DB while testing “local stack” | **Info** | Not changed (by design in `.env.local`) |

---

## Related reports

- `runtime-flow-diagram.md` — visual request path
- `local-runtime-verification.md` — post-fix phrase tests
- `runtime-fixes-applied.md` — exact config diffs
