# UAT — Document Parsing Experience

**Roles:** Owner, Inventory Lead  
**Run date:** 2026-06-06  

---

## Scope

Validate document upload, OCR extraction, item/quantity extraction, preview, correction, and inventory creation from invoices and inventory sheets.

---

## Live UAT Results

| Step | Result | Notes |
|------|--------|-------|
| Document type registry `GET /documents/registry/types` | **PASS** | Types listed for business selection |
| Upload invoice (clean) | **NOT EXECUTED** | Requires multipart upload + OLLI pipeline |
| Upload messy / multi-page invoice | **NOT EXECUTED** | |
| OCR extraction quality | **NOT EXECUTED** | OLLI_URL reachable per env prep |
| Suggestion approval workflow | **NOT EXECUTED** | `/suggestion_approve` workflow registered |
| Final inventory creation from document | **NOT EXECUTED** | |

---

## Environment

| Service | Status |
|---------|--------|
| OLLI_URL | **REACHABLE** (env prep 48-*) |
| ML_URL | **DOWN** (out of scope for NLP; document path may use OLLI) |

---

## Evidence from Prior Validation (Reports 28–40)

| Capability | Report evidence | Status |
|------------|-----------------|--------|
| Document module + upload endpoint | Backend health audit | Implemented |
| Extraction storage + suggestions | Document controller routes | Implemented |
| WhatsApp document inbound | `whatsapp.controller` document kind | Implemented |
| Integration tests for document flows | Limited in 115 suite | **GAP** |

---

## Test Matrix (Planned vs Executed)

| Document type | Executed | Result |
|---------------|----------|--------|
| Clean invoice | No | — |
| Messy invoice | No | — |
| Multi-page invoice | No | — |
| Partial invoice | No | — |
| Missing quantities | No | — |
| Duplicate products | No | — |
| Vendor bill | No | — |
| Inventory sheet | No | — |

---

## Scenario Group Verdict

| Group | Result |
|-------|--------|
| 7 — Document parsing / inventory extraction | **PARTIAL** |

**Rationale:** API surface exists and OLLI is up, but **no end-to-end business upload was executed** in this UAT session. Cannot certify extraction quality, error messaging, or recovery flow from live evidence.

---

## Business Impact

- Owners expecting **WhatsApp invoice → stock** must rely on **CSV import** (validated **PASS**) until document UAT is completed.  
- Risk: **MEDIUM** — feature appears built but lacks business signoff on OCR accuracy.

---

## Recommended Follow-Up (Outside This UAT)

1. Upload sample invoice via `POST /documents/upload` with `auto_process=true`.  
2. Walk suggestion approve/reject on WhatsApp.  
3. Re-run this report section with PASS/FAIL per document type.
