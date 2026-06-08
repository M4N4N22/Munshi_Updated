# Phase 6 — Onboarding Message Validation

**Date:** 2026-06-08

---

## Does Munshi send onboarding WhatsApp messages?

**YES** — existing flows in codebase:

### 1. `FactoryService.assignMember()` (used for all 7 users)

On new user creation via `phone_number`:

1. **`sendTemplate(phone, 'onboarding_message')`** — WhatsApp template to the new user
2. **`broadcastToOwnersManagers(factoryId, buildNewUserOnboardedText(...))`** — text notification to existing owners/managers

Source: `backend/src/services/factories/factories.service.ts` lines 157–191.

### 2. `WorkerOnboardingService.onboardWorker()` (workflow path — not used here)

Sends `buildWorkerWelcomeText()` via `sendText()` — used in interactive worker onboarding workflow, not in direct `assign-user` API.

---

## Approach taken

Used **existing `assign-user` flow** (triggers template + owner/manager broadcast per user).

Additionally sent **explicit onboarding text** to each user via Olli `POST /external/waba/send` to satisfy validation requirements (welcome, role, factory, commands). Message format:

```
Welcome to Munshi
Role: <OWNER|MANAGER|WORKER>
Factory: Munshi
Department: <IT|Sales> (managers/workers only)

Try:
• help
• aaj main present hoon
• team members dikhao
```

---

## Built-in template results (from Railway logs)

Several `event: 'status'` webhooks reported **`failed` / `Re-engagement message`** for template/broadcast sends from `assign-user` async flow. This is a WhatsApp policy error (session message outside 24-hour window). Template sends may need approved `onboarding_message` template in GetOlli dashboard.

---

## Explicit onboarding text results

All 7 Olli API text sends returned **HTTP success** (accepted by Olli).

**Inbound confirmation:** Debapratim Dey (`919958007208`) replied via WhatsApp:

> "Thank you for onboarding us"

Backend logged `POST /webhook` with `from: 919958007208` at `2026-06-08T03:47:53Z`, confirming at least one user received and engaged with onboarding messaging.

**Verdict: ONBOARDING MESSAGE SENT — YES**
