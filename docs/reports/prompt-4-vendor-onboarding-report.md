# Prompt 4 — Vendor Onboarding Workflow Report

**Date:** 2026-05-29  
**Status:** Complete

---

## 1. Overview

Vendor onboarding is the **first workflow** registered in the Workflow Engine. It collects vendor details over WhatsApp and creates a vendor via **`VendorService.createVendor()`** from Prompt 3 — no duplicated business logic.

**Entry command:** `/onboard_vendor`

---

## 2. Entry paths

| Path | Flow |
|------|------|
| Natural language | User: "Add a vendor" → ML → `/onboard_vendor` → Workflow Engine |
| Direct slash | User: `/onboard_vendor` → Workflow Engine (bypasses ML) |
| processCommand fallback | If ML routes `/onboard_vendor` inside `processCommand`, delegates to router |

---

## 3. Conversation steps

| Step | ID | Prompt | Validation |
|------|-----|--------|------------|
| 1 | `VENDOR_NAME` | What is the vendor name? | `normalizeVendorName()` |
| 2 | `VENDOR_PHONE` | What is the vendor phone number? | `normalizeVendorPhone()` |
| 3 | `VENDOR_GST` | GST number? Reply SKIP if unavailable. | `normalizeVendorGst()` or skip |
| 4 | `VENDOR_ADDRESS` | Address? Reply SKIP if unavailable. | `normalizeVendorAddress()` or skip |
| 5 | (implicit) | — | `VendorService.createVendor()` |

**Skip keywords:** `skip`, `none`, `na`, `n/a` (case-insensitive)

---

## 4. Example conversation

```text
User: /onboard_vendor
Munshi: Vendor onboarding — What is the vendor name?

User: ABC Steel
Munshi: What is the vendor phone number?

User: 9876543210
Munshi: What is the GST number? Reply SKIP if unavailable.

User: SKIP
Munshi: What is the address? Reply SKIP if unavailable.

User: Delhi
Munshi: Vendor created successfully — ABC Steel has been added...
```

---

## 5. Authorization

Only **OWNER** and **MANAGER** roles may start or continue vendor onboarding. **WORKER** receives `ForbiddenException`.

Enforced in `WorkflowRouterService.ensureCanRunWorkflow()`.

---

## 6. Error handling

| Error | Behavior |
|-------|----------|
| Invalid name/phone/GST/address | Re-prompt same step with validation message |
| Duplicate vendor name | Rewind to name step |
| Duplicate phone | Rewind to phone step |
| Other create errors | Show error, stay on address step |
| Unknown workflow step | Cancel session, ask user to restart |

All validation reuses Prompt 3 helpers in `vendors.validation.ts`.

---

## 7. Implementation file

`src/services/workflow/handlers/vendor-onboarding.handler.ts`

Key dependencies:

- `VendorService.createVendor()` — business logic
- `normalizeVendorName`, `normalizeVendorPhone`, `normalizeVendorGst`, `normalizeVendorAddress` — validation
- `waSection()` — consistent WhatsApp formatting

---

## 8. Test coverage

`vendor-onboarding.handler.spec.ts` — **8 tests**

| Test | Scenario |
|------|----------|
| Happy path | Full 4-step flow → vendor created |
| Invalid phone | Re-prompt phone step |
| Invalid GST | Re-prompt GST step |
| Skip GST | Proceeds to address |
| Skip address | Creates vendor without address |
| Duplicate name | Rewinds to name step |
| Duplicate phone | Rewinds to phone step |
| Invalid name | Re-prompt name step |

---

## 9. What was NOT implemented (by design)

- Worker/manager onboarding workflows
- Vendor role assignment
- Vendor authentication
- Procurement or quotation flows
- `/cancel` workflow command (deferred)

---

## 10. REST API parity

Vendor onboarding via WhatsApp creates the same records as `POST /vendors`. REST CRUD from Prompt 3 remains unchanged.

---

*See also: [prompt-4-workflow-engine-report.md](./prompt-4-workflow-engine-report.md), [prompt-3-vendor-management-report.md](./prompt-3-vendor-management-report.md)*
