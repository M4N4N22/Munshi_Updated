# Onboarding OTP API

## Endpoints

| Method | Path | Body |
|--------|------|------|
| GET | `/onboarding/config` | — returns `{ "otp_required": true \| false }` |
| POST | `/onboarding/otp/send` | `{ "phone_number": "919876543210" }` |
| POST | `/onboarding/otp/verify` | `{ "phone_number": "919876543210", "code": "482910" }` |
| POST | `/onboarding/register` | `{ "phone_number": "919876543210", "name": "...", "factory_name": "..." }` → returns `setup_token` |
| GET | `/onboarding/setup/status?setup_token=...` | Setup wizard progress |
| POST | `/onboarding/setup/inventory/preview` | `multipart`: `file`, `setup_token` — parse + review before import |
| POST | `/onboarding/setup/inventory/import` | `multipart`: `file`, `setup_token` |
| POST | `/onboarding/setup/inventory/skip` | `{ "setup_token": "..." }` |
| POST | `/onboarding/setup/inventory/zoho-complete` | `{ "setup_token": "..." }` (fallback if Zoho connected before auto-complete) |
| POST | `/onboarding/setup/team/import` | `multipart`: `file`, `setup_token` |
| POST | `/onboarding/setup/team/skip` | `{ "setup_token": "..." }` |
| POST | `/onboarding/setup/complete` | `{ "setup_token": "...", "notify_employees": true }` — batch WhatsApp welcomes |

## Environment (API)

| Variable | Purpose |
|----------|---------|
| `ONBOARDING_MSG91_AUTH_KEY` | MSG91 auth key (production SMS) |
| `ONBOARDING_MSG91_TEMPLATE_ID` | MSG91 OTP template id |
| `ONBOARDING_SKIP_OTP` | Set `true` to allow `/onboarding/register` without OTP (pilot) |
| `ONBOARDING_OTP_EXPOSE_IN_RESPONSE` | Set `true` to return `dev_otp` in JSON even in production (avoid) |

Without MSG91, OTP is logged to the API console. In non-production, `dev_otp` is included in the send response for local testing.

When `ONBOARDING_SKIP_OTP=true`, the web form registers directly and opens the setup wizard (inventory → team → WhatsApp).

### Inventory step (web)

- Upload CSV → **preview** (row table + new/existing counts) → **Confirm import**
- Zoho connect is **coming soon** on web onboarding (disabled)
- Test CSVs: `/inventory-import/test-samples/`

## CORS

Allow the web app origin, e.g. `CORS_ORIGIN=http://localhost:3000,https://www.munshidada.com`

## Notes

- OTP store is in-memory (single instance). Use Redis/Postgres before horizontal scale.
- Verified state is kept 30 minutes for a future `POST /onboarding/register` step.
