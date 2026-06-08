# Phase 3 — WhatsApp Verification (Handshake) Audit

**Date:** 2026-06-08  
**Scope:** Inspection only — no code or config changes

---

## `WHATSAPP_VERIFY_TOKEN` usage

| Attribute | Value |
|-----------|-------|
| **Env var** | `WHATSAPP_VERIFY_TOKEN` |
| **Declared in** | `backend/.env.example` (line 26) |
| **Railway status** | Configured (per deployment context) |
| **Used by** | `GET /webhook` only |
| **Not used by** | `POST /webhook`, `POST /webhook/test` |

---

## Endpoint

```
GET https://backend-production-41504.up.railway.app/webhook
```

Query parameters (Meta Cloud API / WABA subscription pattern):

| Parameter | Role |
|-----------|------|
| `hub.mode` | Must equal `subscribe` |
| `hub.verify_token` | Compared to `WHATSAPP_VERIFY_TOKEN` |
| `hub.challenge` | Echoed back on success |

---

## Verification logic

```17:21:backend/src/modules/whatsapp/whatsapp.controller.ts
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return challenge;
    }

    return 'Verification failed';
```

**Rules:**

1. Both conditions must be true: `hub.mode === 'subscribe'` **and** `hub.verify_token === WHATSAPP_VERIFY_TOKEN`
2. Success response: raw `hub.challenge` string (not JSON-wrapped by controller; Nest may wrap in standard response envelope depending on interceptors)
3. Failure response: `"Verification failed"` — still HTTP 200 on live staging (observed with wrong token)

**Comparison:** strict string equality (`===`). No trimming, no timing-safe compare.

---

## Expected handshake behavior

### Successful subscription verify

```
Request:
  GET /webhook?hub.mode=subscribe&hub.verify_token=<WHATSAPP_VERIFY_TOKEN>&hub.challenge=CHALLENGE_STRING

Response:
  HTTP 200
  Body: CHALLENGE_STRING
```

Olli/Meta stores the webhook URL after receiving the echoed challenge.

### Failed verify

```
Request:
  GET /webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=test123

Response (live staging 2026-06-08):
  HTTP 200
  Body: "Verification failed"
```

### Inbound messages (POST)

`WHATSAPP_VERIFY_TOKEN` is **not consulted** on `POST /webhook`. Once the webhook URL is registered, all inbound message authenticity relies on network reachability only (no `X-GetOlli-Signature` check — see `21-signature-verification-audit.md`).

---

## Relationship to Olli dashboard fields

| Olli / Meta field | Backend mapping |
|-------------------|-----------------|
| Webhook URL | Must be `https://backend-production-41504.up.railway.app/webhook` |
| Verify token (subscription) | Must match Railway `WHATSAPP_VERIFY_TOKEN` |
| Signing Secret | **Not wired** in backend |

For handshake to succeed, the verify token entered in the Olli/Meta webhook configuration must exactly match the `WHATSAPP_VERIFY_TOKEN` secret on the Railway backend service.

---

## POST inbound — separate from handshake

| Step | Behavior |
|------|----------|
| Olli delivers `POST /webhook` | No verify-token check |
| `event: 'status'` | Ignored → returns `'ok'` |
| `event: 'message'` | Parsed and handled |
| Malformed JSON | HTTP 400 (Nest validation) |
| Valid message, unknown phone | Handler runs; may reply "register first" or error depending on ML intent |

---

## Configuration checklist (handshake only)

| Check | Status |
|-------|--------|
| `WHATSAPP_VERIFY_TOKEN` set on Railway backend | **Configured** (per context) |
| `GET /webhook` route live | **Verified** (live probe) |
| Verify token in Olli matches Railway secret | **Cannot confirm** — requires Olli dashboard inspection (out of scope; no Olli config changes) |
