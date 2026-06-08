# Phase 2 — Olli Signature Verification Audit

**Date:** 2026-06-08  
**Scope:** Inspection only — no code or config changes  
**Olli dashboard feature:** Signing Secret → `X-GetOlli-Signature` header on webhook POSTs

---

## Search scope

Searched entire `backend/` tree for:

| Term | Matches in webhook/auth path |
|------|------------------------------|
| `X-GetOlli-Signature` | **0** |
| `GetOlli` (signature context) | **0** — only inbound payload parsing comments |
| `OLLI_SIGNING` / `SIGNING_SECRET` / `WEBHOOK_SECRET` | **0** |
| `hmac` / `sha256` (webhook) | **0** — only Zoho OAuth state (`zoho-oauth-state.service.ts`) and OTP hashing |

---

## Verdict

**Does the backend validate webhook signatures?**

## **NO**

---

## Evidence

### 1. `POST /webhook` has no guards or signature logic

`WhatsAppController.receiveMessage()` accepts `@Body() body: any` with no:

- NestJS guards (`@UseGuards`)
- Custom middleware
- Header extraction (`@Headers('x-getolli-signature')`)
- HMAC comparison

### 2. No environment variable for Signing Secret

`backend/.env.example` lists WhatsApp-related vars:

| Variable | Purpose |
|----------|---------|
| `WHATSAPP_VERIFY_TOKEN` | GET handshake only |
| `OLLI_URL` | Outbound GetOlli API base |
| `OLLI_KEY` | Outbound `X-API-Key` header |

There is **no** `OLLI_SIGNING_SECRET`, `GETOLLI_SIGNING_SECRET`, or equivalent in `.env.example` or any `process.env` reference in the backend source.

### 3. `OLLI_KEY` is outbound-only

`backend/src/core/messaging/messaging.service.ts` and `olli-media.service.ts` use `OLLI_KEY` as `X-API-Key` when **sending** messages to GetOlli (`POST ${OLLI_URL}/external/waba/send`). It is not used for inbound webhook verification.

### 4. Only other HMAC usage is unrelated

| File | Purpose |
|------|---------|
| `zoho-oauth-state.service.ts` | Zoho OAuth CSRF state signing |
| `onboarding-otp.crypto.ts` | OTP pepper hashing |
| `token-crypto.service.ts` | Integration token encryption key derivation |

None of these participate in WhatsApp webhook handling.

---

## Signing Secret status

The Olli dashboard **Signing Secret is currently unused** by the Munshi backend.

Inbound webhooks are accepted based solely on:

1. Reachability of `POST /webhook`
2. JSON body shape parseable by `parseWhatsAppInbound()`

Any client that can POST to the public Railway URL can inject webhook-shaped payloads. There is no cryptographic authenticity check.

---

## What would be required (informational — not implemented)

If signature verification were added in a future change, typical requirements would be:

| Item | Expected value |
|------|----------------|
| **Env var** | New secret (e.g. `OLLI_SIGNING_SECRET`) — not present today |
| **Header** | `X-GetOlli-Signature` |
| **Algorithm** | HMAC-SHA256 over raw request body (exact Olli spec should be confirmed against GetOlli docs) |
| **Location** | Guard or middleware on `POST /webhook` before `receiveMessage()` |

**This audit does not implement any of the above.**

---

## Security implication for pilot

| Action | Blocked by missing signature check? |
|--------|-------------------------------------|
| Olli "Send Test Webhook" | **No** — will be accepted |
| Real inbound WhatsApp message | **No** — will be accepted |
| Spoofed webhook from third party | **Not prevented** — signature not enforced |

Missing signature verification is a **security gap**, not a **functional blocker** for receiving Olli webhooks today.
