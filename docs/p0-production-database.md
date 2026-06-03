# P0 — Production database (Supabase only)

The API must use **one** Postgres database in production: **Supabase**. Do not point EC2 at the legacy EC2 Postgres host (`65.1.128.181:5431`).

## EC2 checklist

1. SSH to the API host and edit `Munshi_Updated/.env` (or your process manager env file).
2. Set **only** Supabase:

   ```env
   POSTGRES_CONNECTION_STRING=postgresql://postgres.PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:5432/postgres?sslmode=require
   ```

3. Remove or comment any `POSTGRES_CONNECTION_STRING` pointing at `65.1.128.181` or `munshi_data`.
4. Remove a **system-level** `POSTGRES_CONNECTION_STRING` if set (it overrides `.env` unless you use `env-cmd -f .env` / `main.ts` dotenv override).
5. Run migrations on Supabase **before** restarting the API:

   ```bash
   cd Munshi_Updated
   npm run db:migrate
   ```

6. Restart the API (`npm run start` or PM2). Confirm logs:

   ```text
   Successfully connected to PostgreSQL (….pooler.supabase.com)
   ```

7. Smoke test: complete web onboarding → verify rows in Supabase **Table Editor** (`users`, `factories`, `factory_users`).

## OTP persistence (P0)

OTP and phone verification are stored in:

- `onboarding_otp_challenges`
- `onboarding_phone_verifications`

Codes are stored as **SHA-256 hashes** (pepper: `OTP_PEPPER` or `X_SECRET`). Safe across API restarts and multiple instances.

## Finance foundation (P0)

Migration `007_p0_finance_foundation.sql` adds tables for AA/bank linking and bookkeeping (no business logic yet):

| Table | Purpose |
|-------|---------|
| `bank_consents` | AA consent per factory/owner |
| `bank_accounts` | Linked accounts (masked) |
| `bank_transactions` | Statement lines |
| `ledger_accounts` | Chart of accounts |
| `journal_entries` / `journal_lines` | Double-entry v0 |
| `match_suggestions` | Bank ↔ vendor match proposals |
| `domain_events` | Outbox for cross-engine events |

## Domain events

`DomainEventsService.publish()` writes to `domain_events`. A cron runs every minute and marks events `COMPLETED` (handlers wired in P1).

Example after onboarding: `onboarding.registered`.
