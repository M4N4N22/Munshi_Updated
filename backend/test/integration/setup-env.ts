import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const i = trimmed.indexOf('=');
    const key = trimmed.slice(0, i).trim();
    const val = trimmed.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

const root = resolve(__dirname, '../..');
loadEnvFile(resolve(root, '.env.local'));
loadEnvFile(resolve(root, '.env'));

jest.setTimeout(120_000);
