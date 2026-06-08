# Phase 8 — Regression Report

## Interactive button backward compatibility

| Button family | Resolution path | Status |
|---------------|-----------------|--------|
| Team setup (`Google Form se add`, etc.) | `data.text` → `resolveInteractiveActionId` | Unchanged |
| Owner home (`Employee jodiyein`, etc.) | `data.text` → owner-home handler | Unchanged |
| Low stock `Purchase karein` | `button_reply.id` first; title → context | **Fixed** |

Parser reorder only affects payloads that include **both** `data.text` and `button_reply.id`. Title-only owner-home taps unchanged.

## Workflow regression

| Area | Test suite | Result |
|------|------------|--------|
| Workflow routing | `workflow-routing.spec.ts` | PASS |
| Workflow hardening | `workflow-hardening.spec.ts` | PASS |
| PR prefill helper | `purchase-request-prefill.helper.spec.ts` | PASS |

No changes to:

- `workflow.registry.ts` start commands
- Purchase request approval steps
- Vendor assignment flow
- `PURCHASE_REQUEST_*` workflow states

## WhatsApp feature areas (manual / existing test coverage)

| Feature | Risk | Notes |
|---------|------|-------|
| Owner Home | Low | Interactive id map untouched |
| Employee Add | Low | `HOME_ADD_EMPLOYEE` path unchanged |
| Google Form Add | Low | Retired message path unchanged |
| Inventory CSV Review | Low | Review confirm runs before new CTA gates |
| Inventory Import Confirm | Low | Same |
| Attendance | Low | ML path unchanged for non-CTA messages |
| Task Assignment | Low | NL task handler order preserved before ML |
| Manager Workflows | Low | Slash bypass unchanged |

## Numeric reply edge case

`1`, `2`, etc. are only interpreted as low-stock disambiguation when **multiple** active contexts exist for the phone. Single-context or no-context phones fall through to existing NL/ML behaviour.

## Risk: false-positive disambiguation

If a user has 2+ active low-stock alerts and sends a bare number for unrelated intent, the number may start a purchase workflow. Acceptable per spec (“do not guess” for CTA; explicit number = explicit selection).

## Automated regression run

```
npm test -- --testPathPattern="workflow-routing|workflow-hardening|whatsapp-inbound|whatsapp-interactive|purchase-request-prefill"
→ 36/36 PASS
```
