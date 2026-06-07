# UAT — Purchase Request Experience

**Roles:** Owner, Inventory Lead, Vendor Lead  
**Run date:** 2026-06-06  

---

## Procurement Workflow (Group 9)

| Step | Result | Notes |
|------|--------|-------|
| Create purchase request | **PASS** | PR #12, #14 created |
| Line items with inventory link | **PASS** | `inventory_item_id` + `item_name` |
| List PRs for factory | **PASS** | `GET /purchase-requests` |
| Submit for approval | **PARTIAL** | REST create defaults to DRAFT unless `submit: true` |
| Owner/manager approve | **FAIL** live | 400 when approving DRAFT |
| Vendor assignment | **NOT LIVE-TESTED** | Requires APPROVED state |
| Request visibility / audit | **PASS** | `GET /purchase-requests/:id/audit` available |

### Approval fix (business process)

Create with submission:

```json
{
  "factory_id": 2010,
  "requested_by": 6097,
  "title": "Restock cement",
  "submit": true,
  "items": [{ "inventory_item_id": 1439, "item_name": "Cement", "requested_quantity": "20", "unit": "bag" }]
}
```

Approve with:

```json
{ "factory_id": 2010, "performed_by": 6091 }
```

---

## Low Stock → Purchase Request (Group 11)

| Step | Live UAT | Integration (Phase 3.4) |
|------|----------|-------------------------|
| Low stock alert CTA with `itemId` | **PASS** † | **PASS** |
| Prefill REST endpoint | **FAIL** | **PASS** |
| Prefill into WhatsApp workflow | **NOT LIVE-TESTED** | **PASS** |
| Manual review before create | **PASS** † | **PASS** |
| No auto-create on prefill start | **PASS** † | **PASS** |
| Approval workflow unchanged | **PASS** † | **PASS** |

### Live prefill failure root cause

`GET /purchase-requests/prefill/low-stock` returns **404 Cannot GET** on UAT server port 4001 — **stale backend process** predating Phase 3.4 route registration. Codebase and integration tests confirm endpoint works when latest build is running.

---

## Suggestions API — **PASS**

`GET /purchase-requests/suggestions/low-stock?factory_id=` returns actionable low-stock rows for manual PR creation.

---

## Scenario Group Verdict

| Group | Result |
|-------|--------|
| 9 — Purchase requests | **PARTIAL** |
| 11 — Purchase request prefill | **FAIL** live / **PASS** † integration |

---

## Business View

- **Without prefill route:** Owner must re-enter SKU/name from low-stock alert — duplicate data entry risk.  
- **With WhatsApp workflow (integration-proven):** CTA `/purchase_request_create?itemId={id}` pre-fills item, SKU, quantity — **no duplicate entry**.  
- **Draft vs submit:** Business users using REST alone may not realize PR stays in DRAFT until submitted.

---

## Duplicate Data Entry Assessment

| Path | Duplicate entry? |
|------|-----------------|
| WhatsApp prefill (Phase 3.4) | **No** † |
| REST manual create from alert | **Yes** — manual re-entry |
| REST suggestion API | **Minimal** — suggested qty provided |
