#!/usr/bin/env node
/**
 * Startup migration gate — used by main.ts and docker-entrypoint.
 */
import { bootstrapMigrations } from './lib/migration-runner.mjs';

const autoMigrate = process.env.AUTO_MIGRATE !== '0';

try {
  const result = await bootstrapMigrations({ autoMigrate });
  if (result.action === 'migrated') {
    const applied = result.run.results.filter((r) => r.status === 'applied');
    if (applied.length) {
      console.log(
        `[migrate] Applied ${applied.length}: ${applied.map((r) => r.file).join(', ')}`,
      );
    }
  } else {
    console.log('[migrate] Database schema is up to date');
  }
} catch (error) {
  console.error('[migrate] FATAL:', error.message);
  if (error.run) {
    console.error(JSON.stringify(error.run, null, 2));
  }
  process.exit(1);
}
