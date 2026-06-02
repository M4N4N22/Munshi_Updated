import {
  ALL_DEMO_PHRASES,
  DEMO_PHRASE,
  isDemoModeEnabled,
  normalizeDemoPhrase,
  resolveDemoPhraseKey,
} from './demo-mode.constants';

describe('DemoMode constants', () => {
  it('normalizes phrases', () => {
    expect(normalizeDemoPhrase('  Steel Sheets   Ka Stock  ')).toBe(
      'steel sheets ka stock',
    );
    expect(normalizeDemoPhrase('Steel sheets ka stock kitna bacha hai?')).toBe(
      DEMO_PHRASE.INVENTORY,
    );
  });

  it('resolves inventory NL aliases', () => {
    expect(resolveDemoPhraseKey(DEMO_PHRASE.INVENTORY)).toBe(
      DEMO_PHRASE.INVENTORY,
    );
    expect(
      resolveDemoPhraseKey('Steel sheets ka stock kitna bacha hai ?'),
    ).toBe(DEMO_PHRASE.INVENTORY);
    expect(resolveDemoPhraseKey('steel sheets ka order')).toBe(
      DEMO_PHRASE.PR_TITLE,
    );
    expect(resolveDemoPhraseKey('steel sheets')).toBe(DEMO_PHRASE.PR_ITEM);
  });

  it('registers all certified phrases', () => {
    expect(ALL_DEMO_PHRASES.has(DEMO_PHRASE.INVENTORY)).toBe(true);
    expect(ALL_DEMO_PHRASES.has(DEMO_PHRASE.PR_START)).toBe(true);
    expect(ALL_DEMO_PHRASES.size).toBeGreaterThanOrEqual(12);
  });

  it('is disabled by default in test env', () => {
    const prev = process.env.DEMO_MODE;
    delete process.env.DEMO_MODE;
    expect(isDemoModeEnabled()).toBe(false);
    process.env.DEMO_MODE = prev;
  });
});
