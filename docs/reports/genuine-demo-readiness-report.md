# Genuine Demo Readiness Report

**Validated:** 2026-06-02 (automated via `scripts/run-genuine-demo-validation.mjs`)  
**Verdict:** **GO** — all certified flows pass through real ML + backend (`DEMO_MODE=false`)

---

## What changed from hardcoded demo mode

| Before | After |
|--------|-------|
| `DEMO_MODE=true` intercepted phrases before ML | `DEMO_MODE=false` — every phrase goes ML → handler |
| Task assign used hardcoded description | NL parser extracts `{name} ko {work} do` |
| Manager task list showed all factory IT tasks | Manager sees only their routed/dept tasks |
| Owner assign to manager had no task ID in reply | Reply includes `Task #104 routed to Rahul Verma` |
| Inventory phrase returned low-stock dump | `steel sheets` resolves to SKU `DEMO-STEEL-001` |

---

## Olli / message length audit

WhatsApp limit: **4096 chars**. Flag threshold: **3500 chars** (Olli intermittent failures historically were OAuth/API, not length — but long replies still risky).

| Step | Reply length | Olli risk? |
|------|-------------|------------|
| Manager attendance | ~110 | No |
| Owner assign worker | ~151 | No |
| Owner assign manager | ~176 | No |
| Manager task list | ~549 | No |
| Manager delegate | ~129 | No |
| Inventory (Steel Sheets) | ~250 | No |
| Daily report | ~240 | No |
| PR workflow start | ~137 | No |
| Outbound manager routing prompt (to manager) | ~879 | No |

**Previously problematic:** Owner `mere tasks dikaho` as factory-wide list was **1500+ chars** and often failed on Olli. Manager list is now **~550 chars** after filtering.

**Still long (owner-only, not in demo script):** `/members` team overview can exceed 1000 chars on Factory 3 — avoid on camera.

---

## Flow test results (all PASS)

1. Manager `Aaj main present hoon` → attendance marked  
2. Owner `Rahul Kumar ko store check ka kaam do` → task to worker, `DIRECT`  
3. Owner `Rahul Verma ko dispatch planning ka task do` → task to manager, `AWAITING_MANAGER_ACTION`, task ID in reply  
4. Manager `mere tasks dikaho` → compact list, no IT evidence noise  
5. Manager `task [ID] Rahul Kumar ko do` → `DELEGATED_TO_WORKER`  
6. Owner `Steel sheets ka stock kitna bacha hai` → Steel Sheets stock  
7. Owner `Mujhe aaj ka report dikhao` → daily report  
8. Owner `purchase request bana do` → PR workflow starts  

---

## Recording prerequisites

1. `DEMO_MODE=false` in `.env.local` (confirmed)  
2. ML on `:8000`, backend on `:4001`  
3. Tunnel → Olli webhook `/webhook`  
4. Run `node scripts/demo-setup-users-data.mjs` once  
5. Send `cancel` on owner + manager phones before recording  

Re-validate anytime:

```powershell
node scripts/run-genuine-demo-validation.mjs
```

Dry-run single phrase (no Olli send):

```powershell
curl -X POST "http://127.0.0.1:4001/webhook/test?dry=1" -H "Content-Type: application/json" -d "{\"from\":\"917452897444\",\"message\":\"Steel sheets ka stock kitna bacha hai\"}"
```
