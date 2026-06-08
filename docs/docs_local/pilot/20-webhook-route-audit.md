# Phase 1 — Webhook Route Audit

**Date:** 2026-06-08  
**Scope:** Inspection only — no code or config changes  
**Live backend:** `https://backend-production-41504.up.railway.app`

---

## Global routing context

`backend/src/main.ts` does **not** set a global API prefix (`app.setGlobalPrefix('db')` is commented out). WhatsApp routes are mounted at the path declared on the controller, with no `/api` prefix.

---

## Production webhook routes

| Route | Method | Controller | Handler | Purpose |
|-------|--------|------------|---------|---------|
| `/webhook` | `GET` | `WhatsAppController` | `verifyWebhook()` | Meta-style subscription handshake |
| `/webhook` | `POST` | `WhatsAppController` | `receiveMessage()` | Inbound Olli/GetOlli WABA messages |
| `/webhook/test` | `POST` | `WhatsAppController` | `handleMessage()` | Dev/staging injection only (env-gated) |

**Source:** `backend/src/modules/whatsapp/whatsapp.controller.ts`

No other controllers register `/webhook`, `/whatsapp/webhook`, or `/webhooks/*` paths.

---

## Verification flow — `GET /webhook`

```11:22:backend/src/modules/whatsapp/whatsapp.controller.ts
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return challenge;
    }

    return 'Verification failed';
  }
```

**Behavior:**

1. Olli/Meta sends `GET /webhook?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<challenge>`
2. Backend compares `hub.verify_token` to `process.env.WHATSAPP_VERIFY_TOKEN`
3. On match: returns `hub.challenge` as plain text (HTTP 200)
4. On mismatch: returns `"Verification failed"` (HTTP 200)

**Live probe (2026-06-08):** `GET /webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=test123` → HTTP 200, body `"Verification failed"`. Route is live and responding.

---

## Inbound flow — `POST /webhook`

```25:45:backend/src/modules/whatsapp/whatsapp.controller.ts
  @Post()
  async receiveMessage(@Body() body: any) {
    console.log({ controller_body: body });

    const inbound = parseWhatsAppInbound(body);
    if (!inbound) {
      return 'ok';
    }

    if (inbound.kind === 'document') {
      return await this.whatsappService.handleIncomingDocument(
        inbound.from,
        inbound.media,
      );
    }

    return await this.whatsappService.handleIncomingMessage({
      from: inbound.from,
      message: inbound.message,
    });
  }
```

**Verification flow (POST):**

1. No auth guard, no middleware, no signature check on this route
2. Raw JSON body passed to `parseWhatsAppInbound()` (`whatsapp-inbound.parser.ts`)
3. Non-`message` events (e.g. `event: 'status'`) → parser returns `null` → handler returns `'ok'` immediately
4. Parsed text/interactive/document → routed to `WhatsAppService`

**Parser contract (GetOlli shapes):** expects `event: 'message'` (or omitted) and `data.from`, `data.type`, `data.text` / `data.media` / interactive fields. Covered by `whatsapp-inbound.parser.spec.ts`.

---

## Staging-only route — `POST /webhook/test`

```47:53:backend/src/modules/whatsapp/whatsapp.controller.ts
  @Post('test')
  async handleMessage(@Body() body: WhatsAppIncomingDto) {
    if (process.env.ENABLE_WEBHOOK_TEST_ROUTE !== 'true') {
      throw new NotFoundException();
    }
    return this.whatsappService.handleIncomingMessage(body);
  }
```

- Bypasses Olli inbound parser; accepts `{ from, message }` directly
- **Currently enabled on staging** (`ENABLE_WEBHOOK_TEST_ROUTE=true` per deployment notes)
- Not the production Olli webhook path

---

## Routes that do **not** exist

| Path | Live result |
|------|-------------|
| `/whatsapp/webhook` | **404** — `Cannot GET /whatsapp/webhook` |
| `/api/webhook` | Not registered |
| `/webhooks/whatsapp` | Not registered |

**Note:** Several deployment runbooks (`deployment/06-networking-plan.md`, `deployment/10-final-deployment-runbook.md`) incorrectly reference `/whatsapp/webhook`. The implemented route is **`/webhook` only**.

---

## Correct production webhook URL

```
https://backend-production-41504.up.railway.app/webhook
```

Both `GET` (handshake) and `POST` (inbound messages) use this single path.
