# Phase 3G — Dataset Size Planning

**Tiers:** Minimum (gate Phase 4) | Recommended (confidence) | Benchmark (regression suite)

---

## By priority tier

### P1 capabilities

| Capability | Commands | Min | Recommended | Benchmark |
|------------|----------|----:|------------:|----------:|
| Task Delegation | assign, depart_assign, assign_clarify | 85 | 150 | 250 |
| Manager Coordination | mgr* (4) | 80 | 140 | 220 |
| Inventory Visibility | inventory_status | 30 | 50 | 80 |
| Stock-Linked Ops | assign_delivery, task_inventory_nl | 55 | 100 | 160 |
| Task Execution | complete, update, issue | 80 | 130 | 200 |
| **P1 subtotal** | | **330** | **570** | **910** |

### P2 capabilities

| Capability | Commands | Min | Recommended | Benchmark |
|------------|----------|----:|------------:|----------:|
| Attendance | present, absent | 40 | 60 | 100 |
| Task Visibility | tasks | 20 | 35 | 60 |
| Inventory Data Entry | create, import_csv | 45 | 75 | 120 |
| Issue Management | issues, resolve | 24 | 40 | 70 |
| Procurement | purchase_request_create | 15 | 25 | 45 |
| **P2 subtotal** | | **144** | **235** | **395** |

### P3 capabilities

| Capability | Commands | Min | Recommended | Benchmark |
|------------|----------|----:|------------:|----------:|
| Onboarding | onboard_worker, onboard_vendor | 22 | 35 | 55 |
| Business Setup | business_discovery, continue_discovery | 23 | 40 | 65 |
| Team Visibility | members | 10 | 18 | 30 |
| Reporting | report | 12 | 20 | 35 |
| Document Processing | suggestion_approve | 15 | 25 | 40 |
| Platform | help, cancel, general_chat | 45 | 70 | 110 |
| **P3 subtotal** | | **127** | **208** | **335** |

---

## Cross-cutting slices (additive)

| Slice | Min | Recommended | Benchmark |
|-------|----:|------------:|----------:|
| Boundary pairs (31) | 396 | 396 | 500 |
| Role-aware (32) | 310 | 310 | 400 |
| Ambiguity (33) | 167 | 167 | 220 |
| Session (34) | 110 | 110 | 150 |
| Contract gap (35) | 201 | 201 | 201 |
| **Cross-cutting** | **1,184** | **1,184** | **1,471** |

*Note: Boundary/role/ambiguity cases overlap with intent totals — dedupe at authoring time (~30% overlap estimated).*

---

## Deduplicated totals

| Level | Unique cases (est.) |
|-------|--------------------:|
| **Minimum (Phase 4 gate)** | **~1,200** |
| **Recommended** | **~1,800** |
| **Benchmark regression** | **~2,800** |

### Minimum breakdown

| Component | Cases |
|-----------|------:|
| P1 intent core | 330 |
| P2 intent core | 144 |
| P3 intent core | 127 |
| Boundary-exclusive | ~200 |
| Role-invalid exclusive | ~80 |
| Ambiguity/clarify exclusive | ~100 |
| Session-exclusive | ~80 |
| Contract gap | 201 |
| **Total** | **~1,262** |

---

## Language distribution (all tiers)

| Language | Minimum % |
|----------|----------:|
| Hinglish | 35 |
| Hindi | 20 |
| English | 25 |
| Broken/mixed | 15 |
| Typos/shorthand | 5 |

---

## Authoring phases (future)

| Phase | Deliverable | Cases |
|-------|-------------|------:|
| 3.1 | P1 boundary + role | 500 |
| 3.2 | P1 ambiguity + session | 300 |
| 3.3 | Contract gap | 201 |
| 3.4 | P2 core | 235 |
| 3.5 | P3 + benchmark expansion | 600+ |

---

## Phase 4 gate criteria

| Criterion | Threshold |
|-----------|-----------|
| P1 cases authored | ≥ 330 |
| Boundary pairs complete | 12/12 |
| Role-invalid cases | ≥ 60 |
| Contract gap cases | ≥ 201 (provisional OK) |
| Session cases | ≥ 110 |
| Language mix | All buckets met |
