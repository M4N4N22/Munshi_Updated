# UAT Defect Log — Phase 0 to Phase 3

**Run date:** 2026-06-06  
**Testing only — no fixes applied**

---

## Summary by Severity

| Severity | Count |
|----------|-------|
| CRITICAL | 2 |
| HIGH | 3 |
| MEDIUM | 5 |
| LOW | 3 |
| INFO | 2 |

---

## CRITICAL

### UAT-D-01 — REST API has no authentication

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **Business impact** | Any party with network access can read/modify any factory's users, inventory, tasks, and purchase requests by supplying `factory_id`. |
| **Steps to reproduce** | 1. Call `GET /factories` without credentials. 2. Call `GET /users/by-phone?phone=...`. 3. Mutate inventory for arbitrary `factory_id`. |
| **Expected** | Only authenticated members access tenant data. |
| **Actual** | All endpoints respond without auth (confirmed in live UAT + report 46-backend-bugs BUG-C01–C03). |
| **Suggested fix direction** | Global auth guard; factory membership validation on every mutating request. |

---

### UAT-D-02 — UAT runtime stale (missing Phase 3.4+ routes)

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL (environment) |
| **Business impact** | Purchase request prefill and Zoho push-delivery visibility unavailable on port 4001 despite code shipping. |
| **Steps to reproduce** | 1. `GET /purchase-requests/prefill/low-stock?factory_id=X&inventory_item_id=Y`. 2. `GET /integrations/zoho/sync/push-deliveries?factory_id=X&user_id=Y`. |
| **Expected** | 200 with prefill payload / delivery list. |
| **Actual** | 404 `Cannot GET ...` |
| **Suggested fix direction** | Restart backend after deploy; add deploy smoke test for route registry. |

---

## HIGH

### UAT-D-03 — Zoho OAuth environment not configured

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Business impact** | Owner cannot connect Zoho Inventory in UAT/production until DevOps sets OAuth vars. |
| **Steps to reproduce** | `GET /integrations/zoho/authorize?factory_id=1&user_id=1` |
| **Expected** | Redirect to Zoho consent screen. |
| **Actual** | 500 Internal Server Error — env not configured. |
| **Suggested fix direction** | Configure `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REDIRECT_URI`, `ZOHO_ACCOUNTS_URL` in deployment env. |

---

### UAT-D-04 — Purchase request REST approve fails on DRAFT

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Business impact** | Business user creates PR via API, attempts approve, receives 400 with no clear next step unless they know to submit first. |
| **Steps to reproduce** | 1. `POST /purchase-requests` without `submit: true`. 2. `POST /purchase-requests/:id/approve` with `performed_by`. |
| **Expected** | Clear business flow to submit then approve, or auto-submit on create. |
| **Actual** | PR remains DRAFT; approve returns 400. |
| **Suggested fix direction** | UX: default `submit: true` for WhatsApp path; REST docs + validation message explaining submit step. |

---

### UAT-D-05 — WhatsApp messaging provider auth intermittent

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Business impact** | Owner commands may fail with 401 when outbound messaging API rejects credentials. |
| **Steps to reproduce** | `POST /webhook/test` with `{ from: owner, message: "/help" }` when provider misconfigured. |
| **Expected** | Help text returned to user. |
| **Actual** | 401 `Authentication required. Use X-API-Key header...` (observed in one UAT run; passed in supplement run). |
| **Suggested fix direction** | Verify OLLI/messaging credentials in UAT; graceful fallback message in dev mode. |

---

## MEDIUM

### UAT-D-06 — REST inventory quantity must be string

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Business impact** | Stock-in/out silently fails if JSON sends numeric quantity; ledger appears empty. |
| **Steps to reproduce** | `POST /inventory/transactions/stock-in` with `"quantity": 20` (number). |
| **Expected** | Stock updated or clear validation error. |
| **Actual** | 400 validation failure; business user may not understand field type. |
| **Suggested fix direction** | Accept number coerced to string in DTO transform; clearer error copy. |

---

### UAT-D-07 — Document parsing not business-validated end-to-end

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Business impact** | Invoice-to-inventory path unproven for business users; CSV path works. |
| **Steps to reproduce** | Upload invoice via `POST /documents/upload` — not executed in UAT. |
| **Expected** | OCR → suggestions → approval → stock. |
| **Actual** | Not tested live. |
| **Suggested fix direction** | Dedicated document UAT session with sample invoices. |

---

### UAT-D-08 — No Inventory Manager / Vendor Coordinator roles

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Business impact** | Test plan roles map to generic MANAGER; permissions cannot be fine-grained for inventory vs vendor staff. |
| **Steps to reproduce** | Inspect `USER_ROLE` enum — only OWNER, MANAGER, WORKER. |
| **Expected** | Optional specialist roles per test plan. |
| **Actual** | All specialists are MANAGER. |
| **Suggested fix direction** | Product decision: add roles or document mapping in user guide. |

---

### UAT-D-09 — Unauthenticated test webhook in production

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Business impact** | Anyone can trigger workflows via `POST /webhook/test` if exposed. |
| **Steps to reproduce** | Call test webhook without Meta signature. |
| **Expected** | Disabled in production. |
| **Actual** | Open in current build (report 46 BUG-H02). |
| **Suggested fix direction** | Env-gated disable or shared secret for test route. |

---

### UAT-D-10 — ML service down (out of scope but noted)

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Business impact** | Free-text WhatsApp (Phase 4) non-functional — **explicitly out of UAT scope**. |
| **Steps to reproduce** | Send non-command free text. |
| **Expected** | N/A for this UAT. |
| **Actual** | ML_URL connection refused. |
| **Suggested fix direction** | Start ML for Phase 4 UAT only. |

---

## LOW

### UAT-D-11 — `/webhook/test` used for UAT vs production Meta webhook

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Business impact** | Test path may not reflect Meta payload edge cases. |
| **Suggested fix direction** | Supplement with Meta sandbox testing before go-live. |

---

### UAT-D-12 — PR approve DTO field naming

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Business impact** | Integrators using `actor_id` get 400; must use `performed_by`. |
| **Suggested fix direction** | API docs / alias field. |

---

### UAT-D-13 — Duplicate task complete message only

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Business impact** | User re-completes task — receives message, no double stock move (correct). |
| **Actual** | **PASS** behaviour; logged for completeness. |

---

## INFO

### UAT-D-14 — Port 4001 EADDRINUSE on second start

| Field | Value |
|-------|-------|
| **Severity** | INFO |
| **Business impact** | None if single instance intended. |
| **Suggested fix direction** | Process manager or documented restart procedure. |

---

### UAT-D-15 — Integration tests cover alerts not visible in live WhatsApp

| Field | Value |
|-------|-------|
| **Severity** | INFO |
| **Business impact** | Alert copy validated in tests; live delivery depends on messaging creds. |
| **Suggested fix direction** | Staging test with real WhatsApp sandbox. |

---

## Defects Not Logged (By Design)

- No code changes during UAT  
- No migration issues  
- No NLP/ML routing defects (out of scope)
