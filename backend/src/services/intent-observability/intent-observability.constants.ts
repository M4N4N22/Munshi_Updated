export const INTENT_EVENT_SCHEMA_VERSION = '1.0';

export const INBOUND_PATH = {
  DIRECT_SLASH: 'direct_slash',
  WORKFLOW_SESSION: 'workflow_session',
  NL_TASK_INVENTORY: 'nl_task_inventory',
  ML_FALLBACK: 'ml_fallback',
  DISAMBIGUATION_PICK: 'disambiguation_pick',
  OWNER_HOME_TRIGGER: 'owner_home_trigger',
  INTERACTIVE: 'interactive',
  HELP: 'help',
  CANCEL: 'cancel',
  CSV_AWAITING: 'csv_awaiting',
  LOW_STOCK_CTA: 'low_stock_cta',
  WORKFLOW_START: 'workflow_start',
  UNHANDLED: 'unhandled',
} as const;

export type InboundPath = (typeof INBOUND_PATH)[keyof typeof INBOUND_PATH];

export const CLASSIFICATION_OUTCOME = {
  SUCCESS: 'success',
  ROLE_BLOCK: 'role_block',
  WORKFLOW_STARTED: 'workflow_started',
  WORKFLOW_FAILED: 'workflow_failed',
  HANDLER_ERROR: 'handler_error',
  GENERAL_CHAT_ROUTED: 'general_chat_routed',
  UNRECOGNIZED: 'unrecognized',
} as const;

export type ClassificationOutcome =
  (typeof CLASSIFICATION_OUTCOME)[keyof typeof CLASSIFICATION_OUTCOME];

export const RETRY_WINDOW_MS = 60_000;
export const RAPID_REPEAT_WINDOW_MS = 30_000;
export const SELF_CORRECT_WINDOW_MS = 120_000;

export const MISCLASS_REVIEW_THRESHOLD = 50;
