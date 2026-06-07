# Phase 8 — Security Audit

**Branch:** `Shantanu`  
**Audit date:** 2026-06-07  
**Verdict:** **FAIL**

> Audit-only. No fixes applied.

---

## Hardcoded secrets & credentials

| Finding | Severity | Location | Details |
|---------|----------|----------|---------|
| OpenAI API key in tracked example file | **CRITICAL** | `ml/.env.example:15` | Full `sk-proj-…` key committed to git |
| Default `X_SECRET=secret` | HIGH | `backend/.env.example:32` | Weak default; used for guard + OTP pepper fallback |
| `WHATSAPP_VERIFY_TOKEN=change-me` | MEDIUM | `backend/.env.example:26` | Weak default |

**Git tracking check:** Only `.env.example` files are tracked (`git ls-files`). Local `.env` files are gitignored.

**Action required before merge:** Rotate OpenAI key if live; replace `ml/.env.example` value with placeholder.

---

## Test / debug endpoints

| Endpoint | Auth | Severity | Location |
|----------|------|----------|----------|
| `POST /webhook/test` | None | **CRITICAL** | `whatsapp.controller.ts:47–50` |
| `POST /resolve/task-inventory` | None (guard exists but unused) | **CRITICAL** | `task-inventory-resolution.controller.ts` |
| `GET /api/docs` (Swagger) | None | MEDIUM | `main.ts:74` |

`/webhook/test` bypasses Olli inbound parser and invokes full message handling — allows arbitrary WhatsApp flow triggering if backend is reachable.

---

## OTP exposure

`onboarding-sms.service.ts` returns OTP in API response when:

```typescript
ONBOARDING_OTP_EXPOSE_IN_RESPONSE === 'true' || NODE_ENV !== 'production'
```

**Risk:** Staging/preview deployments without `NODE_ENV=production` leak OTPs in JSON responses.

Not documented in `backend/.env.example`.

---

## Unsafe logging

| Location | Finding | Severity |
|----------|---------|----------|
| `whatsapp.controller.ts:27` | `console.log({ controller_body: body })` — full webhook payload | MEDIUM |
| Zoho OAuth services | Documented policy: no tokens in logs | PASS (per prior reviews) |
| OTP storage | SHA-256 + pepper | PASS |

---

## Sensitive data exposure

| Area | Finding |
|------|---------|
| Swagger UI | Public API surface enumeration |
| `InternalCallGuard` | Implemented but never wired to internal routes |
| Integration tokens | Encrypted via `INTEGRATION_TOKEN_ENCRYPTION_KEY` when set |
| Leads admin | Protected by `ADMIN_SECRET_KEY` header — key not in `.env.example` |

---

## Dependency vulnerabilities (web)

`npm install` reported 4 vulnerabilities (2 moderate, 1 high, 1 critical). Not auto-remediated during audit.

---

## ML service

| Check | Result |
|-------|--------|
| API key loaded from env | PASS |
| Key in example file | **FAIL** |
| Auth on `/classify`, `/parse` | None — network-level trust assumed |

---

## Summary by severity

| Severity | Count | Examples |
|----------|-------|----------|
| CRITICAL | 3 | OpenAI key in git, `/webhook/test`, unguarded `/resolve` |
| HIGH | 3 | Weak `X_SECRET`, OTP expose in non-prod, `ML_URL` localhost fallback |
| MEDIUM | 4 | Swagger public, webhook body logging, verify token default, npm audit |
| LOW | 2 | Commented legacy code, streamlit in ML deps |

**Overall:** **FAIL**
