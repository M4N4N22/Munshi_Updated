/**
 * Shared SQL migration runner for Munshi.
 * Single source of truth for apply-migrations, startup bootstrap, and health checks.
 */
import pg from 'pg';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const migDir = resolve(root, 'migrations');

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split('\n')
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')];
      }),
  );
}

export function loadConnectionString() {
  if (process.env.POSTGRES_CONNECTION_STRING) {
    return process.env.POSTGRES_CONNECTION_STRING;
  }
  const envLocal = parseEnvFile(resolve(root, '.env.local'));
  if (envLocal.POSTGRES_CONNECTION_STRING) {
    return envLocal.POSTGRES_CONNECTION_STRING;
  }
  const envFile = parseEnvFile(resolve(root, '.env'));
  if (envFile.POSTGRES_CONNECTION_STRING) {
    return envFile.POSTGRES_CONNECTION_STRING;
  }
  throw new Error(
    'POSTGRES_CONNECTION_STRING is not set (env var, .env.local, or .env)',
  );
}

export function listMigrationFiles() {
  if (!existsSync(migDir)) return [];
  return readdirSync(migDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

export async function ensureSchemaMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function getAppliedFilenames(client) {
  await ensureSchemaMigrationsTable(client);
  const result = await client.query(
    'SELECT filename, applied_at FROM schema_migrations ORDER BY filename ASC',
  );
  return result.rows;
}

export async function getMigrationStatus(connectionString = loadConnectionString()) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const files = listMigrationFiles();
    const appliedRows = await getAppliedFilenames(client);
    const appliedSet = new Set(appliedRows.map((r) => r.filename));
    const applied = files.filter((f) => appliedSet.has(f));
    const pending = files.filter((f) => !appliedSet.has(f));
    return {
      connection: connectionString.replace(/:[^:@/]+@/, ':***@'),
      migration_dir: migDir,
      total_files: files.length,
      applied_count: applied.length,
      pending_count: pending.length,
      latest_file: files[files.length - 1] ?? null,
      latest_applied: applied[applied.length - 1] ?? null,
      applied,
      pending,
      applied_details: appliedRows,
      up_to_date: pending.length === 0,
    };
  } finally {
    await client.end();
  }
}

export async function runPendingMigrations(options = {}) {
  const {
    connectionString = loadConnectionString(),
    dryRun = process.env.DRY_RUN === '1',
    stopOnError = true,
  } = options;

  const client = new pg.Client({ connectionString });
  await client.connect();

  const results = [];
  let success = true;

  try {
    await ensureSchemaMigrationsTable(client);
    const files = listMigrationFiles();

    for (const file of files) {
      const applied = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [file],
      );
      if (applied.rowCount > 0) {
        results.push({ file, status: 'already_applied' });
        continue;
      }

      if (dryRun) {
        results.push({ file, status: 'dry_run_skip' });
        continue;
      }

      const sql = readFileSync(resolve(migDir, file), 'utf8');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file],
        );
        results.push({ file, status: 'applied' });
      } catch (error) {
        results.push({ file, status: 'failed', error: error.message });
        success = false;
        if (stopOnError) break;
      }
    }
  } finally {
    await client.end();
  }

  return {
    connection: connectionString.replace(/:[^:@/]+@/, ':***@'),
    dry_run: dryRun,
    success,
    results,
  };
}

export async function bootstrapMigrations(options = {}) {
  const autoMigrate = options.autoMigrate ?? process.env.AUTO_MIGRATE !== '0';
  const status = await getMigrationStatus(options.connectionString);

  if (status.up_to_date) {
    return { action: 'none', status };
  }

  if (!autoMigrate) {
    const error = new Error(
      `Database schema is outdated. Pending migrations (${status.pending_count}): ${status.pending.join(', ')}. ` +
        'Run `yarn migrate` or set AUTO_MIGRATE=1 to apply automatically at startup.',
    );
    error.pending = status.pending;
    error.status = status;
    throw error;
  }

  const run = await runPendingMigrations(options);
  if (!run.success) {
    const error = new Error('Automatic migration failed');
    error.run = run;
    throw error;
  }

  const after = await getMigrationStatus(options.connectionString);
  return { action: 'migrated', before: status, run, status: after };
}
