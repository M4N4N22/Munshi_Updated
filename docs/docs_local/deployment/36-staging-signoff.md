# Staging Signoff

**Date:** 2026-06-08  
**Environment:** munshi-staging (Railway)

---

## Final verdict

# PARTIAL PASS

Infrastructure and core paths are live. Full inventory E2E and WhatsApp outbound require additional configuration and data seeding.

---

## Success criteria

| Criterion | Status |
|-----------|--------|
| Railway project created | **PASS** |
| PostgreSQL healthy | **PASS** |
| ML healthy | **PASS** |
| Backend healthy | **PASS** |
| Database connected | **PASS** |
| Migrations applied | **PASS** (15/15) |
| Smoke tests pass | **PARTIAL** — intents pass; inventory E2E needs seed data |
| Ready for WhatsApp integration testing | **PARTIAL** — needs `OLLI_KEY`, webhook URL registration |

---

## Deployment reference

| Item | Value |
|------|-------|
| **Project URL** | https://railway.com/project/043b8a36-21f6-422b-82af-fd7831269075 |
| **Backend URL** | https://backend-production-41504.up.railway.app |
| **ML private domain** | `ml.railway.internal:8080` |
| **Database status** | Healthy — 15 migrations applied |
| **ML deployment ID** | `5b66af41-b6fc-4602-843b-a18365664c62` |
| **Backend deployment ID** | `8f5cb7de-c980-4643-bcc9-65c24b38a95d` |

---

## Blockers / follow-ups

| Priority | Item | Action |
|----------|------|--------|
| P1 | Connect GitHub repo to Railway | Enable autodeploy from `Shantanu` branch |
| P1 | Set `OPENAI_API_KEY` on ML | OpenAI dashboard |
| P1 | Set `OLLI_KEY`, `WHATSAPP_VERIFY_TOKEN` on backend | Olli/Meta dashboard |
| P2 | Set `ONBOARDING_MSG91_*` | MSG91 dashboard |
| P2 | Seed staging factory data | Workers, inventory, departments |
| P2 | Update Vercel `NEXT_PUBLIC_API_URL` | Point to Railway backend URL |
| P3 | Remove duplicate `Postgres-I2eB` service | Railway dashboard |
| P3 | Disable `ENABLE_WEBHOOK_TEST_ROUTE` | Before production |
| P3 | Rotate staging secrets | Replace dev `X_SECRET`/`OTP_PEPPER` values |
| P3 | Commit deploy fixes locally | `ml/Dockerfile`, `docker-entrypoint.mjs` |

---

## Code changes from deploy (uncommitted)

- `ml/Dockerfile` — full COPY + PORT fix
- `backend/scripts/docker-entrypoint.mjs` — `dist/src/main.js`

---

## STOP

Staging infrastructure is live. Proceed with secret configuration, data seeding, and WhatsApp webhook registration before full integration testing.
