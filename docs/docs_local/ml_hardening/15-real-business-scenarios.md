# Phase 1 — Real Business Scenarios

Scenarios by capability for Indian SMB contexts: **factory, manufacturer, trader, distributor, workshop**.

---

## 1. Attendance Management

| # | Business type | Scenario |
|---|---------------|----------|
| A1 | Workshop | 12 welders mark present from shop floor before foreman arrives |
| A2 | Distributor | Delivery staff send "absent" when van breaks down |
| A3 | Manufacturer | Night-shift workers mark present at gate — owner verifies via `/report` next day |

---

## 2. Attendance Reporting

| # | Business type | Scenario |
|---|---------------|----------|
| R1 | Factory | Owner runs `/report` on 1st of month for payroll contractor |
| R2 | Trader | Manager checks who was absent during festival week |

---

## 3. Task Visibility

| # | Business type | Scenario |
|---|---------------|----------|
| T1 | Workshop | Worker asks "mere tasks" before starting lathe job |
| T2 | Manufacturer | Owner `/tasks` to see pending items across cutting, welding, packing |
| T3 | Distributor | Manager checks if pick-list tasks assigned for today's routes |

---

## 4. Task Execution

| # | Business type | Scenario |
|---|---------------|----------|
| E1 | Factory | Worker `/complete 22` after finishing machine maintenance |
| E2 | Workshop | Apprentice `/update 9` "waiting for supervisor sign-off" |
| E3 | Manufacturer | Completing delivery task auto-deducts finished goods from stock |

---

## 5. Task Delegation

| # | Business type | Scenario |
|---|---------------|----------|
| D1 | Factory | Owner: "assign @suresh paint booth clean by Friday" |
| D2 | Trader | Owner: "sales team ko follow up karo" → `/depart_assign sales` |
| D3 | Workshop | Owner says "ye kaam karwa do" without naming person → `/assign_clarify` |
| D4 | Distributor | Owner assigns @all for warehouse sweep before audit |

---

## 6. Stock-Linked Operations

| # | Business type | Scenario |
|---|---------------|----------|
| S1 | Manufacturer | "Deliver 200 bolts SKU-BOLT-M8 to customer" → `/assign_delivery` |
| S2 | Distributor | "Ram ko 50 carton dispatch karo" → `/task_inventory_nl` |
| S3 | Trader | Count stock task: "store room mein SKU-TEA-1kg count karo" |
| S4 | Factory | Issue materials to line: task ties consumption to inventory record |

---

## 7. Manager Task Coordination

| # | Business type | Scenario |
|---|---------------|----------|
| M1 | Factory | Production head accepts owner task: "main karunga task 12" |
| M2 | Manufacturer | IT manager delegates to technician: "Anil task 15 karega" |
| M3 | Multi-dept | Task wrongly to purchase — manager `/mgrtransfer 8 purchase` |
| M4 | Workshop | Foreman rejects scope: "/mgrreject 3 — electrical ka kaam nahi" |

---

## 8. Issue Management

| # | Business type | Scenario |
|---|---------------|----------|
| I1 | Factory | Worker: "/issue compressor making noise line 4" |
| I2 | Workshop | Owner `/issues` before morning meeting |
| I3 | Distributor | Manager `/resolve 5` after cold storage repaired |

---

## 9. Team & Organization Visibility

| # | Business type | Scenario |
|---|---------------|----------|
| O1 | Growing factory | New owner `/members` to see departments after hiring spree |
| O2 | Trader | Verify which workers not linked to any department before assign |

---

## 10. Workforce Onboarding

| # | Business type | Scenario |
|---|---------------|----------|
| W1 | Factory | HR adds 5 new helpers via `/onboard_worker` + home menu |
| W2 | Workshop | Owner onboards welder with phone, dept, DOJ — worker can `/present` next day |

---

## 11. Vendor Management

| # | Business type | Scenario |
|---|---------------|----------|
| V1 | Manufacturer | Register steel supplier before first PO |
| V2 | Trader | Onboard packaging vendor found at trade fair |

---

## 12. Business Setup

| # | Business type | Scenario |
|---|---------------|----------|
| B1 | New tenant | Owner "tell you about my business" → `/business_discovery` |
| B2 | Interrupted setup | Owner returns after week: `/continue_discovery` |

---

## 13. Inventory Visibility

| # | Business type | Scenario |
|---|---------------|----------|
| IV1 | Manufacturer | Owner checks steel rod qty before accepting 500-unit order |
| IV2 | Trader | "SKU-WHEAT-50kg kitna bacha" before promising customer |
| IV3 | Distributor | `/inventory_status` with no SKU → low-stock list for morning buy meeting |
| IV4 | Workshop | Foreman checks spare parts before starting repair |

---

## 14. Inventory Data Entry

| # | Business type | Scenario |
|---|---------------|----------|
| ID1 | Trader | Add new product line one SKU at a time → `/inventory_create` |
| ID2 | Distributor | Bulk load 2,000 SKUs from Zoho export → `/inventory_import_csv` |
| ID3 | Manufacturer | First-time setup: home menu "Maal / stock jodein" |

---

## 15. Procurement & Reordering

| # | Business type | Scenario |
|---|---------------|----------|
| P1 | Manufacturer | Low-stock alert on raw material → purchase request |
| P2 | Workshop | Owner creates PR for welding rods before price increase |
| P3 | Trader | Seasonal restock — manual `/purchase_request_create` |

---

## 16. Document Processing

| # | Business type | Scenario |
|---|---------------|----------|
| DP1 | Trader | Upload supplier invoice → Munshi suggests inventory import → `/suggestion_approve` |
| DP2 | Manufacturer | Packing list upload → suggested stock-in pending YES/NO |

---

## 17. Platform Guidance & Control

| # | Business type | Scenario |
|---|---------------|----------|
| G1 | New worker | "madad" → `/help` |
| G2 | Owner stuck in onboarding | `/cancel` to exit workflow |
| G3 | Owner says "hello" | Home menu — not a command but primary navigation |

---

## Cross-capability scenarios (multi-step)

| ID | Narrative |
|----|-----------|
| X1 | **Order acceptance:** Inventory Visibility → (enough?) → Task Delegation to production |
| X2 | **Stockout prevention:** Inventory Visibility (low) → Procurement → Vendor Management |
| X3 | **New hire to productive:** Workforce Onboarding → Attendance → Task Visibility → Task Execution |
| X4 | **Breakdown response:** Issue Management → Task Delegation (repair) → Task Execution → Issue resolve |
| X5 | **Zoho migration:** Business Setup → Inventory Data Entry (CSV) → Inventory Visibility validation |
