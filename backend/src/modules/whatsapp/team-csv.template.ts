import { TEAM_CSV_PUBLIC_TEMPLATE_URL } from './team-csv.constants';

export const TEAM_TEMPLATE_FILENAME = 'munshi-team-template.csv';

function stripEnvValue(raw?: string): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return undefined;
  }
  const unquoted = trimmed.replace(/^["']|["']$/g, '').trim();
  return unquoted || undefined;
}

/**
 * Public HTTPS URL for the team CSV template (Vercel static file in web/public).
 */
export function getTeamCsvTemplateDownloadUrl(): string {
  const direct = stripEnvValue(process.env.MUNSHI_TEAM_CSV_TEMPLATE_URL);
  if (direct) {
    return direct.replace(/\/$/, '');
  }

  const webHost = stripEnvValue(process.env.MUNSHI_WEB_URL);
  if (webHost) {
    const root = webHost.replace(/\/$/, '');
    return root.includes('.csv')
      ? root
      : `${root}/team-import/munshi-team-template.csv`;
  }

  return TEAM_CSV_PUBLIC_TEMPLATE_URL;
}
