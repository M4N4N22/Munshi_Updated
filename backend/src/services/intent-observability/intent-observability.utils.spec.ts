import {
  hashMessage,
  hashPhone,
  redactMessage,
  parseTelemetryBlock,
} from './intent-observability.utils';

describe('intent-observability.utils', () => {
  it('hashPhone is stable and not raw phone', () => {
    const h1 = hashPhone('918604856137');
    const h2 = hashPhone('918604856137');
    expect(h1).toBe(h2);
    expect(h1).not.toContain('918604856137');
    expect(h1).toHaveLength(64);
  });

  it('hashMessage normalizes whitespace', () => {
    expect(hashMessage('  Hello   World ')).toBe(hashMessage('hello world'));
  });

  it('redactMessage masks mentions and long digit runs', () => {
    const redacted = redactMessage('rahul ko @priya se 9876543210 call karo');
    expect(redacted).toContain('@***');
    expect(redacted).toContain('***');
    expect(redacted).not.toContain('9876543210');
  });

  it('parseTelemetryBlock reads nested _telemetry', () => {
    const parsed = parseTelemetryBlock({
      intent: '/assign',
      _telemetry: {
        classification_stage: 'operational',
        llm_invoked: false,
        latency_ms: 11,
      },
    });
    expect(parsed?.classification_stage).toBe('operational');
    expect(parsed?.llm_invoked).toBe(false);
    expect(parsed?.latency_ms).toBe(11);
  });
});
