# Phase 7 — Outbound WhatsApp Validation

**Date:** 2026-06-08  
**Channel:** Olli → `POST https://api.getolliai.com/api/v1/external/waba/send`  
**Backend env:** `OLLI_KEY` + `OLLI_URL` configured on Railway

---

## Per-user outbound results (explicit onboarding text)

| Name | Phone | Role | Attempted | Olli accepted | WhatsApp delivery (status webhooks) | Errors |
|------|-------|------|-----------|---------------|-------------------------------------|--------|
| Divyansh | 918604856137 | OWNER | YES | YES | Not individually confirmed in logs | None from Olli API |
| Ayush | 918447242034 | OWNER | YES | YES | Not individually confirmed | None from Olli API |
| Shantanu1 | 917452897444 | OWNER | YES | YES | Not individually confirmed | None from Olli API |
| Shantanu2 | 919456157007 | MANAGER | YES | YES | `sent` + `delivered` (03:48:02Z) | None |
| Debapratim Dey | 919958007208 | MANAGER | YES | YES | User replied confirming receipt; template broadcast `failed` (Re-engagement) | Template broadcast only |
| Prateek | 919566171444 | WORKER | YES | YES | `delivered` (03:47:20Z) | Template broadcast `failed` (Re-engagement) |
| Shantanu3 | 917983434418 | WORKER | YES | YES | `sent` + `delivered` (03:47:18–19Z) | None |

---

## Built-in `assign-user` async messaging (per user at creation)

Each `POST /factories/assign-user` triggered:

| Message type | Recipient | Notes |
|--------------|-----------|-------|
| Template `onboarding_message` | New user | May fail if template not approved in GetOlli |
| `buildNewUserOnboardedText` broadcast | Existing owners/managers | Some `Re-engagement message` failures in status webhooks |

---

## Delivery evidence (Railway deploy logs)

**Confirmed delivered:**

- `917983434418` (Shantanu3) — status `sent` → `delivered`
- `919566171444` (Prateek) — status `delivered`
- `919456157007` (Shantanu2) — status `sent` → `delivered`

**Confirmed engagement:**

- `919958007208` (Debapratim) — inbound reply: "Thank you for onboarding us"

**Template/broadcast failures observed:**

- Multiple `status: failed`, `error: Re-engagement message` — affects built-in template/broadcast path, not blocking explicit onboarding text acceptance

---

## Pipeline verdict

| Stage | Status |
|-------|--------|
| Munshi → Olli API | **Working** — all 7 sends accepted |
| Olli → WhatsApp | **Working** — delivery confirmed for 3+ users; 1 inbound reply |
| WhatsApp → Munshi webhook | **Working** — inbound from Debapratim processed |

**No Olli API errors on explicit onboarding sends.**
