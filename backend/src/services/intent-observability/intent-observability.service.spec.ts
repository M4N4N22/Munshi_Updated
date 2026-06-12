import { IntentObservabilityRepository } from './intent-observability.repository';
import { IntentObservabilityService } from './intent-observability.service';
import {
  CLASSIFICATION_OUTCOME,
  INBOUND_PATH,
} from './intent-observability.constants';

describe('IntentObservabilityService', () => {
  let service: IntentObservabilityService;
  let repository: jest.Mocked<IntentObservabilityRepository>;

  beforeEach(() => {
    repository = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      findPriorWithinWindow: jest.fn().mockResolvedValue(null),
      countEvents: jest.fn().mockResolvedValue(10),
      countFlag: jest.fn().mockImplementation(async (field) => {
        if (field === 'is_general_chat') return 2;
        if (field === 'llm_invoked') return 1;
        if (field === 'retry_within_60s') return 1;
        if (field === 'role_block') return 1;
        if (field === 'workflow_started') return 4;
        return 0;
      }),
      countMlFallback: jest.fn().mockResolvedValue(5),
      countWorkflowFailed: jest.fn().mockResolvedValue(1),
      countByOutcome: jest.fn(),
      findRecentByPhoneHash: jest.fn(),
      listReviewQueue: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
      markReviewed: jest.fn(),
      retryWindowMs: jest.fn().mockReturnValue(60_000),
    } as unknown as jest.Mocked<IntentObservabilityRepository>;

    service = new IntentObservabilityService(repository);
  });

  it('persists session with retry linkage', async () => {
    repository.findPriorWithinWindow.mockResolvedValue({
      event_id: 'prior-event',
      created_at: new Date(),
    } as any);

    const session = service.createSession({
      phone: '918604856137',
      message: 'hello',
      inboundPath: INBOUND_PATH.ML_FALLBACK,
    });
    session.outcome = CLASSIFICATION_OUTCOME.SUCCESS;

    await (service as any).persistSessionAsync(session);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        retry_within_60s: true,
        retry_of_event_id: 'prior-event',
        phone_hash: expect.any(String),
        raw_redacted: expect.any(String),
      }),
    );
  });

  it('computes KPI rates', async () => {
    const rates = await service.getKpiRates({ factory_id: 3 });
    expect(rates.total_events).toBe(10);
    expect(rates.general_chat_rate).toBeCloseTo(0.2);
    expect(rates.llm_usage_rate).toBeCloseTo(0.2);
    expect(rates.retry_rate).toBeCloseTo(0.1);
    expect(rates.role_block_rate).toBeCloseTo(0.1);
    expect(rates.workflow_failure_rate).toBeCloseTo(0.25);
  });
});
