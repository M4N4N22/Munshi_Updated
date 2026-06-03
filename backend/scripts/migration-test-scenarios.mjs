#!/usr/bin/env node
/**
 * Migration system test scenarios (requires Postgres).
 * Usage: POSTGRES_CONNECTION_STRING=... node scripts/migration-test-scenarios.mjs
 */
import pg from 'pg';
import {
  bootstrapMigrations,
  getMigrationStatus,
  listMigrationFiles,
  loadConnectionString,
  runPendingMigrations,
} from './lib/migration-runner.mjs';

const cs = loadConnectionString();
const scenarios = [];

async function withClient(fn) {
  const client = new pg.Client({ connectionString: cs });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function resetTracking(fromFile = null) {
  await withClient(async (client) => {
    if (fromFile) {
      await client.query('DELETE FROM schema_migrations WHERE filename >= $1', [
        fromFile,
      ]);
    } else {
      await client.query('DROP TABLE IF EXISTS schema_migrations CASCADE');
    }
  });
}

// Scenario 1: current DB should report up_to_date after bootstrap
{
  const status = await getMigrationStatus();
  scenarios.push({
    name: 'current_database',
    up_to_date: status.up_to_date,
    pending_count: status.pending_count,
    pass: status.up_to_date,
  });
}

// Scenario 2: simulate pending tail migration (006 removed from tracking only)
{
  const files = listMigrationFiles();
  const tail = files[files.length - 1];
  await resetTracking(tail);
  let pendingDetected = false;
  let autoApplied = false;
  try {
    const before = await getMigrationStatus();
    pendingDetected = before.pending.includes(tail);
    await bootstrapMigrations({ autoMigrate: true });
    const after = await getMigrationStatus();
    autoApplied = after.up_to_date;
  } finally {
    // ensure tail is applied again
    await runPendingMigrations();
  }
  scenarios.push({
    name: 'pending_tail_auto_migrate',
    tail,
    pending_detected: pendingDetected,
    auto_applied: autoApplied,
    pass: pendingDetected && autoApplied,
  });
}

// Scenario 3: strict mode refuses when pending (AUTO_MIGRATE off)
{
  const files = listMigrationFiles();
  const tail = files[files.length - 1];
  await resetTracking(tail);
  let refused = false;
  try {
    await bootstrapMigrations({ autoMigrate: false });
  } catch (error) {
    refused = Boolean(error.pending?.includes(tail));
  } finally {
    await runPendingMigrations();
  }
  scenarios.push({
    name: 'auto_migrate_disabled_refuses',
    tail,
    refused,
    pass: refused,
  });
}

const passed = scenarios.filter((s) => s.pass).length;
console.log(
  JSON.stringify(
    {
      connection: cs.replace(/:[^:@/]+@/, ':***@'),
      scenarios,
      passed,
      failed: scenarios.length - passed,
    },
    null,
    2,
  ),
);
process.exit(passed === scenarios.length ? 0 : 1);
