import { webhookTestHeaders } from './lib/dev-request-headers.mjs';

const base = 'http://localhost:4001';
const F = 3;

async function call(method, path, body) {
  const hasBody = body != null;
  const start = performance.now();
  const headers =
    path === '/webhook/test' && hasBody
      ? webhookTestHeaders()
      : hasBody
        ? { 'Content-Type': 'application/json' }
        : {};
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: hasBody ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return {
    method,
    path,
    status: res.status,
    ms: Math.round(performance.now() - start),
    body: text.slice(0, 500),
  };
}

const results = [];

results.push(await call('GET', `/vendors?factory_id=${F}`));
results.push(await call('GET', `/vendors/search?factory_id=${F}&q=Runtime`));
results.push(
  await call('POST', '/vendors', {
    factory_id: F,
    name: 'Runtime Test Vendor',
    phone_number: '919876543210',
  }),
);
const vendorList = JSON.parse((await call('GET', `/vendors?factory_id=${F}`)).body);
const vendorId = vendorList?.data?.[0]?.id ?? vendorList?.[0]?.id;
if (vendorId) {
  results.push(await call('GET', `/vendors/${vendorId}?factory_id=${F}`));
}

results.push(await call('GET', `/inventory/categories?factory_id=${F}`));
results.push(
  await call('POST', '/inventory/categories', {
    factory_id: F,
    name: 'Runtime Cat',
    description: 'audit',
  }),
);
results.push(
  await call('POST', '/inventory/locations', {
    factory_id: F,
    name: 'Main Store',
    code: 'MS1',
  }),
);

const cats = JSON.parse((await call('GET', `/inventory/categories?factory_id=${F}`)).body);
const locs = JSON.parse((await call('GET', `/inventory/locations?factory_id=${F}`)).body);
const catId = cats?.[0]?.id;
const locId = locs?.[0]?.id;
if (catId && locId) {
  results.push(
    await call('POST', '/inventory/items', {
      factory_id: F,
      category_id: catId,
      location_id: locId,
      sku: 'RT-AUDIT-001',
      name: 'Audit Widget',
      unit: 'pcs',
      current_quantity: 10,
      reorder_threshold: 2,
    }),
  );
}

results.push(await call('GET', `/inventory/items?factory_id=${F}`));
results.push(await call('GET', `/inventory/items/low-stock?factory_id=${F}`));
results.push(await call('GET', `/inventory/transactions?factory_id=${F}`));
results.push(await call('GET', `/documents?factory_id=${F}`));
results.push(await call('GET', '/documents/registry/types'));
results.push(
  await call('POST', '/webhook/test', { from: '918604856137', message: '/help' }),
);

console.log(JSON.stringify(results, null, 2));
