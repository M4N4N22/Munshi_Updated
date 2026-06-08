# Post-Deploy Smoke Test Plan

**Status:** Checklist only — not executed  
**Date:** 2026-06-07

Run after all services deploy. Record PASS/FAIL for each item.

---

## Prerequisites

- [ ] Railway Postgres active
- [ ] ML deployed (private), health check green
- [ ] Backend deployed (public), health check green
- [ ] Vercel `NEXT_PUBLIC_API_URL` updated to Backend public URL
- [ ] Secrets configured (OLLI, MSG91, OPENAI, X_SECRET, etc.)

**Base URLs:**

- Backend: `https://<backend-public>`
- ML (internal): reachable from Backend via `ML_URL` only

---

## 1. Backend health

```http
GET https://<backend-public>/health
```

| PASS | FAIL |
|------|------|
| HTTP 200 | HTTP 503 or connection error |
| Body includes `"Postgres": {"status": "up"}` | Postgres down or missing |

---

## 2. ML health

### Option A — Railway internal (preferred)

From Railway Backend service logs or one-off shell with private network:

```http
GET http://<ml-private-domain>:<port>/health
```

### Option B — indirect via Backend

Send a test WhatsApp message or trigger classify flow; confirm no ML connection errors in Backend logs.

| PASS | FAIL |
|------|------|
| `{"status":"ok"}` | Timeout, connection refused, 5xx |
| Backend logs show successful ML calls | `ECONNREFUSED` / `ML_URL` errors |

---

## 3. Database connectivity

```http
GET https://<backend-public>/health/migrations
```

| PASS | FAIL |
|------|------|
| `"status": "ok"` | `"status": "pending"` with unexpected pending files |
| `"up_to_date": true` | Migration errors in deploy logs |
| `"pending": []` | Non-empty pending on fresh deploy |

---

## 4. Intent: `/help`

**Type:** ML classification intent (not a REST path on Backend).

### Direct ML test (Railway private shell)

```http
POST /classify?message=help%20chahiye
```

### End-to-end (WhatsApp)

Send WhatsApp message: `help chahiye` or `/help`

| PASS | FAIL |
|------|------|
| Response intent is `/help` | Wrong intent or error |
| User receives help / command guidance | No reply or generic error |

---

## 5. Intent: `/present`

### Direct ML test

```http
POST /classify?message=aaj%20main%20present%20hoon
```

### End-to-end (WhatsApp)

Send: `aaj main present hoon`

| PASS | FAIL |
|------|------|
| Response intent is `/present` | Misclassified as chat or other |
| Attendance workflow proceeds (if worker onboarded) | Handler error in Backend logs |

---

## 6. Intent: `/members`

### Direct ML test

```http
POST /classify?message=team%20members%20dikhao
```

### End-to-end (WhatsApp)

Send: `team members dikhao`

| PASS | FAIL |
|------|------|
| Response intent is `/members` | Wrong intent |
| Member list or appropriate reply returned | Empty/error for onboarded factory |

---

## 7. Natural language inventory flow

Tests Phase 4 task-inventory extraction end-to-end.

### ML direct

```http
POST /extract/task-inventory?message=<Hindi/Hinglish inventory message>
```

Example message: `cement 50 bag warehouse mein daal do`

| PASS | FAIL |
|------|------|
| Structured extraction JSON returned | 4xx/5xx or empty payload |
| Items/quantities parsed reasonably | Nonsense extraction |

### Backend guarded route

```http
POST https://<backend-public>/resolve/task-inventory
Headers: x-secret: <X_SECRET>
Body: (per API contract)
```

| PASS | FAIL |
|------|------|
| HTTP 200 with resolution payload | HTTP 401 without `x-secret` |
| HTTP 401 without header | HTTP 500 with ML down |

### WhatsApp NL flow

Send natural-language inventory message via WhatsApp to production number.

| PASS | FAIL |
|------|------|
| Intent routed to inventory workflow | Falls through to generic chat |
| Task/inventory lines created in Postgres | DB errors in logs |

---

## 8. Security smoke tests

| Test | Expected | PASS |
|------|----------|------|
| `POST /webhook/test` | **404** (no `ENABLE_WEBHOOK_TEST_ROUTE`) | 404 |
| `POST /resolve/task-inventory` without `x-secret` | **401** | 401 |
| `GET /api/docs` | Swagger loads (optional exposure review) | Accessible |

---

## 9. Web ↔ Backend integration

| Test | PASS | FAIL |
|------|------|------|
| Landing page loads on Vercel | 200 | Build/runtime error |
| Onboarding OTP request | SMS sent (MSG91) or controlled dev behavior | 5xx / CORS error |
| Browser network tab shows API calls to Railway URL | Correct host | `localhost` or wrong host |
| `/admin` leads (if used) | Turso connected | 401/500 |

---

## 10. Webhook verification

| Test | PASS | FAIL |
|------|------|------|
| Meta/Olli webhook verify (`GET` challenge) | 200 + challenge echo | 403 |
| Inbound WA message triggers Backend | 200 + processing | 404/500 |

---

## Summary scorecard

| Area | Items | PASS | FAIL |
|------|-------|------|------|
| Backend health | 1 | | |
| ML health | 1 | | |
| Database | 1 | | |
| `/help` intent | 1 | | |
| `/present` intent | 1 | | |
| `/members` intent | 1 | | |
| NL inventory | 1 | | |
| Security | 2 | | |
| Web integration | 1 | | |
| Webhook | 1 | | |

**Overall PASS:** All critical items (1–7, security) green.

**Overall FAIL:** Any critical health, DB, or intent routing failure.

---

## Troubleshooting quick reference

| Symptom | Likely cause |
|---------|--------------|
| Postgres down in `/health` | Wrong `POSTGRES_CONNECTION_STRING`, Postgres not ready |
| ML connection refused | `ML_URL` wrong, ML not deployed, or public/private mismatch |
| CORS errors in browser | `CORS_ORIGIN` missing Vercel domain |
| 401 on `/resolve/*` | Missing or wrong `x-secret` header |
| OTP not sent | MSG91 keys/template not configured |
| WhatsApp silent | Olli webhook URL or `OLLI_KEY` misconfigured |
