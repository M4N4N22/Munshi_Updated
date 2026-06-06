# Phase 3.4 — Purchase Request Prefill Risk Review

**Run date:** 2026-06-06

---

## Risk Summary

| Risk | Severity | Mitigation | Residual |
|------|----------|------------|----------|
| Auto PR creation from alert | **High** | CTA only starts workflow; PR created on explicit YES | **Low** |
| Bypass approval | **High** | Same `APPROVAL` step; no code path change | **Low** |
| Inventory side effects | **High** | Prefill is read-only; no transaction service calls | **Low** |
| Wrong item prefill | Medium | `findItem(id, factoryId)` scoped to user factory | **Low** |
| Stale qty after alert | Medium | User can edit quantity before YES | **Low** |
| Confusion with suggestion API | Medium | Docs + no call to `createFromSuggestion` from alert | **Low** |

---

## Out of Scope (Not Introduced)

- Purchase request auto-creation
- Dispatch registry refactor
- New inventory threshold logic
- New approval workflow
- Phase 4 / Phase 5 features

---

## Command Parsing Edge Cases

| Input | Behavior |
|-------|----------|
| `/purchase_request_create?itemId=999` (invalid) | Falls back to manual workflow |
| `/purchase_request_create` | Manual flow (unchanged) |
| `/purchase_request_create?itemId=abc` | Ignored → manual flow |
| Item in another factory | `buildLowStockPrefill` returns null → manual flow |

---

## Operational Notes

1. **WhatsApp copy-paste:** Users must send full command including query string.
2. **Web UI:** `GET prefill/low-stock` ready for future form pre-population.
3. **Suggestion endpoint:** `POST from-suggestion` still auto-creates — keep separate from alert CTA in ops docs.

---

## Sign-Off

| Criterion | Status |
|-----------|--------|
| Contextual CTA in alert | **Met** |
| Form prefilled via workflow session | **Met** |
| No auto PR | **Met** |
| Approval unchanged | **Met** |
| No inventory logic changes | **Met** |
| Full regression | **Met** (115/115) |

**Phase 3.4 risk review:** **ACCEPTED**
