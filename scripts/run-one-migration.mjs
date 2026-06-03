/**
 * Run a single migration file. Usage: node scripts/run-one-migration.mjs 007_p0_finance_foundation.sql
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(path.join(root, '.env'));

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/run-one-migration.mjs <filename.sql>');
  process.exit(1);
}

const connectionString = process.env.POSTGRES_CONNECTION_STRING;
const useSsl =
  connectionString.includes('supabase.com') ||
  connectionString.includes('sslmode=require');
const pgConnectionString = connectionString
  .replace(/([?&])sslmode=[^&]*/g, (_, sep) => (sep === '?' ? '?' : ''))
  .replace(/\?&/, '?')
  .replace(/\?$/, '');

const sql = fs.readFileSync(path.join(root, 'migrations', file), 'utf8');
const client = new pg.Client({
  connectionString: pgConnectionString,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

await client.connect();
try {
  await client.query(sql);
  console.log(`OK: ${file}`);
} finally {
  await client.end();
}
