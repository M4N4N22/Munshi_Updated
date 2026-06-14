import { CLASSIFICATION_OUTCOME, INBOUND_PATH } from './intent-observability.constants';
import { computeMisclassScore } from './intent-observability.scoring';
import { createObservabilitySession } from './intent-observability.session';
import type { IntentClassificationEvent } from './intent-classification-event.schema';

describe('computeMisclassScore', () => {
  const baseSession = () =>
    createObservabilitySession({
      phone: '918604856137',
      message: 'prateek ko kaam do',
      inboundPath: INBOUND_PATH.ML_FALLBACK,
    });

  it('scores S1 general_chat retry success', () => {
    const session = baseSession();
    session.outcome = CLASSIFICATION_OUTCOME.SUCCESS;
    session.startedAt = new Date('2026-06-11T12:01:00Z');
    const prior = {
      outcome: CLASSIFICATION_OUTCOME.GENERAL_CHAT_ROUTED,
      created_at: new Date('2026-06-11T12:00:30Z'),
      raw_hash: 'other',
      inbound_path: 'ml_fallback',
      event_id: 'prior-uuid',
    } as IntentClassificationEvent;
    expect(computeMisclassScore(session, prior)).toBeGreaterThanOrEqual(40);
  });

  it('scores S2 role block on mgr intent', () => {
    const session = baseSession();
    session.roleBlock = true;
    session.predictedIntent = '/mgrassign';
    expect(computeMisclassScore(session, null)).toBe(30);
  });

  it('caps score at 100', () => {
    const session = baseSession();
    session.roleBlock = true;
    session.predictedIntent = '/mgrassign';
    session.outcome = CLASSIFICATION_OUTCOME.HANDLER_ERROR;
    session.workerSlug = null;
    session.startedAt = new Date('2026-06-11T12:01:00Z');
    const prior = {
      outcome: CLASSIFICATION_OUTCOME.GENERAL_CHAT_ROUTED,
      created_at: new Date('2026-06-11T12:00:30Z'),
      raw_hash: session.rawHash,
      inbound_path: 'ml_fallback',
      event_id: 'prior',
    } as IntentClassificationEvent;
    expect(computeMisclassScore(session, prior)).toBeLessThanOrEqual(100);
  });
});
