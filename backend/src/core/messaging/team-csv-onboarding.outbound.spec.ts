import { buildTeamCsvOnboardingCta } from './team-csv-onboarding.outbound';
import { TEAM_CSV_PUBLIC_TEMPLATE_URL } from 'src/modules/whatsapp/team-csv.constants';

describe('buildTeamCsvOnboardingCta', () => {
  const prev = process.env;

  beforeEach(() => {
    process.env = { ...prev };
    delete process.env.MUNSHI_TEAM_CSV_TEMPLATE_URL;
    delete process.env.MUNSHI_PUBLIC_BASE_URL;
    delete process.env.MUNSHI_PUBLIC_API_HOST;
  });

  afterAll(() => {
    process.env = prev;
  });

  it('returns CTA with munshi.app static template URL by default', () => {
    const msg = buildTeamCsvOnboardingCta();
    expect(msg.type).toBe('interactive_cta_url');
    if (msg.type !== 'interactive_cta_url') {
      return;
    }
    expect(msg.displayText).toBe('Template download');
    expect(msg.url).toBe(TEAM_CSV_PUBLIC_TEMPLATE_URL);
    expect(msg.url).not.toContain('localhost');
    expect(msg.body).toContain('Template download');
    expect(msg.body).not.toContain('```');
  });
});
