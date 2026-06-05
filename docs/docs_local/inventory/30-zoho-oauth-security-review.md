# Phase 2.2 — Zoho OAuth Security Review

**Run date:** 2026-06-04  
**Reviewer:** Implementation validation (automated + design review)

---

## 1. State Validation Review

| Control | Implementation | Test evidence |
|---------|----------------|---------------|
| HMAC-SHA256 signature | `ZohoOAuthStateService.sign/verifySignature` | Unit: tampered payload rejected |
| Expiration (10 min) | `exp` field + `Date.now()` check | Unit: expired state rejected |
| Nonce registry | In-memory Map, one-time use | Unit + integration: replay → 401 |
| Factory binding | `factoryId` in signed payload | Integration: cross-factory authorize → 403 |
| User binding | `userId` in payload + membership re-check on callback | Integration: worker → 403 |

**Assessment:** State validation meets Phase 2.2 requirements for CSRF and tenant binding.

---

## 2. Token Encryption Review

| Control | Implementation |
|---------|----------------|
| Algorithm | AES-256-GCM |
| Key source | `INTEGRATION_TOKEN_ENCRYPTION_KEY` → SHA-256 digest |
| IV | Random 12 bytes per encryption |
| Auth tag | Verified on decrypt |
| At-rest format | No plaintext tokens in DB |

**Assessment:** Tokens are encrypted before persistence. Decryption limited to OAuth service paths.

**Gap (accepted for 2.2):** Key rotation procedure is manual — document for ops.

---

## 3. Replay Attack Protection

1. Nonce generated with `randomBytes(16)` at authorize time.
2. Nonce registered as `{ used: false }`.
3. Callback marks nonce used on successful validation.
4. Second callback with same state → `OAuth state already used` → HTTP 401.

**Assessment:** Replay protection verified in integration tests.

**Residual:** In-memory nonce store resets on process restart (allows replay of very old state only if attacker captured state before restart AND within TTL — low risk).

---

## 4. Cross-Factory Isolation Review

| Vector | Mitigation |
|--------|------------|
| User A initiates OAuth for factory B | `assertCanManageIntegrations` on authorize — 403 if not member |
| Callback assigns tokens to wrong factory | `factoryId` from signed state only |
| List connections across tenants | `factory_id` query param + membership check; each factory sees own rows |
| Disconnect another factory's connection | `updateConnection` WHERE `id AND factory_id` |

**Assessment:** Factory isolation enforced at auth layer and repository WHERE clauses.

---

## 5. Residual Risks

| ID | Risk | Severity | Recommendation |
|----|------|----------|----------------|
| SR-01 | Nonce store in-memory (single instance) | Medium | Move to Redis or DB before multi-instance prod |
| SR-02 | Web auth via query params (no JWT session) | Medium | Add session auth when web login ships |
| SR-03 | No token revocation call to Zoho on disconnect | Low | Optional Zoho revoke API in future hardening |
| SR-04 | Encryption key in env var | Medium | Use KMS/secret manager in production |
| SR-05 | Logs could leak state param if debug enabled | Low | Ensure production log level excludes query strings |

---

## 6. Logging Review

Verified: OAuth service logs factory ID on exchange failure only — **no tokens, codes, or secrets** in log messages.

---

## 7. Overall Security Posture

**Phase 2.2 security objectives met** for development and single-instance deployment.

Approved to proceed to **Phase 2.3 Zoho Pull Sync** with note to address SR-01 and SR-02 before multi-tenant production scale.
