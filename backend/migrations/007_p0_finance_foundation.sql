-- P0: Persisted onboarding OTP, finance foundation (AA + ledger + matching), domain events.
-- Apply after 006. Idempotent where possible.

BEGIN;

-- ---------------------------------------------------------------------------
-- Onboarding OTP (replaces in-memory store)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS onboarding_otp_challenges (
  phone_number VARCHAR(20) PRIMARY KEY,
  code_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_otp_expires
  ON onboarding_otp_challenges (expires_at);

CREATE TABLE IF NOT EXISTS onboarding_phone_verifications (
  phone_number VARCHAR(20) PRIMARY KEY,
  verified_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_verified_expires
  ON onboarding_phone_verifications (expires_at);

-- ---------------------------------------------------------------------------
-- Account Aggregator — owner bank consent (own-account only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bank_consents (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  aa_consent_id VARCHAR(255) NOT NULL,
  aa_customer_id VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  consent_start_at TIMESTAMPTZ,
  consent_end_at TIMESTAMPTZ,
  raw_consent JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_bank_consents_aa_consent_id UNIQUE (aa_consent_id)
);

CREATE INDEX IF NOT EXISTS idx_bank_consents_factory_id ON bank_consents (factory_id);
CREATE INDEX IF NOT EXISTS idx_bank_consents_status ON bank_consents (status);

-- ---------------------------------------------------------------------------
-- Linked bank accounts (masked refs from AA)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bank_accounts (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER NOT NULL,
  bank_consent_id INTEGER,
  masked_account_number VARCHAR(32) NOT NULL,
  account_ref VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255),
  account_type VARCHAR(32),
  ifsc VARCHAR(16),
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_bank_accounts_factory_ref UNIQUE (factory_id, account_ref)
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_factory_id ON bank_accounts (factory_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_consent_id ON bank_accounts (bank_consent_id);

-- ---------------------------------------------------------------------------
-- Bank transactions (statement lines)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bank_transactions (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER NOT NULL,
  bank_account_id INTEGER NOT NULL,
  fetch_batch_id VARCHAR(64) NOT NULL,
  external_txn_id VARCHAR(255) NOT NULL,
  txn_date DATE NOT NULL,
  value_date DATE,
  amount NUMERIC(18, 2) NOT NULL,
  direction VARCHAR(8) NOT NULL,
  balance_after NUMERIC(18, 2),
  narration TEXT,
  counterparty_name VARCHAR(255),
  counterparty_raw JSONB,
  raw_payload JSONB,
  parsed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_bank_txn_account_external UNIQUE (bank_account_id, external_txn_id),
  CONSTRAINT chk_bank_txn_direction CHECK (direction IN ('CREDIT', 'DEBIT'))
);

CREATE INDEX IF NOT EXISTS idx_bank_txn_factory_date
  ON bank_transactions (factory_id, txn_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_txn_fetch_batch
  ON bank_transactions (fetch_batch_id);

-- ---------------------------------------------------------------------------
-- Ledger (minimal double-entry v0)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ledger_accounts (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER NOT NULL,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  account_type VARCHAR(32) NOT NULL,
  parent_id INTEGER,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_ledger_accounts_factory_code UNIQUE (factory_id, code),
  CONSTRAINT chk_ledger_account_type CHECK (
    account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')
  )
);

CREATE INDEX IF NOT EXISTS idx_ledger_accounts_factory_id ON ledger_accounts (factory_id);

CREATE TABLE IF NOT EXISTS journal_entries (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT,
  source_type VARCHAR(64) NOT NULL,
  source_ref VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  reversed_entry_id INTEGER,
  created_by_user_id INTEGER,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_journal_entry_status CHECK (
    status IN ('DRAFT', 'POSTED', 'REVERSED')
  )
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_factory_date
  ON journal_entries (factory_id, entry_date DESC);

CREATE TABLE IF NOT EXISTS journal_lines (
  id SERIAL PRIMARY KEY,
  journal_entry_id INTEGER NOT NULL,
  ledger_account_id INTEGER NOT NULL,
  debit_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  credit_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_journal_line_nonzero CHECK (
    debit_amount > 0 OR credit_amount > 0
  )
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry_id ON journal_lines (journal_entry_id);

-- ---------------------------------------------------------------------------
-- Match suggestions (bank txn ↔ vendor / invoice, owner confirm)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS match_suggestions (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER NOT NULL,
  bank_transaction_id INTEGER NOT NULL,
  vendor_id INTEGER,
  purchase_request_id INTEGER,
  journal_entry_id INTEGER,
  confidence_score NUMERIC(5, 4) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  match_reason TEXT,
  owner_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_match_suggestion_status CHECK (
    status IN ('PENDING', 'CONFIRMED', 'REJECTED', 'AUTO_POSTED')
  ),
  CONSTRAINT chk_match_confidence_range CHECK (
    confidence_score >= 0 AND confidence_score <= 1
  )
);

CREATE INDEX IF NOT EXISTS idx_match_suggestions_factory_status
  ON match_suggestions (factory_id, status);
CREATE INDEX IF NOT EXISTS idx_match_suggestions_bank_txn
  ON match_suggestions (bank_transaction_id);

-- ---------------------------------------------------------------------------
-- Domain events (outbox-lite for cross-engine integration)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS domain_events (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER,
  event_type VARCHAR(128) NOT NULL,
  aggregate_type VARCHAR(64) NOT NULL,
  aggregate_id VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_domain_event_status CHECK (
    status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')
  )
);

CREATE INDEX IF NOT EXISTS idx_domain_events_pending
  ON domain_events (status, scheduled_at)
  WHERE status = 'PENDING';

COMMIT;
