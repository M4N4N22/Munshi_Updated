# Phase 2.2 — Zoho OAuth Analysis

**Run date:** 2026-06-04  
**Scope:** OAuth connect/disconnect only — no sync

---

## 1. OAuth Design

### Flow

```text
Owner/Manager (web)
    → GET /integrations/zoho/authorize?factory_id&user_id
    → Signed state generated (factoryId, userId, nonce, exp)
    → 302 redirect to Zoho /oauth/v2/auth

Zoho
    → GET /integrations/zoho/callback?code&state
    → Validate state (signature, exp, nonce, replay)
    → Exchange code for tokens (mocked in tests)
    → Encrypt access_token + refresh_token
    → Upsert integration_connections (status=active)
    → 302 redirect to web /integrations?status=connected

Disconnect
    → POST /integrations/zoho/disconnect
    → status=disconnected, tokens cleared, row retained
```

### Environment

| Variable | Purpose |
|----------|---------|
| `ZOHO_CLIENT_ID` | Zoho developer app client ID |
| `ZOHO_CLIENT_SECRET` | Client secret (never logged) |
| `ZOHO_REDIRECT_URI` | Nest callback URL registered in Zoho app |
| `ZOHO_ACCOUNTS_URL` | Accounts host for data center (`.in` / `.com`) |
| `INTEGRATION_TOKEN_ENCRYPTION_KEY` | AES-256-GCM + OAuth state HMAC |
| `MUNSHI_WEB_URL` | Post-callback redirect target |

---

## 2. State Security Design

OAuth `state` format: `{base64url(payload)}.{hmac-sha256-signature}`

Payload fields:

| Field | Purpose |
|-------|---------|
| `factoryId` | Binds callback to tenant |
| `userId` | Binds callback to initiating user |
| `nonce` | One-time use ID stored in memory registry |
| `exp` | 10-minute TTL |

Validations on callback:

1. HMAC signature (timing-safe compare)
2. Expiration
3. Nonce known and not previously used (replay protection)
4. User still owner/manager of factory (re-check membership)

Cross-factory assignment is prevented because `factoryId` comes from signed state, not client-supplied callback params.

---

## 3. Token Security Design

`TokenCryptoService` uses **AES-256-GCM**:

- Key derived via SHA-256 of `INTEGRATION_TOKEN_ENCRYPTION_KEY`
- Random 12-byte IV per encryption
- Stored format: `{iv}.{ciphertext}.{authTag}` (base64url)

Tokens encrypted before DB write; decrypted only inside OAuth/refresh services. Connection list API strips token fields.

Logging policy: no access tokens, refresh tokens, authorization codes, or client secrets in logs.

---

## 4. Web UX Design

**Route:** `/integrations?factory_id=&user_id=`

Matches admin page visual language (`#0f1a14` background, `#25D366` accent).

| State | UI |
|-------|-----|
| Disconnected | Provider name, status, **Connect Zoho** button |
| Connected | Status, token expiry, **Disconnect** button |
| Connecting | Button shows "Connecting..." (redirect in progress) |
| Disconnecting | Button shows "Disconnecting..." |
| OAuth success | Green banner after callback redirect |
| OAuth error | Red banner with reason code |
| Server error | Inline error panel |

No sync controls, mapping UI, or inventory views in this phase.

---

## 5. Risks

| ID | Risk | Mitigation |
|----|------|------------|
| R-O01 | In-memory nonce store not multi-instance safe | Document for Phase 2.3+; Redis/DB nonce table if horizontal scale |
| R-O02 | Web uses query-param auth (no session JWT yet) | Same pattern as inventory REST; session auth is future hardening |
| R-O03 | Redirect URI env drift across dev/staging/prod | Document in `.env.example`; DevOps registers all URIs in Zoho app |
| R-O04 | Encryption key rotation | Manual re-connect required; document in security review |
| R-O05 | Token refresh only on explicit service call | No cron in 2.2; pull sync (2.3) calls `refreshConnectionIfNeeded` |

---

## 6. Authorization

`IntegrationAuthValidationService.assertCanManageIntegrations`:

- **Allowed:** `OWNER`, `MANAGER`
- **Forbidden:** `WORKER`

Applied on authorize, callback (membership re-check), disconnect, and list connections.
