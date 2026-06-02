import pg from 'pg';

const BASE = 'http://127.0.0.1:4001';
const PG = 'postgresql://munshi:munshi@65.1.128.181:5431/munshi_data';

async function wh(from, message) {
  const r = await fetch(`${BASE}/webhook/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, message }),
  });
  return r.text();
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const c = new pg.Client({ connectionString: PG });
await c.connect();

await wh('917452897444', '/cancel');
await wh('919456157007', '/cancel');
await wait(400);

const assignMsg = 'Rahul Verma ko dispatch check ka task assign karo';
const ml = await fetch(
  `${'http://127.0.0.1:8000'}/classify?message=${encodeURIComponent(assignMsg)}`,
  { method: 'POST' },
).then((r) => r.json());
console.log('owner assign ML', ml.intent, assignMsg);

await wh('917452897444', assignMsg);
await wait(900);

const route = await c.query(
  `SELECT t.id, t.routing_status FROM tasks t
   JOIN users u ON u.id = t.assigned_to
   WHERE t.factory_id = 3 AND u.phone_number = '919456157007'
   ORDER BY t.id DESC LIMIT 1`,
);
console.log('route task', route.rows[0]);

const delegateMsg = 'Rahul Kumar ko loading ka kaam do';
const ml2 = await fetch(
  `http://127.0.0.1:8000/classify?message=${encodeURIComponent(delegateMsg)}`,
  { method: 'POST' },
).then((r) => r.json());
console.log('manager delegate ML', ml2.intent);

const w = await wh('919456157007', delegateMsg);
await wait(800);

if (route.rows[0]) {
  const task = await c.query(
    'SELECT id, routing_status, assigned_to FROM tasks WHERE id = $1',
    [route.rows[0].id],
  );
  const worker = await c.query('SELECT name FROM users WHERE id = $1', [
    task.rows[0]?.assigned_to,
  ]);
  console.log('after delegate', w, task.rows[0], worker.rows[0]);
}

await c.end();
