# Phase 9 — Test Coverage Audit

**Branch:** `Shantanu`  
**Audit date:** 2026-06-07  

---

## Execution summary (this audit)

| Suite | Command | Result |
|-------|---------|--------|
| Backend unit | `yarn test` | **FAIL** — 2/74 suites, 337/338 tests pass |
| Backend contract | `yarn test -- contract-drift` | **PASS** — 39 tests |
| Backend integration | Not run (requires Postgres) | 17 spec files exist |
| ML | `PYTHONPATH=ml pytest` | **PASS** — 56 tests |
| ML (default) | `pytest` | **FAIL** — PYTHONPATH not configured |
| Web | `npm test` | **PASS** — 4 tests |

---

## Phase 0 — Task ↔ inventory foundation

| Area | Status | Evidence |
|------|--------|----------|
| Schema / models | **Tested** | Static validation docs |
| Integration | **Tested** | `task-inventory-phase0.integration.spec.ts` — 12 scenarios |
| Live acceptance | **Tested** | `99-phase0-acceptance-test.md` |
| CI gate | **Partially tested** | `inventory-integration.yml` runs Phase 0 only on `main` |

**Gaps:** OLLI outbound delivery not verified without live `OLLI_KEY`.

---

## Phase 1 — CSV import / WhatsApp inventory

| Area | Status | Evidence |
|------|--------|----------|
| Parser unit tests | **Tested** | 11 unit tests per signoff |
| REST upload | **Tested** | `inventory-csv-upload.integration.spec.ts` |
| WhatsApp CSV | **Tested** | `inventory-csv-whatsapp.integration.spec.ts` |
| Import pipeline | **Tested** | `inventory-csv-import.integration.spec.ts` |
| CI gate | **Untested** | Not in default `cicd.yml` |

---

## Phase 2 — Zoho integration

| Area | Status | Evidence |
|------|--------|----------|
| OAuth flow | **Tested** | `zoho-oauth.integration.spec.ts` |
| Pull sync | **Tested** | `zoho-pull-sync.integration.spec.ts` |
| Scheduled sync | **Tested** | `zoho-scheduled-sync.integration.spec.ts` |
| Stock push | **Tested** | `zoho-stock-push-handler.integration.spec.ts`, events, retry |
| Idempotency | **Tested** | `push-idempotency.integration.spec.ts` |
| Unit (crypto, state) | **Tested** | `token-crypto`, `zoho-oauth-state` specs |
| CI gate | **Untested** | Integration suite not in CI |

**Aggregate:** 92/92 integration tests documented in Phase 2 signoff.

---

## Phase 3 — Alerts & domain events

| Sub-phase | Unit | Integration |
|-----------|------|-------------|
| 3.1 Low stock alert | **Tested** (9 unit) | **Tested** |
| 3.2 Sync failure alert | Partial | **Tested** |
| 3.3 Manager alert | Untested unit | **Tested** |
| 3.4 PR prefill | Partial | **Tested** |

**Aggregate:** 115/115 integration per UAT signoff.

---

## Phase 4 — NL task-inventory & contracts

| Sub-phase | Unit | Integration |
|-----------|------|-------------|
| 4.1 ML extraction | **Tested** (pytest) | **Untested** |
| 4.2 Resolver | **Tested** (20 Jest) | **Untested** |
| 4.3 NL workflow | **Tested** (23 Jest) | **Untested** |
| 4.4 Contract drift | **Tested** (39 Jest + 5 ML) | **Untested** |

**Gaps:**

- No Postgres integration tests for Phase 4 NL workflow end-to-end
- Contract drift not in CI
- `workflow.registry.spec.ts` **broken** (stale constructor)
- `workflow-hardening.spec.ts` **failing**

---

## Coverage classification matrix

| Phase | Tested | Partially tested | Untested |
|-------|--------|------------------|----------|
| 0 | Schema, integration, acceptance | OLLI live delivery | — |
| 1 | Parser, REST, WhatsApp CSV | CI automation | — |
| 2 | Full integration stack | CI automation | Live Zoho sandbox |
| 3 | Alerts, prefill integration | Some unit coverage | — |
| 4 | Unit + contract drift | — | E2E integration, CI gate |

---

## CI vs local test gaps

| Gap | Impact |
|-----|--------|
| `yarn test` failures on `Shantanu` | Merge would ship broken test suite |
| 17 integration specs not in `cicd.yml` | Regressions undetected until manual run |
| ML pytest not in CI | Parser/classify regressions undetected |
| Web vitest (4 tests) not in CI | Minimal frontend coverage |
| `pytest` without PYTHONPATH fails | Developer onboarding friction |

---

## Recommendations (audit only — not implemented)

1. Fix `workflow.registry.spec.ts` and `workflow-hardening.spec.ts` before merge
2. Add `pytest.ini` with `pythonpath = .` for ML
3. Extend CI with contract-drift + ML pytest jobs
4. Add Phase 4 integration harness before production NL rollout
