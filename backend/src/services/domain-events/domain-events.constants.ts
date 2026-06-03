export const DOMAIN_EVENT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

/** Well-known event types (extend as engines are wired). */
export const DOMAIN_EVENT_TYPE = {
  ONBOARDING_REGISTERED: 'onboarding.registered',
  BANK_CONSENT_ACTIVE: 'bank.consent.active',
  BANK_STATEMENT_FETCHED: 'bank.statement.fetched',
  MATCH_SUGGESTION_CREATED: 'match.suggestion.created',
  JOURNAL_ENTRY_POSTED: 'journal.entry.posted',
} as const;
