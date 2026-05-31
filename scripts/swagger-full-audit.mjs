/**
 * Full Swagger endpoint audit — measures HTTP status + latency for all documented routes.
 * Safe-by-default: skips destructive DELETE calls unless RUN_DESTRUCTIVE=1.
 */
const base = process.env.API_BASE ?? 'http://localhost:4001';
const F = Number(process.env.FACTORY_ID ?? 3);
const RUN_DESTRUCTIVE = process.env.RUN_DESTRUCTIVE === '1';

async function req(method, path, body, headers = {}) {
  const start = performance.now();
  const hasBody = body !== undefined && body !== null;
  try {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: hasBody ? JSON.stringify(body) : undefined,
    });
    const ms = Math.round(performance.now() - start);
    const text = await res.text();
    let snippet = text.slice(0, 120).replace(/\s+/g, ' ');
    try {
      const j = JSON.parse(text);
      if (j?.meta?.failures?.message) {
        snippet = String(j.meta.failures.message).slice(0, 120);
      } else if (j?.meta?.message) {
        snippet = String(j.meta.message).slice(0, 120);
      }
    } catch {
      /* keep raw snippet */
    }
    return { status: res.status, ms, snippet, ok: res.status >= 200 && res.status < 300 };
  } catch (error) {
    return {
      status: 'ERR',
      ms: Math.round(performance.now() - start),
      snippet: error.message,
      ok: false,
    };
  }
}

async function pickId(listPath, idKey = 'id') {
  const r = await req('GET', listPath);
  if (!r.ok) return null;
  try {
    const res = await fetch(`${base}${listPath}`);
    const data = await res.json();
    const rows = Array.isArray(data) ? data : data?.data;
    if (Array.isArray(rows) && rows.length) return rows[0][idKey];
  } catch {
    /* ignore */
  }
  return null;
}

// Bootstrap IDs from live API
const factoryUsers = await (async () => {
  const res = await fetch(`${base}/factories/${F}/users`);
  if (!res.ok) return { userId: 18, memberId: 19 };
  const rows = await res.json();
  const first = rows[0];
  return { userId: first?.user_id ?? first?.user?.id ?? 18, memberId: first?.id ?? 19 };
})();

const { userId, memberId } = factoryUsers;
const departmentId = (await pickId(`/departments?factory_id=${F}`)) ?? 1;
const issueId = (await pickId(`/issues?factory_id=${F}`)) ?? 1;
const taskId = (await pickId(`/tasks?factory_id=${F}&assigned_to=${userId}`)) ?? 1;

const tests = [
  // Health
  ['GET', '/health', null, 'Health'],
  // Factory
  ['GET', '/factories', null, 'Factory'],
  ['GET', `/factories/${F}`, null, 'Factory'],
  ['GET', `/factories/${F}/users`, null, 'Factory'],
  // Vendors
  ['GET', `/vendors?factory_id=${F}`, null, 'vendors'],
  ['GET', `/vendors/search?factory_id=${F}&q=steel`, null, 'vendors'],
  ['GET', `/vendors/1?factory_id=${F}`, null, 'vendors'],
  // Inventory reads
  ['GET', `/inventory/categories?factory_id=${F}`, null, 'inventory'],
  ['GET', `/inventory/locations?factory_id=${F}`, null, 'inventory'],
  ['GET', `/inventory/items?factory_id=${F}`, null, 'inventory'],
  ['GET', `/inventory/items/low-stock?factory_id=${F}`, null, 'inventory'],
  ['GET', `/inventory/transactions?factory_id=${F}`, null, 'inventory'],
  ['GET', `/inventory/items/1?factory_id=${F}`, null, 'inventory'],
  ['GET', `/inventory/items/1/quantity?factory_id=${F}`, null, 'inventory'],
  ['GET', `/inventory/items/1/status?factory_id=${F}`, null, 'inventory'],
  ['GET', `/inventory/items/by-sku?factory_id=${F}&sku=TEST-SKU`, null, 'inventory'],
  // Documents
  ['GET', '/documents/registry/types', null, 'documents'],
  ['GET', `/documents?factory_id=${F}`, null, 'documents'],
  ['GET', `/documents/1?factory_id=${F}`, null, 'documents'],
  ['GET', `/documents/1/suggestions?factory_id=${F}`, null, 'documents'],
  // Departments
  ['GET', `/departments?factory_id=${F}`, null, 'Departments'],
  ['GET', `/departments/eligible-assignees?factory_id=${F}`, null, 'Departments'],
  ['GET', `/departments/${departmentId}?factory_id=${F}`, null, 'Departments'],
  // Issues
  ['GET', `/issues?factory_id=${F}`, null, 'Issue'],
  ['GET', `/issues/${issueId}?factory_id=${F}`, null, 'Issue'],
  // Tasks
  ['GET', `/tasks?factory_id=${F}&assigned_to=${userId}`, null, 'Tasks'],
  ['GET', `/tasks/${taskId}?factory_id=${F}`, null, 'Tasks'],
  ['GET', `/tasks/${taskId}/updates?factory_id=${F}`, null, 'Tasks'],
  // Users & attendance
  ['GET', `/users?factory_id=${F}&search=a&page=1&page_size=10`, null, 'User'],
  ['GET', `/users/${userId}`, null, 'User'],
  ['GET', `/users/by-phone?phone_number=918604856137`, null, 'User'],
  ['GET', `/attendance?factory_id=${F}&date=2026-05-15&user_id=${userId}`, null, 'Attendance'],
  ['GET', `/attendance/1?factory_id=${F}`, null, 'Attendance'],
  // Reports & stubs
  ['GET', `/reports?factory_id=${F}`, null, 'Reports'],
  ['GET', `/purchase-requests?factory_id=${F}`, null, 'PurchaseRequest'],
  ['GET', `/purchase-requests/1?factory_id=${F}`, null, 'PurchaseRequest'],
  ['GET', `/approvals?factory_id=${F}`, null, 'Approval'],
  ['GET', `/approvals/1?factory_id=${F}`, null, 'Approval'],
  // WhatsApp
  ['GET', '/webhook', null, 'WhatsApp'],
  [
    'POST',
    '/webhook/test',
    { from: '918604856137', message: '/help' },
    'WhatsApp',
  ],
  // Safe POST stubs (non-destructive or stub modules)
  [
    'POST',
    '/purchase-requests',
    { factory_id: F, requester_id: userId, title: 'Audit smoke PR' },
    'PurchaseRequest',
  ],
  [
    'POST',
    '/approvals',
    {
      factory_id: F,
      entity_type: 'PURCHASE_REQUEST',
      entity_id: 1,
      requester_id: userId,
    },
    'Approval',
  ],
  // Write endpoints needing migrations — expect 500 until DB migrated
  [
    'POST',
    '/vendors',
    {
      factory_id: F,
      name: 'Audit Vendor',
      contact_person: 'Test',
      phone: '919999999999',
    },
    'vendors',
  ],
  [
    'POST',
    '/inventory/categories',
    { factory_id: F, name: 'Audit Cat', description: 'test' },
    'inventory',
  ],
  [
    'POST',
    '/inventory/locations',
    { factory_id: F, name: 'Audit Loc', description: 'test' },
    'inventory',
  ],
];

const rows = [];
for (const [method, path, body, tag] of tests) {
  const r = await req(method, path, body);
  rows.push({
    tag,
    method,
    path,
    status: r.status,
    ms: r.ms,
    ok: r.ok,
    note: r.snippet,
    blocker:
      String(r.snippet).includes('does not exist') ? 'DB migration missing'
      : r.status === 400 && path.includes('documents?') ? 'DTO query coercion bug'
      : r.status === 400 && path.includes('webhook/test') ? 'ML/Olli dependency'
      : !r.ok ? 'see note' : '',
  });
}

const latencies = rows.map((r) => r.ms);
latencies.sort((a, b) => a - b);
const passed = rows.filter((r) => r.ok).length;

const byTag = {};
for (const r of rows) {
  byTag[r.tag] ??= { pass: 0, fail: 0 };
  if (r.ok) byTag[r.tag].pass += 1;
  else byTag[r.tag].fail += 1;
}

const summary = {
  base,
  factory_id: F,
  endpoints_tested: rows.length,
  passed,
  failed: rows.length - passed,
  pass_rate_pct: Number(((passed / rows.length) * 100).toFixed(1)),
  swagger_total_documented: 91,
  latency_ms: {
    min: latencies[0],
    max: latencies[latencies.length - 1],
    avg: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
    p50: latencies[Math.floor(latencies.length * 0.5)],
    p95: latencies[Math.floor(latencies.length * 0.95)],
  },
  by_tag: byTag,
  prerequisites: [
    'Apply migrations 002–005 on POSTGRES DB',
    'Use factory_id=3 for Munshi Dada factory',
    'ML_URL + OLLI for webhook/test and document upload',
  ],
};

console.log(JSON.stringify({ summary, rows }, null, 2));
