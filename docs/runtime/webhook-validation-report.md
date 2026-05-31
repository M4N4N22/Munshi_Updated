# Webhook Validation Report

**Date:** 2026-05-31  
**Endpoint:** `POST /webhook/test`  
**Controller:** `src/modules/whatsapp/whatsapp.controller.ts`

## Test payloads

```json
{ "from": "918604856137", "message": "/help" }
{ "from": "918604856137", "message": "present" }
```

Both return **HTTP 400** with identical downstream failure pattern.

---

## API response (evidence)

```json
HTTP 400
{
  "meta": {
    "success": false,
    "message": "Request failed with status code 400",
    "failures": {
      "message": "Authentication Error",
      "success": false,
      "error": "whatsapp_api_error",
      "details": {
        "message": "Authentication Error",
        "code": 190,
        "type": "OAuthException",
        "fbtrace_id": "AFFn3hzF14IOqm5qFWi3q4k"
      }
    }
  }
}
```

Latency: ~400–815 ms (includes ML classify + command processing + Olli send attempt).

---

## Processing flow (verified in code)

`WhatsAppService.handleIncomingMessage()`:

1. Workflow session check → none for `/help`
2. **ML classify** — `POST ${ML_URL}/classify?message=...`
3. `processCommand()` — builds help text (in-process, succeeds)
4. **`sendTextMessage()`** → `MessagingService.sendText()` → `POST ${OLLI_URL}/external/waba/send`
5. Olli returns 400 → axios throws → caught → re-thrown through exception filter

---

## ML_URL investigation

```bash
GET http://13.126.57.78:8000/health
→ {"status":"ok"}
```

**ML is reachable.** `/help` and `present` both reach classify step (latency consistent with ML round-trip).

**Conclusion: Not an ML_URL failure.**

---

## Olli / WhatsApp investigation

`MessagingService.sendText()` (`src/core/messaging/messaging.service.ts`):

```typescript
POST ${process.env.OLLI_URL}/external/waba/send
Headers: X-API-Key: process.env.OLLI_KEY
```

Configured in `.env.local`:

```
OLLI_URL=https://api.getolliai.com/api/v1
OLLI_KEY=waba_f942ca5c...
WHATSAPP_TOKEN=EAAYCHWObkq8...  (used elsewhere, not in sendText path)
```

Olli proxy returns Meta **OAuthException code 190** — invalid/expired WhatsApp access token on Olli side.

**Conclusion: Configuration issue (Olli/WABA credentials), not application logic defect.**

---

## GET `/webhook` (Meta verification)

```
GET /webhook → 200 "Verification failed"
```

Expected when query params omit valid `hub.verify_token`. With correct token:

```
GET /webhook?hub.mode=subscribe&hub.verify_token=my_super_secret_123&hub.challenge=12345
→ returns challenge string
```

Verification path **works** — no external API call.

---

## Graceful handling recommendation (not implemented — out of scope)

Current behavior: outbound send failure → HTTP 400 to test client.

For `/webhook/test` in dev, optional pattern:

- Return `{ processed: true, reply: "...", sent: false, reason: "Olli auth" }` without failing HTTP

**Not changed in this sprint** (validation only, no feature work).

---

## Classification summary

| Factor | Status |
|--------|--------|
| ML_URL | ✅ Reachable |
| Command processing | ✅ Runs (failure is post-processing) |
| Olli auth | ❌ **OAuth 190 — blocked** |
| Code defect | ❌ None identified |
| Production credentials | ⚠️ Must refresh Olli/WABA token |

---

## Conclusion

`POST /webhook/test` fails because **outbound WhatsApp send via Olli is rejected (Authentication Error / OAuth 190)**. Inbound command handling and ML classification appear functional. Unblock by rotating valid Olli API key / WhatsApp Business token — no backend code change required for auth itself.
