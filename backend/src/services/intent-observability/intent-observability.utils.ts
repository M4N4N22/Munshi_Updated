import { createHash } from 'crypto';

const PHONE_HASH_SALT =
  process.env.INTENT_OBSERVABILITY_PHONE_SALT?.trim() ||
  process.env.OTP_PEPPER?.trim() ||
  'munshi-intent-observability';

/** SHA-256 hex digest — never store raw phone numbers. */
export function hashPhone(phone: string): string {
  const normalized = phone.replace(/\D/g, '');
  return createHash('sha256')
    .update(`${PHONE_HASH_SALT}:${normalized}`)
    .digest('hex');
}

/** SHA-256 hex digest of normalized message text. */
export function hashMessage(message: string): string {
  const normalized = message.trim().replace(/\s+/g, ' ').toLowerCase();
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Redact @mentions and digit sequences (phone-like) from message preview.
 * Full text is never stored by default.
 */
export function redactMessage(message: string): string {
  let text = message.trim().replace(/\s+/g, ' ');
  text = text.replace(/@[^\s]+/g, '@***');
  text = text.replace(/\b\d{6,}\b/g, '***');
  if (text.length > 200) {
    return `${text.slice(0, 197)}...`;
  }
  return text;
}

export function parseTelemetryBlock(data: unknown): {
  classification_stage?: string;
  llm_invoked?: boolean;
  llm_raw_intent?: string;
  latency_ms?: number;
  post_rule_applied?: string[];
} | null {
  if (data == null || typeof data !== 'object') return null;
  const root = data as Record<string, unknown>;
  const payload =
    root._telemetry != null && typeof root._telemetry === 'object'
      ? (root._telemetry as Record<string, unknown>)
      : root.data != null &&
          typeof root.data === 'object' &&
          (root.data as Record<string, unknown>)._telemetry != null
        ? ((root.data as Record<string, unknown>)._telemetry as Record<
            string,
            unknown
          >)
        : null;
  if (!payload) return null;
  return {
    classification_stage:
      typeof payload.classification_stage === 'string'
        ? payload.classification_stage
        : undefined,
    llm_invoked:
      typeof payload.llm_invoked === 'boolean' ? payload.llm_invoked : undefined,
    llm_raw_intent:
      typeof payload.llm_raw_intent === 'string'
        ? payload.llm_raw_intent
        : undefined,
    latency_ms:
      typeof payload.latency_ms === 'number' ? payload.latency_ms : undefined,
    post_rule_applied: Array.isArray(payload.post_rule_applied)
      ? payload.post_rule_applied.filter((x) => typeof x === 'string')
      : undefined,
  };
}
