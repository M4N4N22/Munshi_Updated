#!/usr/bin/env node
/**
 * Print migration status JSON.
 * Usage: yarn migrate:status
 */
import { getMigrationStatus } from './lib/migration-runner.mjs';

const status = await getMigrationStatus();
console.log(JSON.stringify(status, null, 2));
process.exit(status.up_to_date ? 0 : 2);
