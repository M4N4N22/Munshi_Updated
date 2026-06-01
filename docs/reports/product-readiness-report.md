# Product Readiness Report — Munshi WhatsApp Business OS

**Assessment date:** 2026-06-01  
**Verdict:** **NOT READY** for natural-language-first customer rollout

---

## Executive summary

Backend infrastructure is **production-grade** (migrations, health checks, modular domains). The **customer-facing intent layer on deployed ML is stale** and misroutes the majority of owner-facing operations. Manager and worker daily operations classify well.

---

## Experience ratings

| Dimension | Score | Summary |
|-----------|-------|---------|
| Owner Experience | **4/10** | Reports/issues OK; discovery/inventory/procurement/vendor NL broken |
| Manager Experience | **7/10** | Task ops strong; inventory manager stock queries fail |
| Worker Experience | **8/10** | Attendance, completion, issues work naturally in Hindi |
| Vendor Experience | **2/10** | No vendor chat role; owner vendor NL broken |
| Discovery Experience | **3/10** | APIs + scoring exist; unreachable via WhatsApp NL |
| Inventory Experience | **3/10** | Backend ready; NL path broken; test data empty |
| Procurement Experience | **2/10** | Backend lifecycle exists; NL misroutes to tasks |

**Weighted customer readiness: ~4/10**

---

## What works today (customer path)

- Hindi/Hinglish **attendance** (present/absent)
- **Task completion** confirmation
- **Issue reporting** (machine down, material shortage)
- **Manager task assignment**, transfer, rejection, self-assign
- **Department task routing**
- **Reports** (attendance/tasks aggregate via `/report` intent)
- **Issue listing**
- **General chat** fallback

---

## What does not work (customer path)

- Business introduction / discovery / resume setup
- Inventory status and stock queries
- Inventory item creation via chat
- Vendor onboarding and vendor lookup via chat
- Purchase request creation and status via chat
- Document upload → suggestion → approval chain (untested)
- Low-stock → procurement suggestion chain
- Vendor-as-user interactions (not implemented)

---

## Infrastructure readiness

| Layer | Status |
|-------|--------|
| Database migrations (001–007) | ✅ Applied, 0 pending |
| Postgres connectivity | ✅ |
| Business Discovery domain | ✅ APIs respond |
| Procurement domain | ✅ 6 PRs on test factory |
| Inventory domain | ✅ API OK (empty items) |
| Vendor domain | ✅ API OK |
| Document processing | ⚠️ Untested E2E |
| Production ML alignment | ❌ Critical drift |

---

## Blockers before customer pilot

1. **Redeploy ML service** to match local `bot_engine.py` (discovery, inventory, PR, vendor pre-classifiers)
2. **Verify ML contract drift** in CI against `contracts/intent-types.json`
3. **Seed realistic factory data** or onboarding path that creates Sharma-like entities
4. **Fix semantic gap:** "vendor list dikhao" → members vs vendors
5. **E2E WhatsApp test** with real message loop for one full procurement + discovery cycle
6. **Document upload QA** via WhatsApp media

---

## Does Munshi feel like a usable WhatsApp-first Business OS?

**For shop-floor workers and task managers:** Partially yes — daily coordination language works.

**For business owners** trying to run inventory, suppliers, and purchasing:** No — the system would feel broken or evasive, routing orders to wrong workflows or generic chat.

**For vendors:** Not applicable — no vendor interface.

---

## Recommendation

**Do not onboard Sharma Packaging Industries** (or similar customers) until production ML is redeployed and a full NL regression pass achieves **≥90% intent accuracy** on owner/inventory/procurement/vendor utterances per `backend-llm-contract.md`.

Proceed with **limited pilot** scoped to task + attendance + issues only.

---

## LOCAL VALIDATION RESULTS

### Phase 0 (local stack)

| Check | Result |
|-------|--------|
| Local backend :4001 | **Running** |
| Local ML :8000 | **Running** (uvicorn started for QA) |
| Database | **Connected** (remote Postgres in `.env.local`) |
| Migrations 001–007 | **Applied**, pending 0 |
| Domain tables | **Verified** via APIs |

### Local experience ratings (evidence-based)

| Dimension | Production QA | Local validation | Delta |
|-----------|---------------|------------------|-------|
| Owner | 4/10 | **6/10** | +2 — local ML fixes entry intents |
| Manager | 7/10 | **5/10** | −2 — local worse for Hindi assign |
| Worker | 8/10 | **6/10** | −2 — local misses present/issue pre-classifier |
| Discovery | 3/10 | **5/10** | +2 — starts on local ML; no DB progress |
| Inventory | 3/10 | **5/10** | +2 — intent OK locally; 0 items |
| Procurement | 2/10 | **4/10** | +2 — PR create intent local only |
| Vendor | 2/10 | **3/10** | +1 |
| Intent accuracy | 58% prod | **~50% local HTTP** / **owner 100% pre-classifier** | Split by layer |
| Workflow reliability | N/A | **5/10** | Partial DB effects via prod webhook |

### Could Sharma Packaging operate locally today?

**Not end-to-end.** Continuous story did not create vendors, inventory, or PRs. Attendance and one issue persisted via prod ML webhook. **Align `ML_URL` to local ML + redeploy prod + fix Hindi worker/manager pre-classifiers + seed factory data** before customer pilot.

### Local product verdict

**Conditionally closer** — local ML + backend code aligned for **owner entry intents**. Default dev config still routes webhook to prod ML. **Not customer-ready** without config alignment and workflow completion testing.
