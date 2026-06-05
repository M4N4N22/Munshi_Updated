# Phase 2.2 — Zoho OAuth Implementation

**Run date:** 2026-06-04

---

## 1. Files Created

| File | Purpose |
|------|---------|
| `backend/src/services/integrations/token-crypto.service.ts` | AES-256-GCM encrypt/decrypt |
| `backend/src/services/integrations/token-crypto.service.spec.ts` | Unit tests |
| `backend/src/services/integrations/integration-auth.validation.ts` | Owner/manager gate |
| `backend/src/services/integrations/zoho/zoho-oauth.constants.ts` | Scopes, TTL constants |
| `backend/src/services/integrations/zoho/zoho-oauth-state.service.ts` | Signed state + nonce registry |
| `backend/src/services/integrations/zoho/zoho-oauth-state.service.spec.ts` | State security unit tests |
| `backend/src/services/integrations/zoho/zoho-oauth.client.ts` | Zoho token HTTP client (mockable) |
| `backend/src/services/integrations/zoho/zoho-oauth.service.ts` | OAuth + refresh + list + disconnect |
| `backend/src/services/integrations/zoho/zoho-oauth.controller.ts` | REST endpoints |
| `backend/src/services/integrations/zoho/zoho-oauth.dto.ts` | Request validation DTOs |
| `backend/test/integration/zoho-oauth.integration.spec.ts` | Integration tests (mocked Zoho) |
| `web/app/integrations/page.tsx` | Integrations page |
| `web/components/integrations/integrations-panel.tsx` | Connect/disconnect UI |
| `web/lib/api/integrations.ts` | Web API helpers |
| `web/__tests__/integrations-panel.test.tsx` | UI rendering tests |
| `web/vitest.config.ts` | Vitest config |

---

## 2. Files Modified

| File | Change |
|------|--------|
| `backend/src/services/integrations/integration.repository.ts` | `updateConnection`, `findActiveConnectionByProvider`, `getConnectionById` |
| `backend/src/services/integrations/integration.module.ts` | OAuth providers + controller |
| `backend/src/app/api/app.module.ts` | Import `IntegrationModule` |
| `backend/.env.example` | Zoho + encryption env vars |
| `web/package.json` | Vitest + testing-library scripts/deps |

**Not modified:** inventory services, import pipeline, WhatsApp, task inventory, Phase 2.1 table schema.

---

## 3. API Endpoints

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/integrations/zoho/authorize` | Owner/manager | 302 → Zoho |
| GET | `/integrations/zoho/callback` | State validation | 302 → web |
| POST | `/integrations/zoho/disconnect` | Owner/manager | `{ disconnected: true }` |
| GET | `/integrations/connections` | Owner/manager | Array of summaries (no tokens) |

Query/body params: `factory_id`, `user_id` (+ optional `connection_id` on disconnect).

---

## 4. Token Storage Flow

```text
Zoho token response (plaintext, in memory only)
    → TokenCryptoService.encrypt()
    → integration_connections.access_token / refresh_token
    → expires_at = now + expires_in

Read path (refresh only):
    → TokenCryptoService.decrypt(refresh_token)
    → ZohoOAuthClient.refreshAccessToken()
    → re-encrypt + update row
```

Disconnect clears token columns but retains connection row and mappings (future phases).

---

## 5. Web Flow

```text
/integrations?factory_id=1&user_id=2
    → GET /integrations/connections
    → Render status + Connect or Disconnect

Connect click
    → window.location = /integrations/zoho/authorize?...

After Zoho
    → API callback → redirect /integrations?status=connected
    → Success banner + refreshed connection list
```

---

## 6. Service Methods (no cron)

| Method | Purpose |
|--------|---------|
| `refreshConnectionIfNeeded(connectionId)` | Refresh if within 5 min of expiry |
| `buildAuthorizeRedirectUrl` | Start OAuth |
| `handleOAuthCallback` | Complete OAuth |
| `disconnect` | Soft disconnect |
| `listConnections` | Safe summaries |

No sync runs, mappings, or inventory writes.
