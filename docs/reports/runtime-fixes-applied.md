# Runtime Fixes Applied

**Date:** 2026-06-01  
**Scope:** Configuration only — no intent, workflow, business logic, schema, or contract changes

---

## Problem

Local Validation Sprint showed local ML classifying discovery/inventory/vendor/PR phrases correctly, but `POST /webhook/test` behaved like production ML (wrong intents). **Root cause:** `.env.local` set `ML_URL` to production EC2.

---

## Fixes applied

### 1. `.env.local` — ML_URL (primary fix)

**Before:**

```env
ML_URL=http://13.126.57.78:8000
```

**After:**

```env
ML_URL=http://127.0.0.1:8000
# ML_URL=http://13.126.57.78:8000
```

**File:** `munshi-dada-AS-sructure/.env.local` (gitignored — each developer must apply locally)

**Effect:** `yarn dev` (`env-cmd -f .env.local`) now routes WhatsApp intent classification and document parsing to local ML.

---

### 2. `docker-compose.example.yml` — document local ML for Docker runs

**Added:**

```yaml
ML_URL: http://host.docker.internal:8000
```

**Effect:** Example Docker backend stack points at host-run uvicorn instead of silently defaulting or requiring manual discovery.

---

### 3. Backend process restart

**Action:** Stopped process on port 4001; started `yarn dev` to reload environment.

**Why required:** NestJS reads `process.env.ML_URL` at request time, but running process was started with old env in memory from prior session.

---

## Not changed (intentionally)

| Item | Reason |
|------|--------|
| `bot_engine.py` / intents | Out of scope |
| Workflow handlers | Out of scope |
| `POSTGRES_CONNECTION_STRING` | Still remote DB; not part of ML alignment |
| Production EC2 ML deployment | Ops task — redeploy separately |
| `.env.local` committed to git | File is gitignored (contains secrets) |

---

## Verification after fixes

| Test | Before fix | After fix |
|------|------------|-----------|
| Discovery phrase webhook intent | Prod behavior (`general_chat`) | `/business_discovery` + workflow started |
| Vendor phrase | `/depart_assign` (prod) | `/onboard_vendor` + onboarding prompt |
| Inventory phrase | `general_chat` (prod) | `/inventory_status` + stock query |
| PR phrase | `/depart_assign` (prod) | `/purchase_request_create` + PR workflow |

See `local-runtime-verification.md` for full test matrix and log excerpts.

---

## Switching back to production ML

Uncomment production line in `.env.local`:

```env
# ML_URL=http://127.0.0.1:8000
ML_URL=http://13.126.57.78:8000
```

Restart backend.

---

## Developer checklist (local full stack)

1. Start local ML: `python -m uvicorn main:app --host 127.0.0.1 --port 8000` (LLM repo)
2. Set `ML_URL=http://127.0.0.1:8000` in `.env.local`
3. Start backend: `yarn dev`
4. Confirm: send discovery phrase to `/webhook/test`; log must show `ml-classify { intent: '/business_discovery' }`

---

## Related reports

- `runtime-alignment-audit.md`
- `runtime-flow-diagram.md`
- `local-runtime-verification.md`
