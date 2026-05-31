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
if (!cs) {
  console.error('No POSTGRES_CONNECTION_STRING');
  process.exit(1);
}

const expected = [
  'vendors',
  'inventory_categories',
  'inventory_locations',
  'inventory_items',
  'inventory_transactions',
  'workflow_sessions',
  'documents',
  'document_processing_jobs',
  'document_extractions',
  'document_suggestions',
  'purchase_requests',
  'approval_requests',
  'factories',
  'users',
  'departments',
  'issues',
  'tasks',
  'attendance',
  'factory_users',
];

const client = new pg.Client({ connectionString: cs });
await client.connect();

const tables = await client.query(
  "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
);
const names = tables.rows.map((r) => r.tablename);

const report = {
  connection: cs.replace(/:[^:@/]+@/, ':***@'),
  table_count: names.length,
  all_tables: names,
  expected: {},
  vendor_columns: null,
  inventory_items_columns: null,
};

for (const t of expected) {
  report.expected[t] = names.includes(t) ? 'EXISTS' : 'MISSING';
}

if (names.includes('vendors')) {
  const cols = await client.query(
    "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='vendors' ORDER BY ordinal_position",
  );
  report.vendor_columns = cols.rows;
}

if (names.includes('inventory_items')) {
  const cols = await client.query(
    "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_items' ORDER BY ordinal_position",
  );
  report.inventory_items_columns = cols.rows;
}

// Check migration tracking table
const migTable = names.includes('schema_migrations') || names.includes('migrations');
report.migration_tracking_table = migTable ? 'EXISTS' : 'NONE';

await client.end();
console.log(JSON.stringify(report, null, 2));
