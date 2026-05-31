/**
 * Apply SQL migrations 001-005 in order (idempotent scripts).
 * Records applied files in schema_migrations for audit trail.
 */
import pg from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const envPath = resolve(root, '.env.local');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')];
    }),
);

const cs = process.env.POSTGRES_CONNECTION_STRING ?? env.POSTGRES_CONNECTION_STRING;
const dryRun = process.env.DRY_RUN === '1';

const client = new pg.Client({ connectionString: cs });
await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

const migDir = resolve(root, 'migrations');
const files = readdirSync(migDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const results = [];

for (const file of files) {
  const applied = await client.query(
    'SELECT 1 FROM schema_migrations WHERE filename = $1',
    [file],
  );
  if (applied.rowCount > 0) {
    results.push({ file, status: 'already_applied' });
    continue;
  }

  const sql = readFileSync(resolve(migDir, file), 'utf8');
  if (dryRun) {
    results.push({ file, status: 'dry_run_skip' });
    continue;
  }

  try {
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [file],
    );
    results.push({ file, status: 'applied' });
  } catch (error) {
    results.push({ file, status: 'failed', error: error.message });
    break;
  }
}

await client.end();
console.log(JSON.stringify({ connection: cs.replace(/:[^:@/]+@/, ':***@'), results }, null, 2));
