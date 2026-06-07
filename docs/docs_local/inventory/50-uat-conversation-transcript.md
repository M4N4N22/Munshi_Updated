# UAT Conversation Transcript — ABC Manufacturing × Munshi

**Run date:** 2026-06-06  
**Factory:** ABC Manufacturing  
**Format:** Simulated business-user interactions via WhatsApp test webhook + onboarding API  
**Note:** Messages reflect actual system responses where live-tested; other journeys from UAT 49 + 7A evidence.

---

## 1. Owner Onboarding

**Actor:** Owner (Raj)

**Message:** *(system sends OTP)*

**Munshi:** Your Munshi verification code is ******. Valid for 10 minutes.

**Message:** *(OTP verified via app)*

**Munshi:** Registration complete. Welcome to ABC Manufacturing.

---

## 2. Owner Home

**Actor:** Owner

**Message:** hi

**Munshi:** Welcome back, Raj. Here's your business readiness snapshot… *(owner home menu with inventory/task hints)*

---

## 3. Team Setup

**Actor:** Owner

**Message:** /members

**Munshi:** Active members: Priya (Manager), Amit (Manager), Worker One, Worker Two… *(member list)*

---

## 4. Worker Onboarding Start

**Actor:** Owner

**Message:** /onboard_worker

**Munshi:** Worker onboarding shuru. Pehle worker ka naam bhejein.

**Actor:** Owner

**Message:** Ravi Kumar

**Munshi:** Worker ka phone number bhejein (10 digit)…

*(workflow continues — name, phone, department, role, DOJ)*

---

## 5. Worker First Day

**Actor:** Worker (Ravi)

**Message:** /help

**Munshi:** Commands: /tasks, /complete [id], /present, /absent, /update…

**Actor:** Worker

**Message:** /present

**Munshi:** Attendance marked successfully.

**Actor:** Worker

**Message:** /tasks

**Munshi:** Your tasks: #512 — Clean production floor *(assigned list)*

---

## 6. Task Assignment & Completion

**Actor:** Owner

**Message:** /assign_delivery @1 CEM-001 5

**Munshi:** Task assigned to Worker One: Deliver 5 × Cement 50kg Bag (CEM-001).

**Actor:** Worker

**Message:** /complete 512

**Munshi:** Task #512 complete. Stock updated: Cement 50kg Bag 120 → 115 bags.

---

## 7. Attendance

**Actor:** Worker

**Message:** /present

**Munshi:** Attendance marked successfully.

---

## 8. CSV Inventory Import (WhatsApp)

**Actor:** Owner

**Message:** /inventory_import_csv

**Munshi:** CSV file bhejein. Template: *munshi-inventory-template.csv*

**Actor:** Owner  
*(attaches baseline-a-clean.csv)*

**Munshi:** Import summary: Added 12, Failed 0, Skipped 0. CEM-001, STL-012, PVC-002…

---

## 9. Inventory Status

**Actor:** Owner

**Message:** /inventory_status CEM-001

**Munshi:**  
**Current Stock**  
Item: Cement 50kg Bag  
SKU: CEM-001  
Available: 120 bags  
Reorder level: 50 bags

---

## 10. Document Parsing — Upload & Review (REST + WhatsApp approval)

**Actor:** Owner  
*(uploads doc-a-clean-supplier-inventory.csv via web/API — Document #12)*

**Munshi:** *(workflow triggered)*  
A document suggestion is ready for your review.  
**Initial inventory import:** 12 items detected (Cement, Steel Rod, PVC Pipe…).  
Reply **YES** to create inventory or **NO** to reject.

**Actor:** Owner

**Message:** YES

**Munshi:** *(inventory created — 12 items; confirmation message may fail if messaging auth down)*

**Actor:** Owner

**Message:** /inventory_status STL-012

**Munshi:**  
Item: Steel Rod 12mm  
Available: 450 kg

---

## 11. Document Parsing — Duplicate Sheet (Document B)

**Actor:** Owner  
*(uploads doc-b-duplicate-items.csv)*

**Munshi:** Initial inventory import: **5 items** detected. Reply YES or NO.

**Actor:** Owner

**Message:** YES

**Munshi:** *(creates 2 items only — CEM-001 qty 50, STL-012 qty 100; PVC not created)*

**Actor:** Owner

**Message:** /inventory_status PVC-002

**Munshi:** Item not found / no stock for SKU PVC-002.

---

## 12. Low Stock Alert

**Actor:** System  
*(stock falls below threshold after task consumption)*

**Munshi:** ⚠️ *Cement 50kg Bag* kam ho gaya — ab sirf *8* bache (limit: 10).  
Purchase request banayein? Reply */purchase_request_create?itemId=1467*

---

## 13. Purchase Request Prefill

**Actor:** Owner

**Message:** /purchase_request_create?itemId=1467

**Munshi:** Purchase request preview:  
Item: Cement 50kg Bag (CEM-001)  
Suggested qty: 20 bags  
Current: 8 | Reorder: 10  
Reply **YES** to submit for approval.

**Actor:** Owner

**Message:** YES

**Munshi:** Purchase request PR-2042-… submitted for approval.

---

## 14. Purchase Request Approval

**Actor:** Owner

**Message:** *(approves via workflow)*

**Munshi:** Purchase request approved. Assign vendor? …

---

## 15. Manager Actions

**Actor:** Manager (Priya)

**Message:** /help

**Munshi:** Commands include /mgrassign, /mgrtransfer, /inventory_status…

**Actor:** Manager

**Message:** /issues

**Munshi:** Active issues: *(list or none)*

---

## 16. Zoho Integration Attempt

**Actor:** Owner  
*(opens Zoho connect in web)*

**Munshi:** *(OAuth env not configured — error page)*  
Connections list: empty.

**Actor:** Owner

**Message:** *(manual sync attempt via API)*

**Munshi:** No active Zoho connection for this factory.

---

## 17. Sync Failure Alert (simulated)

**Actor:** System

**Munshi:** ⚠️ Zoho sync fail ho gaya. Dobara connect karein ya support se baat karein. *(owner + manager notified — integration test evidence)*

---

## 18. Error Recovery — Invalid Command

**Actor:** Worker

**Message:** /complete 99999

**Munshi:** Task not found or not assigned to you.

---

## 19. Error Recovery — Insufficient Stock

**Actor:** Worker

**Message:** /complete 518

**Munshi:** Stock kam hai — pehle manager se confirm karein. Task incomplete.

---

## 20. Workflow Cancel

**Actor:** Owner  
*(mid purchase request workflow)*

**Message:** /cancel

**Munshi:** Active workflow cancelled. Send /purchase_request_create to start again.

---

## 21. Document Failure — Empty File

**Actor:** Owner  
*(uploads empty CSV)*

**Munshi:** Upload rejected — file is empty or invalid.

---

## 22. WhatsApp Document Limitation

**Actor:** Owner  
*(sends supplier CSV without /inventory_import_csv)*

**Munshi:** File received. Inventory CSV import ke liye owner/manager account se *CSV file* bhejein.  
Ya pehle */inventory_import_csv* likhein, phir file attach karein.

*(Document parsing suggestion workflow NOT started from WhatsApp.)*

---

## Transcript Coverage Checklist

| Journey | Represented |
|---------|-------------|
| Owner onboarding | Yes |
| Worker onboarding | Yes |
| Task create/assign/complete | Yes |
| Attendance | Yes |
| Inventory create (document) | Yes |
| CSV import | Yes |
| Document parsing + approval | Yes |
| Inventory status | Yes |
| Low stock alerts | Yes |
| Purchase requests + prefill | Yes |
| Manager actions | Yes |
| Zoho flows | Yes |
| Error handling | Yes |
| Recovery / cancel | Yes |
| WhatsApp commands | Yes |

---

## Actors

| Role | Phone pattern |
|------|---------------|
| Owner | 919810000099, 919800000601–606 |
| Manager | 919900000002 |
| Worker | 919900000004, 919810000024 |

*(Test phones from UAT runs; not production numbers.)*
