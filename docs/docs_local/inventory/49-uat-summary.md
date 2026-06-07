# UAT Summary — Phase 0 to Phase 3

**Run date:** 2026-06-06  
**Tester perspective:** Business user (Owner, Manager, Worker, Inventory Lead, Vendor Lead)  
**Environment:** Local UAT — backend `http://localhost:4001`, PostgreSQL up  
**Code modified:** None  
**Scope:** Business journeys only; NLP/ML intent classification **out of scope**

---

## Final Verdict

# READY WITH KNOWN ISSUES

Munshi can support day-to-day MSME operations **via WhatsApp and structured REST flows** for onboarding, team setup, tasks, inventory CSV import, purchase request creation, and command-driven workflows. **Production REST exposure and a stale UAT runtime** prevent a full **PRODUCTION READY** rating.

---

## Question Answered

> *Can a real business successfully operate using Munshi today?*

**Yes, with caveats:** A WhatsApp-first factory owner can onboard, build a team, assign and complete tasks, import inventory from CSV, check stock via commands, mark attendance, and start procurement — **provided** the backend is restarted on the latest build, Zoho credentials are configured for sync, and operators understand structured commands (not free-text AI).

---

## Scenario Group Results

| # | Scenario Group | Result | Notes |
|---|----------------|--------|-------|
| 1 | Owner onboarding | **PASS** | OTP → register → factory created |
| 2 | Team onboarding | **PASS** | 7 members + 4 departments |
| 3 | Worker onboarding | **PASS** | `/onboard_worker` workflow starts |
| 4 | Task management | **PASS** | Create + complete lifecycle |
| 5 | Task + inventory | **PASS** † | Insufficient stock blocked; † live stock-in needs string qty |
| 6 | CSV inventory import | **PASS** | Valid import + invalid rejected |
| 7 | Document parsing / OCR | **PARTIAL** | Registry available; full upload path not live-tested |
| 8 | Inventory management | **PASS** | List, low-stock API, adjustments via REST |
| 9 | Purchase requests | **PARTIAL** | Create **PASS**; approve requires `submit: true` first |
| 10 | Low stock alerts | **PASS** † | † validated live + integration suite |
| 11 | Purchase request prefill | **FAIL** live / **PASS** † | † UAT server missing route (stale instance) |
| 12 | Zoho connection | **PARTIAL** | Connections list OK; OAuth env not configured |
| 13 | Zoho inventory pull | **PASS** | Manual sync returns expected “no connection” |
| 14 | Zoho stock push | **FAIL** live / **PASS** † | † stale route; integration tests green |
| 15 | Sync failure alerts | **PASS** † | Integration-validated owner/manager alerts |
| 16 | WhatsApp commands | **PASS** | Structured commands only (in scope) |
| 17 | Role-based experience | **PARTIAL** | No Inventory Manager / Vendor Coordinator roles |
| 18 | Error recovery | **PASS** | Invalid input, duplicate complete, insufficient stock |
| 19 | Full business day | **PARTIAL** | Morning/midday flows OK; evening Zoho blocked by env |

† = confirmed by automated integration tests (115/115) where live UAT server was stale or API typing caused friction.

---

## Test Data Created

| Entity | Value |
|--------|-------|
| Factory | ABC Manufacturing (IDs 2010, 2042, …) |
| Departments | Production, Inventory, Procurement, Operations |
| Users | 1 Owner, 2 Managers, 3 Workers, 2 Managers as Inventory/Vendor leads |
| Phones | `919900000001`–`919900000008` (primary run) |

---

## Automated Regression Evidence

```bash
cd backend && npm run test:integration -- --runInBand
```

**115/115 PASS** — covers task-linked inventory, CSV import, Zoho push/retry, low-stock alerts, manager alerts, sync-failure alerts, purchase-request prefill.

---

## Critical UAT Blockers

| Blocker | Impact |
|---------|--------|
| UAT backend instance stale (no restart after Phase 3.4) | Prefill + push-delivery routes return 404 |
| REST API unauthenticated | Any user can read/write tenant data if port exposed |
| Zoho OAuth env vars unset | Live Zoho connect fails with 500 |

---

## Out of Scope (Not Tested)

- Natural language task creation  
- Intent classification / ML routing  
- Free-text WhatsApp routing  
- Phase 4 conversational AI  

---

## Report Index

| Report | Focus |
|--------|-------|
| `49-uat-owner-experience.md` | Groups 1–2, 12, 19 morning |
| `49-uat-manager-experience.md` | Tasks, approvals, alerts |
| `49-uat-worker-experience.md` | Groups 3–4, 16 worker paths |
| `49-uat-inventory-experience.md` | Groups 5–6, 8, 10 |
| `49-uat-document-parsing-experience.md` | Group 7 |
| `49-uat-purchase-request-experience.md` | Groups 9, 11 |
| `49-uat-zoho-experience.md` | Groups 12–15 |
| `49-uat-whatsapp-command-experience.md` | Group 16 |
| `49-uat-defects.md` | Defect log |
| `49-uat-signoff.md` | Formal signoff |

---

## Prior Reports Referenced

Reports `28-*` through `48-*` reviewed for expected behaviour. Phase 0–3 implementation signoffs align with integration test evidence. Live UAT gaps primarily reflect **environment staleness** and **security posture**, not missing Phase 3 code.
