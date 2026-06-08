# Final Sign-Off — Procurement CTA Fix

**Date:** 2026-06-07  
**Investigation confidence addressed:** Root cause (parser order + missing title fallback)  
**Push / merge / deploy:** **NOT DONE** (per instruction)

---

## 1. Code change summary

| Phase | Delivered |
|-------|-----------|
| 1 Parser hardening | `button_reply.id` preferred over `data.text` |
| 2 Routing | PR command + title CTA gates before ML; `routeMlFallback()` extracted |
| 3 Context cache | `low_stock_alert_contexts` + `LowStockAlertContextService` |
| 4 Title fallback | `Purchase karein` / `Create Order` / `Purchase` + disambiguation |
| 5 Workflow preservation | No workflow/approval/vendor/schema changes |
| 6 Integration tests | `procurement-cta-bridge.integration.spec.ts` (A–F + UAT) |
| 7 UAT simulation | Spec written; live run pending DB |
| 8 Regression | Unit suites PASS |

---

## 2. Integration test results

| Category | Result |
|----------|--------|
| Unit (parser, constants, workflow, prefill) | **57/57 PASS** (21 parser/constants + 36 regression) |
| Integration (DB-backed) | **NOT VERIFIED** — Postgres unavailable locally |
| `tsc --noEmit` | **PASS** |

Scenario **C** verified at unit level. Scenarios **A, B, D, E, F, UAT** require Postgres + migration `014`.

---

## 3. WhatsApp UAT results

| Step | Status |
|------|--------|
| Low stock threshold crossed | Spec only |
| Alert sent + context saved | Spec only |
| Purchase karein → prefill | Spec only |
| YES → PR created | Spec only |

**Live staging UAT:** Pending deployment + migration.

---

## 4. Remaining risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Migration `014` not applied before deploy | High | Run `apply-migrations.mjs` on staging first |
| Integration tests not run on CI DB | Medium | Run `test:integration` post-migration |
| Numeric disambiguation vs unrelated `1`/`2` messages | Low | Only when 2+ active contexts |
| Context TTL 24h — stale tap after expiry | Low | User sees expiry message |
| Olli new payload shape | Low | Parser still falls back to title + context |
| `recordAlertContext` only on successful send | Low | Failed send = no context (correct) |

---

## 5. Deployment recommendation

1. **Migrate:** `backend/migrations/014_low_stock_alert_context.sql`
2. **Deploy:** Backend only; branch with this fix (do not merge to main until UAT passes)
3. **Smoke test:** One real low-stock event → tap `Purchase karein` → YES
4. **Monitor:** Railway logs — confirm no `ml-classify` for CTA taps; look for `workflow_start` / prefill outbound
5. **Rollback:** Revert backend; table is additive (safe to leave empty)

---

## Sign-off checklist

- [x] Parser prefers `button_reply.id`
- [x] PR routing before ML
- [x] Context cache on alert send
- [x] Title-only fallback + disambiguation
- [x] Workflow/approval/vendor untouched
- [x] Tests authored
- [x] Reports 01–08 generated
- [ ] Live integration tests (blocked: DB)
- [ ] Live WhatsApp UAT (blocked: deploy)
- [ ] Git push (explicitly excluded)

**Implementation status:** Ready for staging migration + UAT. Not production-ready until live integration and WhatsApp tap verified.
