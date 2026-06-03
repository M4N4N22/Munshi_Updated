import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env.local');
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
const client = new pg.Client({ connectionString: cs });
await client.connect();

const tables = ['purchase_requests', 'purchase_request_items', 'purchase_request_audit'];
const report = { tables: {}, sample: null };

for (const t of tables) {
  const ex = await client.query(
    "SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=$1) AS exists",
    [t],
  );
  report.tables[t] = { exists: ex.rows[0].exists, columns: [] };
  if (ex.rows[0].exists) {
    const cols = await client.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",
      [t],
    );
    report.tables[t].columns = cols.rows;
  }
}

if (report.tables.purchase_requests?.exists) {
  const sample = await client.query(
    'SELECT id, factory_id, requested_by, status, request_number, priority FROM purchase_requests WHERE factory_id=3 LIMIT 3',
  );
  report.sample = sample.rows;
}

await client.end();
console.log(JSON.stringify(report, null, 2));
