const base = process.env.API_BASE ?? 'http://localhost:4001';
const F = Number(process.env.FACTORY_ID ?? 3);

async function factoryMemberUserId() {
  try {
    const res = await fetch(`${base}/factories/${F}/users`);
    if (!res.ok) return 18;
    const rows = await res.json();
    return rows[0]?.user_id ?? 18;
  } catch {
    return 18;
  }
}

const requestedBy = await factoryMemberUserId();

const tests = [
  ['GET', '/health'],
  ['GET', '/factories'],
  ['GET', `/factories/${F}`],
  ['GET', `/factories/${F}/users`],
  ['GET', `/vendors?factory_id=${F}`],
  ['GET', `/vendors/search?factory_id=${F}&q=test`],
  ['GET', `/inventory/categories?factory_id=${F}`],
  ['GET', `/inventory/locations?factory_id=${F}`],
  ['GET', `/inventory/items?factory_id=${F}`],
  ['GET', `/inventory/items/low-stock?factory_id=${F}`],
  ['GET', `/inventory/transactions?factory_id=${F}`],
  ['GET', '/documents/registry/types'],
  ['GET', `/documents?factory_id=${F}`],
  ['GET', `/departments?factory_id=${F}`],
  ['GET', `/issues?factory_id=${F}&is_resolved=false`],
  ['GET', `/tasks?factory_id=${F}&assigned_to=1&is_completed=false`],
  ['GET', `/reports?factory_id=${F}`],
  ['GET', `/purchase-requests?factory_id=${F}`],
  ['GET', `/approvals?factory_id=${F}`],
  ['GET', '/users?factory_id=1&search=a&page=1&page_size=10'],
  ['GET', '/attendance?factory_id=1&date=2026-05-31&user_id=1'],
  [
    'POST',
    '/purchase-requests',
    {
      factory_id: F,
      requested_by: requestedBy,
      title: 'Smoke PR',
      items: [{ item_name: 'Smoke test item', requested_quantity: '1', unit: 'pcs' }],
    },
  ],
  ['POST', '/approvals', { factory_id: F, entity_type: 'PURCHASE_REQUEST', entity_id: 1, requester_id: requestedBy }],
];

const rows = [];
for (const [method, path, body] of tests) {
  const start = performance.now();
  try {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const ms = Math.round(performance.now() - start);
    const text = await res.text();
    rows.push({
      method,
      path,
      status: res.status,
      ms,
      ok: res.status >= 200 && res.status < 300,
      note: text.slice(0, 60).replace(/\s+/g, ' '),
    });
  } catch (error) {
    rows.push({
      method,
      path,
      status: 'ERR',
      ms: Math.round(performance.now() - start),
      ok: false,
      note: error.message,
    });
  }
}

const passed = rows.filter((r) => r.ok).length;
const latencies = rows.filter((r) => typeof r.ms === 'number').map((r) => r.ms);
const summary = {
  base,
  factory_id: F,
  requested_by: requestedBy,
  total: rows.length,
  passed,
  failed: rows.length - passed,
  pass_rate: Number((passed / rows.length).toFixed(3)),
  latency_ms: {
    min: Math.min(...latencies),
    max: Math.max(...latencies),
    avg: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
    p95: latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)],
  },
};

console.log(JSON.stringify({ summary, rows }, null, 2));
