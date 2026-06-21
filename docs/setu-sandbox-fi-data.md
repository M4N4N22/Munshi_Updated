# Setu sandbox — FI data payloads for Munshi

**Date:** 2026-06-19  
**Status:** Validated in sandbox (consent → session → GET session)  
**Related:** [p1-setu-bank-linking-research.md](./p1-setu-bank-linking-research.md)

Fixtures (trimmed samples for tests):

- `backend/test/fixtures/setu/consent-status-update.webhook.json`
- `backend/test/fixtures/setu/create-session.request.json`
- `backend/test/fixtures/setu/get-session-completed.sample.json`

---

## Is this the payload Munshi needs?

**Yes.** Munshi bookkeeping needs the **GET data session** response (or the same structure inline in an `FI_DATA_READY` webhook). That is where bank **transactions** live.

| Phase | API / event | What you get | Munshi use |
|-------|-------------|--------------|------------|
| Consent | `CONSENT_STATUS_UPDATE` webhook | `ACTIVE` + linked accounts | `bank_consents`, `bank_accounts` |
| Data session | `POST /v2/sessions` | Session `id`, status `PENDING` | Trigger fetch |
| Data session | `SESSION_STATUS_UPDATE` webhook (optional) | Session status | Poll / ingest when `COMPLETED` |
| **FI data** | **`GET /v2/sessions/:id`** | **`fips[].accounts[].data.account.transactions`** | **`bank_transactions`** |

The JSON you captured from `GET {{base_url}}/v2/sessions/:id` with `"status": "COMPLETED"` is the **ingest target** for `BankIngestService`.

---

## End-to-end sandbox flow (validated)

```
1. POST https://accountservice.setu.co/v1/users/login
   Header: client: bridge
   → access_token (TEST scope, ~5 min)

2. POST https://fiu-sandbox.setu.co/v2/consents
   Headers: Authorization, x-product-instance-id, (optional x-client-id/secret)
   → id, url (PENDING)

3. Browser: open url → OTP → link account → Approve
   → redirectUrl (e.g. www.munshidada.com/bank/complete)

4. Webhook → Test callback URL (Beeceptor)
   type: CONSENT_STATUS_UPDATE, status: ACTIVE, detail.accounts[]

5. POST https://fiu-sandbox.setu.co/v2/sessions
   Body: consentId, format: json, dataRange (must ⊆ consent dataRange)

6. GET https://fiu-sandbox.setu.co/v2/sessions/{sessionId}
   When status: COMPLETED → parse transactions
```

**Auth credentials:** org-level **Settings → API credentials → TEST** (`clientID` + `secret` for login). **Product ID** from the AA product → `x-product-instance-id`.

**Sandbox hosts:** `fiu-sandbox.setu.co` or `fiu-uat.setu.co` for UI; use `fiu-sandbox.setu.co` for API unless Bridge docs say otherwise.

---

## Request: create data session

`POST /v2/sessions`

```json
{
  "consentId": "a8a2e055-34c6-4fa0-9bd6-71f7496de31e",
  "format": "json",
  "dataRange": {
    "from": "2022-12-01T00:00:00.000Z",
    "to": "2023-08-12T00:00:00.000Z"
  }
}
```

**Rule:** `dataRange` must be **fully inside** the consent’s `detail.dataRange` from create-consent (or `GET /v2/consents/:id?expanded=true`). Wider or older dates → `FI dataRange is not within the consent's FIDataRange`.

---

## Webhook: consent active (not transactions)

```json
{
  "type": "CONSENT_STATUS_UPDATE",
  "consentId": "a8a2e055-34c6-4fa0-9bd6-71f7496de31e",
  "success": true,
  "data": {
    "status": "ACTIVE",
    "detail": {
      "accounts": [
        {
          "linkRefNumber": "8e02accb-035b-4b91-aae7-02992a090aa8",
          "fipId": "setu-fip",
          "maskedAccNumber": "XXXXXXXX5866",
          "accType": "SAVINGS",
          "fiType": "DEPOSIT"
        }
      ]
    }
  }
}
```

Map `linkRefNumber` → `bank_accounts.account_ref`. Match later FI rows via `linkedAccRef` / `linkRefNumber`.

---

## Response: GET session (transactions — ingest this)

`GET /v2/sessions/{sessionId}` when `"status": "COMPLETED"`

Top-level fields Munshi should persist:

| Field | Munshi usage |
|-------|----------------|
| `id` | `bank_transactions.fetch_batch_id` (data session id) |
| `status` | `COMPLETED` / `PARTIAL` before ingest |
| `dataRange` | Audit / reconcile with consent |
| `fips[].fipID` | Provider metadata |
| `fips[].accounts[].linkRefNumber` | Join to `bank_accounts.account_ref` |
| `fips[].accounts[].maskedAccNumber` | Display / verify account |
| `fips[].accounts[].data.account.transactions.transaction[]` | **Bulk insert rows** |

### Per-transaction mapping → `bank_transactions`

| Setu field | Munshi column | Notes |
|------------|---------------|--------|
| `txnId` (prefer over `reference`) | `external_txn_id` | Idempotency key with account |
| `transactionTimestamp` | `txn_date` | ISO timestamp |
| `valueDate` | `value_date` | Date string |
| `amount` | `amount` | String decimal in sandbox |
| `type` `CREDIT` / `DEBIT` | `direction` | Lowercase or enum in app |
| `narration` | `narration` | UPI/FT text — matching input |
| `currentBalance` | `balance_after` | Optional |
| `mode` | (optional) | UPI, NEFT, etc. — can go in `raw_payload` |
| Full transaction object | `raw_payload` | JSONB |
| Session `id` | `fetch_batch_id` | Same for all rows in one fetch |

**Idempotency:** upsert on `(bank_account_id, external_txn_id)` or `(factory_id, external_txn_id)`.

---

## What Munshi does *not* store from this payload

- Full consent UI flow (handled once per link)
- Encrypted ReBIT legacy payloads (Setu FIU gateway returns JSON in sandbox — no Rahasya decrypt for this path)
- Every FIP metadata field — only what’s needed for accounts + transactions

---

## Bridge / product config reminders

Before production, align Bridge Step 1 with Munshi (not loan-demo defaults):

- **Purpose code** `102`, text about business bookkeeping
- **FI types:** `DEPOSIT` only (owner current/savings)
- **Data range:** rolling ~2 years through today
- **Fetch frequency:** e.g. monthly, not daily (cost)
- **Redirect URL:** `https://www.munshidada.com/bank/complete`
- **Production callback URL:** `https://<railway-backend>/webhooks/setu` (not the redirect URL)

---

## Implementation pointers

1. **`SetuClient`:** login token cache; `createConsent`, `createSession`, `getSession`, `getConsent`
2. **`POST /webhooks/setu`:** handle `CONSENT_STATUS_UPDATE`, `SESSION_STATUS_UPDATE`, `FI_DATA_READY`
3. **`BankIngestService.ingestSession(sessionJson, consentId)`:** walk `fips[].accounts[]`, normalize `transaction[]`, bulk insert
4. **`domain_events`:** `bank.consent.active`, `bank.statement.fetched`

See [p1-setu-bank-linking-research.md](./p1-setu-bank-linking-research.md) for schema tables and build order.
