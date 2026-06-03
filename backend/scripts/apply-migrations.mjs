#!/usr/bin/env node
/**
 * Apply pending SQL migrations in order.
 * Usage: yarn migrate
 * Env: POSTGRES_CONNECTION_STRING, DRY_RUN=1
 */
import {
  getMigrationStatus,
  runPendingMigrations,
} from './lib/migration-runner.mjs';

const before = await getMigrationStatus();
const run = await runPendingMigrations();
const after = await getMigrationStatus();

console.log(
  JSON.stringify(
    {
      before: {
        applied_count: before.applied_count,
        pending_count: before.pending_count,
        pending: before.pending,
      },
      run,
      after: {
        applied_count: after.applied_count,
        pending_count: after.pending_count,
        up_to_date: after.up_to_date,
      },
    },
    null,
    2,
  ),
);

process.exit(run.success ? 0 : 1);
