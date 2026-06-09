import { config } from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
config({ path: resolve(backendRoot, '.env') });

/** Headers for POST /webhook/test (requires x-secret per InternalCallGuard). */
export function webhookTestHeaders() {
  const secret = process.env.X_SECRET?.trim();
  const headers = { 'Content-Type': 'application/json' };
  if (secret) {
    headers['x-secret'] = secret;
  }
  return headers;
}
