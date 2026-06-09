# Shantanu → main integration readiness

**Branch:** `integration/shantanu-merge` (from `origin/Shantanu` + merge `origin/main`)  
**Date:** 2026-06-09  
**Validated by:** local automated checks on integration branch

---

## Git status

| Item | Status |
|------|--------|
| Integration branch created | ✅ `integration/shantanu-merge` |
| Merge `main` into integration | ✅ Clean merge (only `README.md` from redeploy commit) |
| `web/` diff vs `main` | ✅ Identical (no web conflicts) |
| Commits ahead of `main` | 18 (17 Shantanu + 1 merge commit) |

**Stashed before checkout:** local edit to `web/public/team-import/munshi-team-template.csv` — run `git stash pop` on `main` if you still need it.

---

## Automated validation (passed)

| Check | Result |
|-------|--------|
| DB migrations `010`–`014` applied (Supabase) | ✅ 16/16 up to date |
| Backend `npm test` | ✅ 77 suites, **362** tests passed |
| Backend `npm run build` | ✅ |
| ML `pytest` (after `pip install -r requirements.txt`) | ✅ **68** passed |
| Web `npm run build` (after `npm install`) | ✅ |

---

## New migrations applied (Shantanu)

| File | Purpose |
|------|---------|
| `010_task_inventory_lines.sql` | Task ↔ inventory line items |
| `011_integration_foundation.sql` | Zoho/integration connections + mappings |
| `012_integration_push_deliveries.sql` | Outbound stock push audit |
| `013_push_delivery_retry.sql` | Push retry queue |
| `014_low_stock_alert_context.sql` | Low-stock alert CTA context |

**Production:** run `npm run migrate` on Railway/GCP backend before or at deploy (or set `AUTO_MIGRATE=1`).

---

## Env vars to add for full Shantanu feature set

Your current `backend/.env` covers WhatsApp/Olli/Supabase. Add these for inventory integrations:

```env
# Zoho Inventory OAuth (optional until you test Zoho)
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
ZOHO_REDIRECT_URI=http://localhost:4001/integrations/zoho/callback
ZOHO_ACCOUNTS_URL=https://accounts.zoho.in
INTEGRATION_TOKEN_ENCRYPTION_KEY=   # 32+ char random — required if Zoho connected
ZOHO_SYNC_ENABLED=true
ZOHO_SYNC_INTERVAL_MINUTES=360

# Production OTP SMS (web onboarding)
ONBOARDING_MSG91_AUTH_KEY=
ONBOARDING_MSG91_TEMPLATE_ID=
```

ML service needs `OPENAI_API_KEY` in `ml/.env` for NL task-inventory flows.

---

## Manual UAT checklist (you run locally)

Start stack:

```powershell
# Terminal 1 — ML
cd ml
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2 — Backend (integration branch)
cd backend
npm run start:dev

# Terminal 3 — Tunnel (if testing WhatsApp webhooks)
cloudflared tunnel --url http://localhost:4001
# Set MUNSHI_PUBLIC_API_HOST in backend/.env to tunnel URL
```

### P0 — must pass before merge

- [ ] WhatsApp `START` / owner home menu responds
- [ ] Team CSV upload via WhatsApp (document in `data.media`) imports or returns clear error
- [ ] `GET http://localhost:4001/health` returns OK
- [ ] `GET http://localhost:8000/health` returns OK

### P1 — Shantanu inventory core

- [ ] Inventory CSV upload via WhatsApp (review → confirm flow)
- [ ] NL task assign with stock ("Ramesh ko 5 screw deliver karo") routes correctly
- [ ] Task completion updates stock / shows warning when insufficient

### P2 — alerts & procurement

- [ ] Low-stock alert fires to owners + dept managers
- [ ] "Purchase karein" interactive CTA starts purchase request workflow

### P3 — integrations (skip if no Zoho creds)

- [ ] Web `/integrations` loads (`http://localhost:3000/integrations`)
- [ ] Zoho OAuth connect + pull sync
- [ ] Stock push to Zoho on task completion

---

## Merge to `main` (when P0 + P1 pass)

```powershell
git push -u origin integration/shantanu-merge
gh pr create --base main --head integration/shantanu-merge --title "Merge Shantanu inventory + integrations into main" --body "## Summary
- Phase 0–5: task-inventory, CSV import, Zoho, low-stock CTAs
- Migrations 010–014 validated on Supabase
- 362 backend tests + 68 ML tests pass locally

## Test plan
- [ ] P0 WhatsApp flows on staging
- [ ] Railway backend + ML deploy
- [ ] Point Olli webhook to production API
"
```

After merge:

1. **Vercel** — auto-deploys `main` / `web` (no change expected; web already synced)
2. **Railway** — point backend + ML services at `main` (recommended over GCP VM for now)
3. **Olli webhook** — update to Railway public backend URL
4. **`NEXT_PUBLIC_API_URL`** on Vercel — same Railway backend URL

---

## Going forward (stop drift)

| Rule | Who |
|------|-----|
| Feature work on `Shantanu` or `feature/*` branches | Shantanu |
| Review + local test + merge PR to `main` | You |
| No direct pushes to `main` for new features | Both |
| Protect `main` on GitHub (PR required) | You |

---

## Verdict

**READY FOR MANUAL UAT → PR → MERGE**

Automated gates are green. Remaining work is your hands-on WhatsApp UAT and picking production host (Railway recommended per `docs/docs_local/release/railway-deployment.md`).
