import { getTeamCsvTemplateDownloadUrl } from './team-csv.template';
import { TEAM_CSV_PUBLIC_TEMPLATE_URL } from './team-csv.constants';

describe('getTeamCsvTemplateDownloadUrl', () => {
  const prev = process.env;

  beforeEach(() => {
    process.env = { ...prev };
    delete process.env.MUNSHI_TEAM_CSV_TEMPLATE_URL;
    delete process.env.MUNSHI_WEB_URL;
  });

  afterAll(() => {
    process.env = prev;
  });

  it('defaults to Vercel static template (web/public)', () => {
    expect(getTeamCsvTemplateDownloadUrl()).toBe(TEAM_CSV_PUBLIC_TEMPLATE_URL);
    expect(getTeamCsvTemplateDownloadUrl()).toContain('munshi-dada.vercel.app');
    expect(getTeamCsvTemplateDownloadUrl()).not.toContain('localhost');
    expect(getTeamCsvTemplateDownloadUrl()).not.toContain('api.munshi');
  });

  it('honors MUNSHI_WEB_URL for preview deploys', () => {
    process.env.MUNSHI_WEB_URL = 'https://munshi-web.vercel.app';
    expect(getTeamCsvTemplateDownloadUrl()).toBe(
      'https://munshi-web.vercel.app/team-import/munshi-team-template.csv',
    );
  });
});
