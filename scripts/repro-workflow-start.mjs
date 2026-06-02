import pg from 'pg';

const BASE = 'http://127.0.0.1:4001';
const ML = 'http://127.0.0.1:8000';
const PG = process.env.POSTGRES_CONNECTION_STRING ||
  'postgresql://munshi:munshi@65.1.128.181:5431/munshi_data';
const phone = process.argv[2] || '918604856137';
const phrase = process.argv[3] || 'mera business setup karna hai';

const c = new pg.Client({ connectionString: PG });
await c.connect();

await fetch(`${BASE}/webhook/test`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ from: phone, message: '/cancel' }),
});
await new Promise((r) => setTimeout(r, 500));

const ml = await fetch(`${ML}/classify?message=${encodeURIComponent(phrase)}`, {
  method: 'POST',
}).then((r) => r.json());

const wh = await fetch(`${BASE}/webhook/test`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ from: phone, message: phrase }),
}).then((r) => r.text());

await new Promise((r) => setTimeout(r, 1000));

const active = await c.query(
  `SELECT id, workflow_type, status, current_step FROM workflow_sessions
   WHERE phone_number = $1 AND status = 'ACTIVE'`,
  [phone],
);
const recent = await c.query(
  `SELECT id, workflow_type, status FROM workflow_sessions
   WHERE phone_number = $1 ORDER BY id DESC LIMIT 2`,
  [phone],
);

await c.end();

console.log(JSON.stringify({ phrase, ml, webhook: wh, active: active.rows, recent: recent.rows }, null, 2));
