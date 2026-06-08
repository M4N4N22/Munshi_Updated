# Phase 2 — Purchase Workflow Routing

## Audit finding

`whatsapp.service.ts` routed unmatched messages to ML classify before any purchase-request-specific handling. Title-only `Purchase karein` never matched `matchWorkflowStartCommand()` and became `general_chat`.

## Changes

### Explicit purchase command gate

```typescript
} else if (workflowStartCmd || isPurchaseRequestWorkflowCommand(msgTrim)) {
  result = await this.workflowRouter.startWorkflowFromCommand(body.from, msgTrim);
```

`isPurchaseRequestWorkflowCommand()` is defensive redundancy — `matchWorkflowStartCommand()` already matches `/purchase_request_create?…`, but the explicit check documents intent and guards registry drift.

### Title-only CTA gate (before ML)

```typescript
} else if (isLowStockPurchaseCtaTitle(msgTrim)) {
  const ctaResolution = await this.lowStockAlertContext.resolveCtaTitle(body.from);
  // command → startWorkflowFromCommand
  // disambiguation / expired / none → user message, no ML
```

Matched titles: `Purchase karein`, `Create Order`, `Purchase` (case-insensitive).

### Numeric disambiguation (before ML)

When multiple active contexts exist and user replies `1`, `2`, etc.:

```typescript
const disambiguationCommand = /^\d+$/.test(msgTrim)
  ? await this.lowStockAlertContext.tryResolveDisambiguationSelection(...)
  : null;
```

Only resolves when **more than one** distinct active item exists for the phone.

### ML extraction

ML fallback logic moved to `routeMlFallback()` private method. `general_chat` returns `WA_OUTBOUND_ALREADY_SENT` to avoid double outbound.

## Routing order (no active workflow session)

1. Slash bypass (`/mgrself`, etc.)
2. `workflowStartCmd` / `isPurchaseRequestWorkflowCommand`
3. `isLowStockPurchaseCtaTitle` → context service
4. Numeric disambiguation (multi-alert only)
5. NL task inventory free-text
6. Direct slash parse
7. ML classify (`routeMlFallback`)

## Regression

`workflow-routing.spec.ts` and `workflow-hardening.spec.ts` — **PASS** (no changes to workflow engine).
