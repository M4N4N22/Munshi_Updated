import { MUNSHI_PUBLIC_WEB_ORIGIN } from 'src/core/config/munshi-public-urls.constants';

/** Canonical CSV headers for WhatsApp bulk employee import. */
export const TEAM_CSV_HEADERS = [
  'name',
  'phone',
  'role',
  'department',
  'doj',
] as const;

export const TEAM_CSV_TEMPLATE_SAMPLE = `name,phone,role,department,doj
Ram Kumar,919876543210,WORKER,production,
Priya Sharma,919876543211,MANAGER,sales,2026-01-15`;

export const TEAM_CSV_MAX_ROWS = 200;
export const TEAM_CSV_MAX_BYTES = 2 * 1024 * 1024;
export const TEAM_CSV_PENDING_TTL_MS = 30 * 60 * 1000;

/** Static file in `web/public` — served from the Vercel web deploy. */
export const TEAM_CSV_PUBLIC_TEMPLATE_PATH =
  '/team-import/munshi-team-template.csv';

/** Default production web host (override with MUNSHI_WEB_URL or MUNSHI_TEAM_CSV_TEMPLATE_URL). */
export const TEAM_CSV_DEFAULT_WEB_HOST = MUNSHI_PUBLIC_WEB_ORIGIN;

export const TEAM_CSV_PUBLIC_TEMPLATE_URL = `${TEAM_CSV_DEFAULT_WEB_HOST}${TEAM_CSV_PUBLIC_TEMPLATE_PATH}`;
