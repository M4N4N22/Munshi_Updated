import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE = 'http://localhost:4001';
const DOCS = path.dirname(fileURLToPath(import.meta.url));

const u = (d) => (d?.data !== undefined ? d.data : d);
const p = (n) => `9198${String(n).padStart(8, '0')}`;

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
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: r.status, ok: r.ok, data, raw: text.slice(0, 500) };
}

async function wa(from, message) {
  return req('POST', '/webhook/test', { from, message });
}

async function onboardOwner(n, factoryName) {
  const phone = p(n);
  let r = await req('POST', '/onboarding/otp/send', { phone_number: phone });
  const otp = u(r.data).dev_otp;
  await req('POST', '/onboarding/otp/verify', { phone_number: phone, code: otp });
  r = await req('POST', '/onboarding/register', {
    phone_number: phone,
    name: 'Doc UAT Owner',
    factory_name: factoryName,
  });
  return {
    phone,
    factoryId: u(r.data).factory_id,
    ownerId: u(r.data).user_id,
  };
}

async function uploadDoc(factoryId, ownerId, filePath, docType = 'INVENTORY_IMPORT') {
  const buf = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'text/csv' }), path.basename(filePath));
  form.append('factory_id', String(factoryId));
  form.append('uploaded_by', String(ownerId));
  form.append('document_type', docType);
  form.append('auto_process', 'true');
  return req('POST', '/documents/upload', form, true);
}

async function csvImport(factoryId, ownerId, filePath) {
  const buf = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'text/csv' }), path.basename(filePath));
  form.append('factory_id', String(factoryId));
  form.append('created_by', String(ownerId));
  return req('POST', '/inventory/import/csv', form, true);
}

async function approveSuggestionViaWhatsApp(phone, suggestionId, factoryId) {
  await req('POST', `/documents/suggestions/${suggestionId}/approve-workflow`, {
    factory_id: factoryId,
    phone_number: phone,
  });
  return wa(phone, 'YES');
}

async function countItems(factoryId) {
  const r = await req('GET', `/inventory/items?factory_id=${factoryId}`);
  const items = u(r.data);
  return Array.isArray(items) ? items.length : 0;
}

async function listSuggestions(docId, factoryId) {
  const r = await req('GET', `/documents/${docId}/suggestions?factory_id=${factoryId}`);
  return u(r.data) ?? [];
}

const results = { runs: [], csvBaselines: [], failures: [], ml: null };

(async () => {
  try {
    const ml = await fetch('http://localhost:8000/health');
    results.ml = ml.ok ? 'UP' : 'DOWN';
  } catch {
    results.ml = 'DOWN';
  }

  // CSV baseline A
  const baseA = await onboardOwner(101, 'ABC Doc UAT Baseline A');
  const csvA = await csvImport(baseA.factoryId, baseA.ownerId, path.join(DOCS, 'baseline-a-clean.csv'));
  results.csvBaselines.push({
    doc: 'baseline-a-clean',
    factoryId: baseA.factoryId,
    status: csvA.status,
    summary: u(csvA.data),
    itemCount: await countItems(baseA.factoryId),
  });

  const docTests = [
    { id: 'A', file: 'doc-a-clean-supplier-inventory.csv', expectedItems: 12, phone: 201 },
    { id: 'B', file: 'doc-b-duplicate-items.csv', expectedItems: null, phone: 202 },
    { id: 'C', file: 'doc-c-missing-quantity.csv', expectedItems: 5, phone: 203 },
    { id: 'D', file: 'doc-d-missing-sku.csv', expectedItems: 5, phone: 204 },
    { id: 'E', file: 'doc-e-large-inventory.csv', expectedItems: 25, phone: 205 },
    { id: 'F', file: 'doc-f-mixed-units.csv', expectedItems: 7, phone: 206 },
  ];

  for (const t of docTests) {
    const ctx = await onboardOwner(t.phone, `ABC Doc UAT ${t.id}`);
    const filePath = path.join(DOCS, t.file);
    const upload = await uploadDoc(ctx.factoryId, ctx.ownerId, filePath);
    const uploadData = u(upload.data);
    const docId = uploadData?.document?.id;
    const processing = uploadData?.processing;
    let suggestions = docId ? await listSuggestions(docId, ctx.factoryId) : [];

    let approveStatus = null;
    let itemCountAfter = null;
    if (suggestions.length && suggestions[0].status === 'PENDING') {
      const appr = await approveSuggestionViaWhatsApp(
        ctx.phone,
        suggestions[0].id,
        ctx.factoryId,
      );
      approveStatus = appr.status;
      itemCountAfter = await countItems(ctx.factoryId);
    }

    const extractedItems =
      processing?.extraction?.payload?.items?.length ??
      suggestions[0]?.payload?.items?.length ??
      suggestions[0]?.payload?.item ? 1 : 0;

    results.runs.push({
      doc: t.id,
      file: t.file,
      factoryId: ctx.factoryId,
      uploadStatus: upload.status,
      docId,
      documentStatus: uploadData?.document?.status,
      processingError: processing?.error ?? null,
      suggestionCount: suggestions.length,
      suggestionTypes: suggestions.map((s) => s.suggestion_type),
      suggestionItemCount:
        suggestions[0]?.payload?.items?.length ??
        (suggestions[0]?.payload?.item ? 1 : 0),
      extractedItemCount: extractedItems,
      approveStatus,
      inventoryItemsAfter: itemCountAfter,
      expectedItems: t.expectedItems,
      warnings: processing?.warnings ?? null,
      rawUpload: upload.ok ? 'OK' : upload.raw,
    });
  }

  // Failure tests
  const failCtx = await onboardOwner(301, 'ABC Doc UAT Failures');
  for (const [name, file, docType] of [
    ['empty', 'fail-empty.csv', 'INVENTORY_IMPORT'],
    ['corrupt', 'fail-corrupt.csv', 'INVENTORY_IMPORT'],
    ['unsupported', 'fail-unsupported.pdf', 'INVENTORY_IMPORT'],
  ]) {
    const fp = path.join(DOCS, file);
    if (!fs.existsSync(fp) && name === 'unsupported') {
      fs.writeFileSync(fp, '%PDF-1.4 fake pdf content not parseable as inventory');
    }
    const r = name === 'duplicate'
      ? await uploadDoc(failCtx.factoryId, failCtx.ownerId, path.join(DOCS, 'doc-a-clean-supplier-inventory.csv'))
      : await uploadDoc(failCtx.factoryId, failCtx.ownerId, fp, docType);
    results.failures.push({ name, status: r.status, ok: r.ok, message: u(r.data)?.meta?.message ?? u(r.data) });
  }

  // duplicate upload
  const dup1 = await uploadDoc(failCtx.factoryId, failCtx.ownerId, path.join(DOCS, 'doc-f-mixed-units.csv'));
  const dup2 = await uploadDoc(failCtx.factoryId, failCtx.ownerId, path.join(DOCS, 'doc-f-mixed-units.csv'));
  results.failures.push({ name: 'duplicate_upload_1', status: dup1.status });
  results.failures.push({ name: 'duplicate_upload_2', status: dup2.status });

  console.log(JSON.stringify(results, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
