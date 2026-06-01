# Vendor Experience Report — ABC Paper Traders, Shree Packaging, Om Industrial

**Rating: 2 / 10**

---

## Scope clarification

**Vendors are not WhatsApp users** in the current Munshi implementation. There is no vendor login, vendor chat role, or supplier-facing interface. "Vendor operations" means **owner/manager actions on vendor master data**.

This is a **product gap** relative to the simulation brief, not a test failure alone.

---

## Owner-initiated vendor flows (natural language)

| Message | Expected | Prod ML | Result |
|---------|----------|---------|--------|
| "naya vendor ABC Paper Traders add karo" | `/onboard_vendor` → onboarding workflow | `/depart_assign` | **FAIL** |
| "Shree Packaging Supplies ka number kya hai" | Vendor lookup / search | `general_chat` | **FAIL** |

Owner cannot start vendor onboarding or retrieve vendor contact info via natural language on production ML.

---

## Backend state (factory 3)

- 1 vendor in master: `Runtime Test Vendor` (919876543210)
- Sharma scenario vendors (ABC Paper, Shree Packaging, Om Industrial) **not present**
- `GET /vendors/search` exists but **no NL path** reached it in simulation

---

## What works (API layer, not customer path)

- Vendor CRUD via REST
- Vendor onboarding **workflow handler** exists in backend
- Local LLM pre-classifier correctly maps "naya vendor add karo" → `/onboard_vendor`

---

## Friction points

1. **No vendor self-service** — suppliers cannot confirm orders, send invoices, or update catalog via Munshi chat.
2. **Owner NL onboarding broken** on production ML.
3. **"Vendor list dikhao"** classified as `/members` — shows employees, not suppliers.
4. No discovery contribution tested from vendor list document upload.

---

## Rating rationale

**2/10** — Vendor master exists in backend; customer-facing vendor experience is effectively **absent**. Owner cannot onboard or query vendors via natural language today.

---

## LOCAL VALIDATION RESULTS

| Message | Local ML | Prod ML (webhook) | Vendors after story |
|---------|----------|-------------------|---------------------|
| naya vendor ABC Paper Traders add karo | `/onboard_vendor` | `/depart_assign` | **1** (unchanged) |
| Shree Packaging Supplies ka number kya hai | not re-run HTTP | `general_chat` (prod QA) | N/A |

**Local ML** correctly starts vendor onboarding intent. **Webhook (prod ML)** misroutes to department task — vendor not created.

No vendor WhatsApp role exists locally or in prod — **product limitation**, not environment.

### Local vendor rating: **3/10**

Intent correct on local ML; execution blocked by prod ML in default webhook path. No vendor records created in continuous story.
