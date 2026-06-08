# Phase 8–9 — WhatsApp Readiness & Test Precheck

**Date:** 2026-06-08  
**Lookup endpoint:** `GET /users/by-phone?phone=<phone>`

---

## findByPhone() resolution

All 7 phones resolve correctly with factory link:

| Name | Phone | User ID | Role | Factory ID | findByPhone |
|------|-------|---------|------|------------|-------------|
| Divyansh | 918604856137 | 1 | OWNER | 1 | **PASS** |
| Ayush | 918447242034 | 2 | OWNER | 1 | **PASS** |
| Shantanu1 | 917452897444 | 3 | OWNER | 1 | **PASS** |
| Shantanu2 | 919456157007 | 4 | MANAGER | 1 | **PASS** |
| Debapratim Dey | 919958007208 | 5 | MANAGER | 1 | **PASS** |
| Prateek | 919566171444 | 6 | WORKER | 1 | **PASS** |
| Shantanu3 | 917983434418 | 7 | WORKER | 1 | **PASS** |

**Note:** `GET /users?phone=` does **not** filter by phone (returns paginated list). Correct endpoint is `/users/by-phone?phone=`.

---

## Phase 9 — Per-user precheck

| Name | Role | Phone | Factory linked? | Dept linked? | WhatsApp ready? | Onboarding sent? |
|------|------|-------|-----------------|--------------|-----------------|------------------|
| Divyansh | OWNER | 918604856137 | YES | n/a | YES | YES |
| Ayush | OWNER | 918447242034 | YES | n/a | YES | YES |
| Shantanu1 | OWNER | 917452897444 | YES | n/a | YES | YES |
| Shantanu2 | MANAGER | 919456157007 | YES | IT (head) | YES | YES |
| Debapratim Dey | MANAGER | 919958007208 | YES | Sales (head) | YES | YES |
| Prateek | WORKER | 919566171444 | YES | IT | YES | YES |
| Shantanu3 | WORKER | 917983434418 | YES | Sales | YES | YES |

---

## Live message testing readiness

| Requirement | Status |
|-------------|--------|
| User in `users` table | **7/7** |
| `factory_users` link with role | **7/7** |
| Phone matches webhook `from` format (`91XXXXXXXXXX`) | **7/7** |
| Departments for managers/workers | **4/4** (2 managers + 2 workers) |
| Inventory seeded | **No** (per instructions) |
| Tasks seeded | **No** (per instructions) |

**Verdict: WHATSAPP READY — YES**

All onboarded users can receive inbound WhatsApp messages and be resolved by `findByPhone()`.
