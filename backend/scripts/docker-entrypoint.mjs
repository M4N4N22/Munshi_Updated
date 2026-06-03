#!/usr/bin/env node
/**
 * Production container entrypoint:
 * 1. Apply pending migrations (AUTO_MIGRATE defaults on)
 * 2. Start NestJS application
 */
import { spawn, spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const bootstrap = join(process.cwd(), 'scripts', 'migration-bootstrap.mjs');
if (!existsSync(bootstrap)) {
  console.error('[migrate] FATAL: migration-bootstrap.mjs not found');
  process.exit(1);
}

const migrate = spawnSync(process.execPath, [bootstrap], {
  stdio: 'inherit',
  env: process.env,
  cwd: process.cwd(),
});

if (migrate.status !== 0) {
  process.exit(migrate.status ?? 1);
}

const child = spawn(process.execPath, ['dist/main.js'], {
  stdio: 'inherit',
  env: { ...process.env, SKIP_MIGRATION_BOOTSTRAP: '1' },
});

child.on('exit', (code) => process.exit(code ?? 1));
