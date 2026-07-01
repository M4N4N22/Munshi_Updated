import {
  CLASSIFICATION_OUTCOME,
  RAPID_REPEAT_WINDOW_MS,
  SELF_CORRECT_WINDOW_MS,
} from './intent-observability.constants';
import type { IntentClassificationEvent } from './intent-classification-event.schema';
import type { IntentObservabilitySession } from './intent-observability.session';

const MGR_INTENTS = new Set([
  '/mgrassign',
  '/mgrtransfer',
  '/mgrreject',
  '/mgrself',
]);

/**
 * Composite misclass_score (0–100) per doc 78.
 * S1:40 + S2:30 + S3:25 + S6:15 + S5:10 + S10:10 (capped).
 */
export function computeMisclassScore(
  session: IntentObservabilitySession,
  prior: IntentClassificationEvent | null,
): number {
  let score = 0;

  if (prior) {
    const deltaMs =
      session.startedAt.getTime() - new Date(prior.created_at!).getTime();

    // S1: general_chat → retry success within 60s
    if (
      deltaMs <= 60_000 &&
      prior.outcome === CLASSIFICATION_OUTCOME.GENERAL_CHAT_ROUTED &&
      session.outcome === CLASSIFICATION_OUTCOME.SUCCESS &&
      !session.isGeneralChat
    ) {
      score += 40;
    }

    // S5: same raw_hash within 30s
    if (deltaMs <= RAPID_REPEAT_WINDOW_MS && prior.raw_hash === session.rawHash) {
      score += 10;
    }

    // S6: slash after ml_fallback within 120s
    if (
      deltaMs <= SELF_CORRECT_WINDOW_MS &&
      prior.inbound_path === 'ml_fallback' &&
      session.inboundPath === 'direct_slash' &&
      session.outcome === CLASSIFICATION_OUTCOME.SUCCESS
    ) {
      score += 15;
    }
  }

  // S2: role_block on mgr-family intent
  if (
    session.roleBlock &&
    session.predictedIntent &&
    MGR_INTENTS.has(session.predictedIntent.toLowerCase())
  ) {
    score += 30;
  }

  // S3: handler_error
  if (session.outcome === CLASSIFICATION_OUTCOME.HANDLER_ERROR) {
    score += 25;
  }

  // S10: assign without worker_slug
  const intent = (session.predictedIntent || session.commandExecuted || '').toLowerCase();
  if (intent === '/assign' && !session.workerSlug) {
    score += 10;
  }

  return Math.min(score, 100);
}
