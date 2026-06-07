# UAT — Owner Experience

**Role:** Factory Owner  
**Run date:** 2026-06-06  
**Factory:** ABC Manufacturing  

---

## Journey: New Business Starts Using Munshi

### OTP verification — **PASS**

| Step | Result |
|------|--------|
| Send OTP `POST /onboarding/otp/send` | **PASS** (201) |
| Dev OTP returned in non-production | **PASS** |
| Verify OTP `POST /onboarding/otp/verify` | **PASS** |

**Business view:** Owner receives a code on phone and can verify without developer help.

---

### Factory creation — **PASS**

| Step | Result |
|------|--------|
| Register with factory name "ABC Manufacturing" | **PASS** |
| Owner user + factory link created | **PASS** (factory_id 2010) |

---

### Department creation — **PASS**

| Department | Result |
|------------|--------|
| Production | **PASS** |
| Inventory | **PASS** |
| Procurement | **PASS** |
| Operations | **PASS** |

Requires manager assignment per department (slug + `manager_user_id`).

---

### Team setup — **PASS**

| Role | Count | Result |
|------|-------|--------|
| Managers | 2 | **PASS** |
| Workers | 3 | **PASS** |
| Inventory lead (Manager role) | 1 | **PASS** |
| Vendor lead (Manager role) | 1 | **PASS** |

**Note:** Dedicated "Inventory Manager" and "Vendor Coordinator" roles do not exist in the product — mapped to **MANAGER** (see defect UAT-D-08).

---

### Owner access & home dashboard — **PASS**

| Check | Result |
|-------|--------|
| Owner sends greeting via WhatsApp test webhook | **PASS** (201) |
| Owner receives home/readiness-oriented response | **PASS** |
| `/help` command | **PASS** (201) |

---

### Navigation clarity — **PARTIAL**

| Check | Result |
|-------|--------|
| `/help` lists command hints | **PASS** |
| Interactive owner menu (readiness-driven) | **PASS** (WhatsApp) |
| Web dashboard for inventory | **N/A** — WhatsApp-first by design |

---

## Journey: Zoho Enablement (Owner)

| Step | Result |
|------|--------|
| List connections `GET /integrations/connections` | **PASS** |
| Start OAuth `GET /integrations/zoho/authorize` | **FAIL** — 500 (OAuth env not configured) |

**Business view:** Owner can see integration status endpoint but cannot complete live Zoho connect without DevOps configuring `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REDIRECT_URI`.

---

## Morning Simulation (Business Day)

| Activity | Result |
|----------|--------|
| Review team via `/members` | **PASS** |
| Check inventory via `/inventory_status SKU` | **PASS** |
| Mark attendance (worker proxy) | **PASS** |

---

## Scenario Group Verdict

| Group | Result |
|-------|--------|
| 1 — Owner onboarding | **PASS** |
| 2 — Team onboarding | **PASS** |
| 12 — Zoho connection | **PARTIAL** |

---

## Owner Pain Points

1. Zoho OAuth cannot be completed in UAT without credentials.  
2. No web-based owner dashboard — acceptable for WhatsApp-first positioning but limits visibility for non-WhatsApp users.  
3. REST endpoints accept `factory_id` without proving caller identity — security risk if API is public.
