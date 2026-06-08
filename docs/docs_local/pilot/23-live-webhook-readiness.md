# Phase 4–5 — Live Webhook Configuration & Readiness

**Date:** 2026-06-08  
**Scope:** Inspection only — no code, deploy, Railway, or Olli changes  
**Live backend:** `https://backend-production-41504.up.railway.app`

---

## Phase 4 — Webhook URL comparison

### Actual backend route (code + live)

| Method | Path | Status |
|--------|------|--------|
| GET | `/webhook` | **Live** — handshake responds |
| POST | `/webhook` | **Live** — inbound handler mapped |
| GET/POST | `/whatsapp/webhook` | **404** — does not exist |

**Correct URL to configure in Olli:**

```
https://backend-production-41504.up.railway.app/webhook
```

### Configured Olli Webhook URL (context)

Per task context: **"Olli Webhook URL: Updated"** after Railway secrets were set. Prior deployment guidance specified `/webhook` (not `/whatsapp/webhook`).

| If Olli URL ends with… | Verdict |
|------------------------|---------|
| `/webhook` | **CORRECT** |
| `/whatsapp/webhook` | **INCORRECT** — live 404 |

**Live validation:** `GET /whatsapp/webhook` → 404 `Cannot GET /whatsapp/webhook`. Only `/webhook` is registered.

**Cannot read Olli dashboard directly** (inspection-only, no Olli config access). Verdict assumes URL was set to `/webhook` per post-deploy instructions.

---

## Phase 5 — End-to-end readiness

### Infrastructure (assumed configured)

| Component | Status |
|-----------|--------|
| Railway Backend | SUCCESS |
| Railway ML | SUCCESS |
| Railway PostgreSQL | SUCCESS |
| `OPENAI_API_KEY` (ML) | Configured |
| `OLLI_KEY` (backend outbound) | Configured |
| `WHATSAPP_VERIFY_TOKEN` (backend) | Configured |
| `POSTGRES_CONNECTION_STRING` | Configured |
| `ML_URL` | `http://ml.railway.internal:8080` |
| Migrations | 15/15 applied |
| `GET /health` | `ok`, Postgres `up` |

### Backend code capabilities vs gaps

| Capability | Ready? | Notes |
|------------|--------|-------|
| Receive `POST /webhook` | **Yes** | No signature gate |
| Parse GetOlli payload shapes | **Yes** | `parseWhatsAppInbound()` + specs |
| GET subscription handshake | **Yes** | Needs matching verify token in Olli |
| Verify `X-GetOlli-Signature` | **No** | Not implemented |
| Outbound WhatsApp replies | **Yes** | `OLLI_KEY` configured |
| ML intent classification | **Yes** | ML service healthy, `OPENAI_API_KEY` set |

### Data & onboarding gaps (staging)

| Gap | Impact |
|-----|--------|
| **Empty staging database** | No onboarded users, factories, or inventory. Commands requiring `findByPhone()` return "User not registered" or registration nudge. |
| **MSG91 / OTP vars unset** | Web onboarding SMS path unavailable; does not block raw WhatsApp receive but blocks self-serve owner signup via web. |
| **`ENABLE_WEBHOOK_TEST_ROUTE=true`** | Staging debug route exposed; not a blocker for Olli `POST /webhook` but is a security note before production. |

### Additional configuration not required for webhook delivery

| Item | Required for receive? |
|------|----------------------|
| Olli Signing Secret in backend | **No** — not read by code today |
| `OLLI_URL` on Railway | **No** — defaults to `https://api.getolliai.com/api/v1` in code |
| `X_SECRET` | **No** — internal `/resolve/*` only |

---

## Blockers

### Before "Send Test Webhook" (Olli dashboard)

| Blocker | Severity |
|---------|----------|
| Webhook URL must be `/webhook` not `/whatsapp/webhook` | **Critical if wrong path** |
| Backend must be reachable | **Clear** — health OK |
| Signing Secret mismatch | **None** — not enforced |

**No code or secret blockers** if URL is `/webhook`.

### Before real WhatsApp message (full business flow)

| Blocker | Severity |
|---------|----------|
| Sender phone must exist in `users` with `factory_links` | **High** — empty staging DB |
| Inventory/workers seeded for task commands | **High** — empty DB |
| `OLLI_KEY` valid for outbound replies | **Configured** — should work |
| Signing Secret | **Not a functional blocker** (security gap only) |

Unregistered senders still receive automated replies (e.g. "Pehle https://munshi.app par register karein…") if ML classifies as `general_chat`, so the pipe is live but **business workflows will not succeed** without seeded users.

---

## Final verdict

| # | Question | Answer |
|---|----------|--------|
| 1 | Is the configured webhook URL correct? | **YES** — if set to `https://backend-production-41504.up.railway.app/webhook`. **NO** if set to `/whatsapp/webhook` (404). |
| 2 | Is the Olli Signing Secret currently used? | **NO** |
| 3 | Can we safely click "Send Test Webhook"? | **YES** — backend will accept POST without signature check; route is live. |
| 4 | Can we safely send a real WhatsApp message? | **PARTIAL / NO for full flow** — receive + reply path is live, but **empty staging DB** blocks meaningful owner/worker workflows. |

### Exact blockers when answer is NO

| Verdict | Blocker |
|---------|---------|
| URL incorrect (if `/whatsapp/webhook`) | Route does not exist. Use `https://backend-production-41504.up.railway.app/webhook` |
| Signing Secret unused | Informational only — not blocking webhook delivery |
| Real message full flow | No users/factories in staging Postgres; onboard or seed data before expecting commands, tasks, or inventory flows |

---

## Recommended manual checks (no changes required)

1. Confirm Olli dashboard webhook URL ends with **`/webhook`** (not `/whatsapp/webhook`).
2. Confirm Olli verify token matches Railway `WHATSAPP_VERIFY_TOKEN` (for GET handshake if Olli triggers it).
3. After test webhook, check Railway backend deploy logs for `{ controller_body: ... }` log line.
4. For real message testing, use a phone number already seeded in staging `users` + `factory_links`.

**Stop condition met:** inspection complete; no code, deploy, or configuration changes made.
