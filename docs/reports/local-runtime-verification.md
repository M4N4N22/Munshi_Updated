# Local Runtime Verification

**Date:** 2026-06-01  
**After config fix:** `ML_URL=http://127.0.0.1:8000` in `.env.local`  
**Backend:** Restarted via `yarn dev` on port 4001  
**Local ML:** Running on `http://127.0.0.1:8000`

---

## Phase 0 — Environment

| Check | Result |
|-------|--------|
| Local backend | ✅ `GET /health` → ok |
| Local ML | ✅ `GET http://127.0.0.1:8000/health` → ok |
| Migrations | ✅ `pending_count: 0` (001–007) |
| Domain APIs | ✅ Discovery, vendors, inventory, PR tables respond |

---

## Minimal phrase verification (5 tests)

Method: `POST /webhook/test` with session `/cancel` between owner tests; worker phone for attendance.

| # | Phrase (Hindi/Hinglish) | Phone | Local ML (direct) | Prod ML (direct) | Webhook `ml-classify` log | Workflow / backend action |
|---|-------------------------|-------|-------------------|------------------|---------------------------|---------------------------|
| 1 | mera business Sharma Packaging Industries hai Faridabad mein | Owner | `/business_discovery` | `general_chat` | **`/business_discovery`** | BUSINESS_DISCOVERY workflow INSERT; discovery menu reply |
| 2 | aaj main present hoon | Worker | `general_chat` | `/present` | **`general_chat`** | Unknown command (local ML gap for worker Hindi) |
| 3 | naya vendor ABC Paper Traders add karo | Owner | `/onboard_vendor` | `/depart_assign` | **`/onboard_vendor`** | ONBOARD_VENDOR workflow; "What is the vendor name?" |
| 4 | inventory status batao | Owner | `/inventory_status` | `general_chat` | **`/inventory_status`** | Inventory status query; "No low-stock items" |
| 5 | purchase request bana do | Owner | `/purchase_request_create` | `/depart_assign` | **`/purchase_request_create`** | PURCHASE_REQUEST_CREATE workflow; title prompt |

---

## Alignment verdict

| Question | Answer |
|----------|--------|
| Does webhook use local ML after fix? | **Yes** — backend `ml-classify` intents match local ML direct classify for phrases 1, 3, 4, 5 |
| Does webhook still use prod ML? | **No** (after fix + restart) — prod would return different intents (see column 4) |
| Is local stack fully aligned? | **Partially** — ML + backend aligned; database remains remote Postgres |

---

## Evidence excerpts

### Backend log (discovery — proves local ML intent)

```
ml-classify {
  intent: '/business_discovery',
  ...
}
INSERT INTO "workflow_sessions" ...
result: '*Business discovery* ... Choose a topic: 1. Business Identity ...'
```

### Backend log (vendor — proves local ML intent)

```
ml-classify { intent: '/onboard_vendor', ... }
result: '*Vendor onboarding* ... What is the *vendor name*?'
```

### Backend log (inventory — proves local ML intent)

```
ml-classify { intent: '/inventory_status', ... }
SELECT ... FROM "inventory_items" ... factory_id = 3
result: '*Inventory status* ... No low-stock items detected.'
```

### Backend log (purchase request — proves local ML intent)

```
ml-classify { intent: '/purchase_request_create', ... }
result: '*Purchase request* ... Reply with a short *title*'
```

---

## Known non-runtime issues (out of scope)

These are **not** fixed in this sprint (intent/product gaps, not ML_URL):

- Worker attendance phrase → `general_chat` on **local** ML (prod ML returns `/present`)
- Active workflow sessions bypass ML (by design)
- Remote database vs local Docker Postgres

---

## How to re-run verification

```powershell
# 1. Ensure local ML running
python -m uvicorn main:app --host 127.0.0.1 --port 8000

# 2. Ensure .env.local has ML_URL=http://127.0.0.1:8000
# 3. Restart backend
yarn dev

# 4. Test one phrase
Invoke-RestMethod -Method Post -Uri "http://localhost:4001/webhook/test" `
  -ContentType "application/json" `
  -Body '{"from":"918604856137","message":"mera business Sharma Packaging Industries hai Faridabad mein"}'

# 5. Check backend console for ml-classify { intent: '/business_discovery' }
```

---

## Related

- `runtime-alignment-audit.md` — root cause analysis
- `runtime-fixes-applied.md` — config changes made
