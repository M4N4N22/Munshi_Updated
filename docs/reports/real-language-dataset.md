# Real Language Dataset

**Date:** 2026-06-01  
**Purpose:** Pre-implementation intent audit baseline  
**Language:** Hindi, Hinglish, mixed, misspellings — **no slash commands**  
**Full machine-readable results:** `intent-audit-results.json` (385 rows)

---

## Dataset statistics

| Role | Phrases | Minimum required | Met? |
|------|---------|------------------|------|
| Owner | 114 | 100 | ✅ |
| Manager | 120 | 100 | ✅ |
| Worker | 95 | 100 | ⚠️ 95 (5 short — expand next sprint) |
| Vendor | 56 | 50 | ✅ |
| **Total** | **385** | — | — |

---

## Owner samples (114 phrases)

### Business discovery (18)
- mera business Sharma Packaging hai
- tell you about my business
- company setup karna hai
- import inventory list
- setup continue karo / onboarding continue karo

### Inventory (29)
- inventory status batao
- stock level dikhao
- invntry sttus batao *(misspelling)*
- naya inventory item add karo
- corrugated sheets ka stock kitna hai

### Vendor / procurement (28)
- naya vendor add karo
- Shree Packaging vendor register
- purchase request bana do
- 50 rolls packaging tape order
- packaging tape khatam hone wali hai order karo

### Reporting / ops (39)
- aaj attendance report dikhao
- active issues dikhao
- team members dikhao
- hello munshi / kaise ho

---

## Manager samples (120 phrases)

### Assign (34)
- rahul ko kaam do
- @vikas ye kaam karo
- anil ko dispatch ka kaam do

### Task ID operations (56)
- task 5 rahul ko do *(mgrassign)*
- task 12 ko sales department bhejo *(mgrtransfer)*
- task 8 reject karo ye hamare department ka kaam nahi hai
- task 22 main khud karunga

### Department routing (18)
- warehouse khali karo
- packaging section ka kaam karo
- server theek karo

### Worker onboarding (12)
- naya worker add karo
- karmchari add karna hai

---

## Worker samples (95 phrases)

### Attendance (30)
- aaj main present hoon
- main aa gaya
- aaj nahi aa paunga
- chutti chahiye

### Task lifecycle (46)
- task complete ho gaya / kaam ho gaya / done
- mera kaam dikhao
- task 5 update packing done

### Issues (19)
- machine kharab hai
- raw material nahi mil raha
- forklift breakdown hai

---

## Vendor samples (56 phrases)

All expected **NOT_SUPPORTED** (no vendor WhatsApp role):

- invoice bhej diya
- order confirm hai
- material kal bhejenge
- PO number 123 confirm
- delivery delayed hai kal tak
- rate negotiation continue

---

## Dataset design rules

1. Natural shop-floor / office Hindi — not translated English commands
2. Includes typos (`invntry sttus`)
3. Includes mixed English (`i am here today`, `PO number`)
4. Expected intent labeled by QA against `backend-llm-contract.md` + product intent
5. Vendor rows expect `general_chat` until vendor role exists

---

## How to reproduce classification run

```powershell
# Requires local ML on http://127.0.0.1:8000
# Results already captured in intent-audit-results.json

# Example single phrase:
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/classify?message=aaj%20main%20present%20hoon"
```

**Note:** Full batch re-run script was executed ephemerally during audit (not committed to repo per no-code-change rule).
