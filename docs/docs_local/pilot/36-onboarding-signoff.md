# Onboarding Signoff — Munshi Staging

**Date:** 2026-06-08  
**Environment:** munshi-staging  
**Backend:** https://backend-production-41504.up.railway.app

---

## Final verdict

| Question | Answer |
|----------|--------|
| **FACTORY CREATED** | **YES** |
| **USERS CREATED** | **YES** |
| **WHATSAPP READY** | **YES** |
| **ONBOARDING MESSAGE SENT** | **YES** |

---

## IDs

| Resource | ID |
|----------|-----|
| Factory (Munshi) | **1** |
| Department IT | **1** |
| Department Sales | **2** |

### User IDs

| ID | Name | Role |
|----|------|------|
| 1 | Divyansh | OWNER |
| 2 | Ayush | OWNER |
| 3 | Shantanu1 | OWNER |
| 4 | Shantanu2 | MANAGER |
| 5 | Debapratim Dey | MANAGER |
| 6 | Prateek | WORKER |
| 7 | Shantanu3 | WORKER |

---

## Outbound message summary

- **7/7** explicit onboarding text messages accepted by Olli API
- **3+** delivery confirmations via WhatsApp status webhooks (`delivered`)
- **1** inbound reply confirming onboarding received (Debapratim Dey)
- Built-in `assign-user` template/broadcast: some `Re-engagement message` failures on async template sends (non-blocking for session text onboarding)

---

## Blockers encountered

| Blocker | Severity | Notes |
|---------|----------|-------|
| `onboarding_message` template / broadcast `Re-engagement message` | Low | WhatsApp policy on some async template/broadcast sends from `assign-user`; explicit text onboarding succeeded |
| `GET /users?phone=` does not filter by phone | Info | Use `/users/by-phone?phone=` for lookups |
| No inventory / tasks | Expected | Per instructions — not created |

---

## Not performed (per instructions)

- Inventory creation
- Task creation
- Messages beyond onboarding

---

## Stop condition

Onboarding complete. Staging factory **Munshi** is live with 7 real users, 2 departments, and WhatsApp inbound/outbound validated.
