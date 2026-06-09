import pg from 'pg';
import { webhookTestHeaders } from './lib/dev-request-headers.mjs';
const c = new pg.Client({ connectionString: 'postgresql://munshi:munshi@65.1.128.181:5431/munshi_data' });
await c.connect();
await fetch('http://127.0.0.1:4001/webhook/test', {
  method: 'POST',
  headers: webhookTestHeaders(),
  body: JSON.stringify({ from: '918604856137', message: '/cancel' }),
});
await new Promise(r => setTimeout(r, 500));
const w = await fetch('http://127.0.0.1:4001/webhook/test', {
  method: 'POST',
  headers: webhookTestHeaders(),
  body: JSON.stringify({ from: '918604856137', message: 'mera business setup karna hai' }),
});
console.log('webhook', await w.text());
const active = await c.query(`SELECT id, phone_number, workflow_type, status FROM workflow_sessions WHERE status='ACTIVE'`);
console.log('active', JSON.stringify(active.rows, null, 2));
const s = await c.query(
  `SELECT id, workflow_type, status, current_step, created_at FROM workflow_sessions WHERE phone_number='918604856137' ORDER BY id DESC LIMIT 5`,
);
console.log(JSON.stringify(s.rows, null, 2));
await c.end();
