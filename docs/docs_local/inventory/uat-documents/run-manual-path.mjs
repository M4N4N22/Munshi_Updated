import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE = 'http://localhost:4001';
const DOCS = path.dirname(fileURLToPath(import.meta.url));
const u = (d) => (d?.data !== undefined ? d.data : d);

async function req(method, urlPath, body, isForm) {
  const opts = { method };
  if (body) {
    if (isForm) opts.body = body;
    else {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(body);
    }
  }
  const r = await fetch(BASE + urlPath, opts);
  return { status: r.status, data: await r.json() };
}

const phone = '919810000099';
let r = await req('POST', '/onboarding/otp/send', { phone_number: phone });
const otp = u(r.data).dev_otp;
await req('POST', '/onboarding/otp/verify', { phone_number: phone, code: otp });
r = await req('POST', '/onboarding/register', {
  phone_number: phone,
  name: 'Parse Test',
  factory_name: 'Doc Parse Test Manual',
});
const fid = u(r.data).factory_id;
const oid = u(r.data).user_id;
const filePath = path.join(DOCS, 'doc-a-clean-supplier-inventory.csv');
const buf = fs.readFileSync(filePath);
const form = new FormData();
form.append('file', new Blob([buf]), 'doc-a.csv');
form.append('factory_id', String(fid));
form.append('uploaded_by', String(oid));
form.append('document_type', 'INVENTORY_IMPORT');
form.append('auto_process', 'false');
r = await req('POST', '/documents/upload', form, true);
console.log('upload', r.status, u(r.data).document?.id);
const docId = u(r.data).document?.id;
const ml = await fetch('http://localhost:8000/parse', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    factory_id: fid,
    file_name: 'doc-a.csv',
    mime_type: 'text/csv',
    document_type: 'INVENTORY_IMPORT',
    content_base64: buf.toString('base64'),
  }),
}).then((x) => x.json());
r = await req('POST', `/documents/${docId}/extractions`, {
  factory_id: fid,
  document_type_detected: ml.document_type,
  payload: ml.payload,
});
console.log('extract', r.status, u(r.data).id);
const extId = u(r.data).id;
r = await req('POST', `/documents/${docId}/extractions/${extId}/suggestions?factory_id=${fid}`);
console.log('suggest', r.status, JSON.stringify(u(r.data)).slice(0, 300));
r = await req('GET', `/documents/${docId}/suggestions?factory_id=${fid}`);
const sug = u(r.data)[0];
console.log('suggestion', sug?.id, sug?.suggestion_type, sug?.payload?.items?.length);
// Direct execute via approve-workflow + YES
r = await req('POST', `/documents/suggestions/${sug.id}/approve-workflow`, {
  factory_id: fid,
  phone_number: phone,
});
console.log('workflow start', r.status);
r = await req('POST', '/webhook/test', { from: phone, message: 'YES' });
console.log('YES', r.status, JSON.stringify(r.data).slice(0, 200));
r = await req('GET', `/inventory/items?factory_id=${fid}`);
const items = u(r.data);
console.log('item count', Array.isArray(items) ? items.length : items);
if (Array.isArray(items)) {
  console.log('sample', items.slice(0, 3).map((i) => ({ sku: i.sku, qty: i.current_quantity, unit: i.unit })));
}
