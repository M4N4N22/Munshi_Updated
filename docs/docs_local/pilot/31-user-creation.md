# Phase 3–4 — User Creation & Factory Linking

**Date:** 2026-06-08  
**Factory:** Munshi (ID `1`)  
**Method:** `POST /factories/assign-user`

---

## Users created

| User ID | Name | Phone (stored) | Role | Factory User ID |
|---------|------|----------------|------|-----------------|
| 1 | Divyansh | `918604856137` | OWNER | 1 |
| 2 | Ayush | `918447242034` | OWNER | 2 |
| 3 | Shantanu1 | `917452897444` | OWNER | 3 |
| 4 | Shantanu2 | `919456157007` | MANAGER | 4 |
| 5 | Debapratim Dey | `919958007208` | MANAGER | 5 |
| 6 | Prateek | `919566171444` | WORKER | 6 |
| 7 | Shantanu3 | `917983434418` | WORKER | 7 |

**Input → stored mapping:**

| Provided | Stored |
|----------|--------|
| 8604856137 | 918604856137 |
| 8447242034 | 918447242034 |
| 7452897444 | 917452897444 |
| 9456157007 | 919456157007 |
| 9958007208 | 919958007208 |
| 9566171444 | 919566171444 |
| 7983434418 | 917983434418 |

---

## Verification

`GET /factories/1/users` → **7 members**, all linked to factory_id `1`.

`GET /users/by-phone?phone=<phone>` → resolves user + `factory_links.role` + `factory_links.factory_id` for all 7 numbers.

**Constraints satisfied:**

- One `factory_users` row per user (unique `user_id`)
- Roles match specification
- No duplicate phones

**Verdict: USERS CREATED — YES**
