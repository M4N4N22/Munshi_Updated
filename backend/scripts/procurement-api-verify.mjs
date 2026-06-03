/**
 * End-to-end procurement API verification for factory 3.
 */
const base = process.env.API_BASE ?? 'http://localhost:4001';
const F = Number(process.env.FACTORY_ID ?? 3);

async function call(method, path, body) {
  const start = performance.now();
  const res = await fetch(`${base}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const ms = Math.round(performance.now() - start);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return { method, path, status: res.status, ms, ok: res.ok, json, text };
}

const usersRes = await call('GET', `/factories/${F}/users`);
const users = usersRes.json ?? [];
const requester = users.find((u) => u.role === 'OWNER') ?? users[0];
const approver = users.find((u) => u.role === 'OWNER') ?? users[0];
const requestedBy = requester?.user_id ?? 18;
const performedBy = approver?.user_id ?? requestedBy;

const vendorsRes = await call('GET', `/vendors?factory_id=${F}`);
const vendorId = vendorsRes.json?.data?.[0]?.id ?? 1;

const steps = [];

steps.push(await call('GET', `/purchase-requests?factory_id=${F}`));

const createBody = {
  factory_id: F,
  requested_by: requestedBy,
  title: `Procurement verify ${Date.now()}`,
  description: 'Runtime validation sprint',
  items: [{ item_name: 'Verify cement', requested_quantity: '10', unit: 'bags' }],
  submit: true,
};
const created = await call('POST', '/purchase-requests', createBody);
steps.push(created);

const prId = created.json?.id ?? created.json?.data?.id;
if (!prId) {
  console.log(JSON.stringify({ error: 'Create did not return id', steps }, null, 2));
  process.exit(1);
}

steps.push(await call('GET', `/purchase-requests/${prId}?factory_id=${F}`));
steps.push(
  await call('PATCH', `/purchase-requests/${prId}`, {
    factory_id: F,
    performed_by: requestedBy,
    notes: 'Updated during verification',
  }),
);
steps.push(
  await call('POST', `/purchase-requests/${prId}/approve`, {
    factory_id: F,
    performed_by: performedBy,
    remarks: 'Approved in verification',
  }),
);
steps.push(
  await call('POST', `/purchase-requests/${prId}/assign-vendor`, {
    factory_id: F,
    performed_by: performedBy,
    vendor_id: vendorId,
  }),
);
steps.push(await call('GET', `/purchase-requests/${prId}/audit?factory_id=${F}`));
steps.push(
  await call('POST', `/purchase-requests/${prId}/close`, {
    factory_id: F,
    performed_by: performedBy,
  }),
);

const rejectDraft = await call('POST', '/purchase-requests', {
  factory_id: F,
  requested_by: requestedBy,
  title: `Reject verify ${Date.now()}`,
  items: [{ item_name: 'Reject item', requested_quantity: '1' }],
  submit: true,
});
const rejectId = rejectDraft.json?.id;
steps.push(rejectDraft);
if (rejectId) {
  steps.push(
    await call('POST', `/purchase-requests/${rejectId}/reject`, {
      factory_id: F,
      performed_by: performedBy,
      remarks: 'Rejected in verification',
    }),
  );
}

const summary = {
  base,
  factory_id: F,
  requested_by: requestedBy,
  performed_by: performedBy,
  vendor_id: vendorId,
  total: steps.length,
  passed: steps.filter((s) => s.ok).length,
  failed: steps.filter((s) => !s.ok).length,
  steps: steps.map(({ method, path, status, ms, ok }) => ({ method, path, status, ms, ok })),
};

console.log(JSON.stringify(summary, null, 2));
process.exit(summary.failed > 0 ? 1 : 0);
