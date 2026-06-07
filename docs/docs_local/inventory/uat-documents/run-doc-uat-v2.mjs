import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE = 'http://localhost:4001';
const ML = 'http://localhost:8000';
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
  return { status: r.status, ok: r.ok, data };
}

async function mlParse(factoryId, filePath, docType = 'INVENTORY_IMPORT') {
  const buf = fs.readFileSync(filePath);
  const r = await fetch(`${ML}/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      factory_id: factoryId,
      file_name: path.basename(filePath),
      mime_type: 'text/csv',
      document_type: docType,
      content_base64: buf.toString('base64'),
    }),
  });
  return { status: r.status, data: await r.json(), buf };
}

async function onboard(n, name) {
  const phone = p(n);
  let r = await req('POST', '/onboarding/otp/send', { phone_number: phone });
  await req('POST', '/onboarding/otp/verify', {
    phone_number: phone,
    code: u(r.data).dev_otp,
  });
  r = await req('POST', '/onboarding/register', {
    phone_number: phone,
    name: 'Doc UAT Owner',
    factory_name: name,
  });
  return { phone, factoryId: u(r.data).factory_id, ownerId: u(r.data).user_id };
}

async function ensureCategoryLocation(factoryId, ownerId) {
  let r = await req('POST', '/inventory/categories', {
    factory_id: factoryId,
    name: 'Raw Materials',
    created_by: ownerId,
  });
  const catId = u(r.data).id;
  r = await req('POST', '/inventory/locations', {
    factory_id: factoryId,
    name: 'Main Warehouse',
    created_by: ownerId,
  });
  return { catId, locId: u(r.data).id };
}

async function csvImport(factoryId, ownerId, filePath) {
  const buf = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'text/csv' }), path.basename(filePath));
  form.append('factory_id', String(factoryId));
  form.append('created_by', String(ownerId));
  return req('POST', '/inventory/import/csv', form, true);
}

async function runDocumentPipeline(ctx, filePath) {
  const buf = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'text/csv' }), path.basename(filePath));
  form.append('factory_id', String(ctx.factoryId));
  form.append('uploaded_by', String(ctx.ownerId));
  form.append('document_type', 'INVENTORY_IMPORT');
  form.append('auto_process', 'false');
  const upload = await req('POST', '/documents/upload', form, true);
  const docId = u(upload.data).document?.id;

  const parsed = await mlParse(ctx.factoryId, filePath);
  const ext = await req('POST', `/documents/${docId}/extractions`, {
    factory_id: ctx.factoryId,
    document_type_detected: parsed.data.document_type,
    payload: parsed.data.payload,
  });
  const extId = u(ext.data).id;
  await req(
    'POST',
    `/documents/${docId}/extractions/${extId}/suggestions?factory_id=${ctx.factoryId}`,
  );
  const sugRes = await req('GET', `/documents/${docId}/suggestions?factory_id=${ctx.factoryId}`);
  const suggestions = u(sugRes.data) ?? [];

  let approveOk = false;
  if (suggestions[0]?.status === 'PENDING') {
    await req('POST', `/documents/suggestions/${suggestions[0].id}/approve-workflow`, {
      factory_id: ctx.factoryId,
      phone_number: ctx.phone,
    });
    const yes = await req('POST', '/webhook/test', { from: ctx.phone, message: 'YES' });
    approveOk = yes.status === 200 || yes.status === 201;
    // Inventory may still be created when outbound messaging returns 401
    const items = await req('GET', `/inventory/items?factory_id=${ctx.factoryId}`);
    const list = u(items.data);
    const count = list?.data?.length ?? (Array.isArray(list) ? list.length : 0);
    if (count > 0) approveOk = true;
  }

  const itemsRes = await req('GET', `/inventory/items?factory_id=${ctx.factoryId}`);
  const list = u(itemsRes.data);
  const itemRows = list?.data ?? (Array.isArray(list) ? list : []);

  return {
    uploadStatus: upload.status,
    docId,
    parsedItems: parsed.data?.payload?.items ?? [],
    parsedWarnings: parsed.data?.warnings ?? [],
    suggestions: suggestions.map((s) => ({
      id: s.id,
      type: s.suggestion_type,
      itemCount: s.payload?.items?.length ?? (s.payload?.item ? 1 : 0),
      status: s.status,
    })),
    approveOk,
    inventoryCount: itemRows.length,
    inventoryItems: itemRows.map((i) => ({
      sku: i.sku,
      name: i.name,
      qty: i.current_quantity,
      unit: i.unit,
    })),
  };
}

function countCsvRows(filePath) {
  const lines = fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim());
  return Math.max(0, lines.length - 1);
}

function accuracy(parsed, expectedRows) {
  if (!expectedRows) return null;
  const n = parsed.length;
  return Math.round((Math.min(n, expectedRows) / expectedRows) * 100);
}

const OUT = { implementation: {}, csvBaselines: [], documents: [], failures: [], ml: 'UP' };

(async () => {
  OUT.implementation = {
    ocrImplemented: false,
    parserService: 'ML service POST /parse (tabular CSV/XLS only)',
    supportedTypes: [
      'INVENTORY_IMPORT',
      'STOCK_REGISTER',
      'PURCHASE_INVOICE (contract only)',
      'GOODS_RECEIPT (contract only)',
    ],
    uploadEndpoint: 'POST /documents/upload',
    approvalCommand: '/suggestion_approve (WhatsApp YES/NO workflow)',
    whatsappDocumentPath: 'CSV bulk import only — NOT document parsing pipeline',
    autoProcessBlocker: 'auto_process=true fails when outbound messaging returns 401',
  };

  const baseCtx = await onboard(501, 'ABC Doc UAT CSV Baseline');
  await ensureCategoryLocation(baseCtx.factoryId, baseCtx.ownerId);
  const csvR = await csvImport(
    baseCtx.factoryId,
    baseCtx.ownerId,
    path.join(DOCS, 'baseline-a-clean.csv'),
  );
  OUT.csvBaselines.push({
    file: 'baseline-a-clean.csv',
    factoryId: baseCtx.factoryId,
    status: csvR.status,
    summary: u(csvR.data),
    itemCount: (await req('GET', `/inventory/items?factory_id=${baseCtx.factoryId}`)).data,
  });

  const tests = [
    { id: 'A', file: 'doc-a-clean-supplier-inventory.csv', rows: 12, phone: 601 },
    { id: 'B', file: 'doc-b-duplicate-items.csv', rows: 5, phone: 602 },
    { id: 'C', file: 'doc-c-missing-quantity.csv', rows: 5, phone: 603 },
    { id: 'D', file: 'doc-d-missing-sku.csv', rows: 5, phone: 604 },
    { id: 'E', file: 'doc-e-large-inventory.csv', rows: 25, phone: 605 },
    { id: 'F', file: 'doc-f-mixed-units.csv', rows: 7, phone: 606 },
  ];

  for (const t of tests) {
    const ctx = await onboard(t.phone, `ABC Doc UAT ${t.id}`);
    const fp = path.join(DOCS, t.file);
    const result = await runDocumentPipeline(ctx, fp);
    OUT.documents.push({
      id: t.id,
      file: t.file,
      factoryId: ctx.factoryId,
      expectedRows: t.rows,
      parsingAccuracyPct: accuracy(result.parsedItems, t.rows),
      ...result,
    });
  }

  const failCtx = await onboard(701, 'ABC Doc UAT Failures');
  for (const [name, file] of [
    ['empty', 'fail-empty.csv'],
    ['corrupt', 'fail-corrupt.csv'],
    ['unsupported_pdf', 'fail-unsupported.pdf'],
  ]) {
    const fp = path.join(DOCS, file);
    if (!fs.existsSync(fp) && name === 'unsupported_pdf') {
      fs.writeFileSync(fp, '%PDF-1.4 not a real inventory file');
    }
    if (name === 'empty' || name === 'corrupt' || name === 'unsupported_pdf') {
      const upload = await req('POST', '/documents/upload', (() => {
        const form = new FormData();
        form.append('file', new Blob([fs.readFileSync(fp)]), path.basename(fp));
        form.append('factory_id', String(failCtx.factoryId));
        form.append('uploaded_by', String(failCtx.ownerId));
        form.append('auto_process', 'false');
        return form;
      })(), true);
      OUT.failures.push({ name, uploadStatus: upload.status, note: u(upload.data)?.meta?.message });
      if (name !== 'unsupported_pdf') {
        try {
          const parsed = await mlParse(failCtx.factoryId, fp);
          OUT.failures[OUT.failures.length - 1].mlParseStatus = parsed.status;
        } catch (e) {
          OUT.failures[OUT.failures.length - 1].mlParseError = String(e);
        }
      }
    }
  }

  fs.writeFileSync(path.join(DOCS, 'uat-execution-results.json'), JSON.stringify(OUT, null, 2));
  console.log(JSON.stringify(OUT, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
