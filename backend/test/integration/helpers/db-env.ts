import { execSync } from 'child_process';
import { resolve } from 'path';
import { Client } from 'pg';

const root = resolve(__dirname, '../../..');

export async function probePostgres(): Promise<boolean> {
  const conn =
    process.env.POSTGRES_CONNECTION_STRING ||
    process.env.INTEGRATION_POSTGRES_URL;
  if (!conn) return false;
  const client = new Client({ connectionString: conn });
  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    return true;
  } catch {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
    return false;
  }
}

export function runMigrations(): void {
  execSync('node scripts/apply-migrations.mjs', {
    cwd: root,
    stdio: 'pipe',
    env: process.env,
  });
}

export function migrationStatusJson(): {
  pending_count: number;
  up_to_date?: boolean;
} {
  try {
    const out = execSync('node scripts/migration-status.mjs', {
      cwd: root,
      stdio: 'pipe',
      env: process.env,
    }).toString();
    return JSON.parse(out) as { pending_count: number; up_to_date?: boolean };
  } catch (err: unknown) {
    const stdout = (err as { stdout?: Buffer })?.stdout?.toString();
    if (stdout) {
      try {
        return JSON.parse(stdout) as {
          pending_count: number;
          up_to_date?: boolean;
        };
      } catch {
        /* fall through */
      }
    }
    return { pending_count: -1 };
  }
}
