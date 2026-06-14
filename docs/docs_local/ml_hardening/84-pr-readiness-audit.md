# PR Readiness Audit

**Branch:** `feature/shantanu-ml-hardening-v1`  
**Target:** `main`  
**Date:** 2026-06-12  
**Prior commit on branch:** `a49ad68` (ML hardening V1–V2E + E2E validation)  
**This commit:** Observability I1–I5 + docs 82–84

---

## Included in PR (full branch)

### ML Hardening (commit `a49ad68`)

| Area | Artifacts |
|------|-----------|
| V1 | `bot_engine.py`, contract v1.1, smoke harness, docs 69–71 |
| V2B | Operational sink hardening, `test_v2b_sink_hardening.py`, doc 73 |
| V2C | Task lifecycle, `test_v2c_task_lifecycle.py`, doc 74 |
| V2D | Production path validation, doc 75 |
| V2E | Inventory/vendor, `test_v2e_inventory_vendor.py`, doc 76 |
| Audits | Docs 72, 77, 78 (design), 79–81 (E2E validation) |
| Data | `ml/data/eval/smoke/smoke-v1.1.jsonl`, manifest, schemas |
| Backend | Contract drift spec updates, E2E validation scripts |
| Inventory idempotency docs | `inventory_bugs/`, `review_report/` |

### Observability (new commit)

| Area | Artifacts |
|------|-----------|
| I1 | `017_intent_classification_events.sql`, schema, repository, service |
| I2 | `whatsapp.service.ts` integration (paths, outcomes) |
| I3 | Retry detection (`retry_within_60s`, `retry_of_event_id`) |
| I4 | `GET /intent-observability/kpis` |
| I5 | Review queue API + `misclass_score` |
| Tests | 3 unit spec files, 1 integration spec (12 tests total new) |
| Docs | 82 (context audit), 83 (implementation report), 84 (this doc) |

### Migrations on branch

| File | Status |
|------|--------|
| `015_whatsapp_webhook_dedup.sql` | In repo (may be on main via other PR) |
| `016_inventory_csv_stock_dedup.sql` | In repo |
| `017_intent_classification_events.sql` | **New in this commit** |

---

## Excluded (intentional)

| Path | Reason |
|------|--------|
| `**/.env`, `**/.env.local` | Gitignored secrets |
| `docs/docs_local/ml_hardening/e2e-discovery-raw.json` | Failed CLI error log |
| `docs/docs_local/supabase_migration/` | Out of PR scope |
| `docs/docs_local/zoho/` | Out of PR scope |
| `backend/.env.e2e*` | Removed; not in tree |
| `ENABLE_WEBHOOK_TEST_ROUTE` | Not committed |

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Migration 017 required at deploy | Medium | Run `npm run migrate` before backend start |
| `classification_stage` often null until I6 | Low | Intent/outcome still captured |
| Async persist may lose events on DB outage | Low | Fail-safe warn log; no user impact |
| Branch diverged from main | Medium | PR review + CI |
| Large doc surface (69–84) | Low | All under `docs_local/ml_hardening/` |

---

## Validation summary (pre-push)

| Suite | Result |
|-------|--------|
| Backend unit (`npm test`) | 86 suites, **399/399** PASS |
| Contract drift | **43/43** PASS |
| ML pytest | **106/106** PASS |
| Observability integration | **3/3** PASS |
| Migration 017 | Applied on dev DB; 0 pending |

---

## PR recommendation

**Approve for review** — no merge until CI + human review. Do not deploy without migration 017.
