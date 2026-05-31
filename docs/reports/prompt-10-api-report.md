# Prompt 10 — API Report

## SECTION A — Backend Implementation

| Method | Path | Role | Status |
|--------|------|------|--------|
| GET | `/purchase-requests` | Member | List (paginated, status filter) |
| GET | `/purchase-requests/:id` | Member | Detail + items |
| POST | `/purchase-requests` | Member | Create (optional submit) |
| PATCH | `/purchase-requests/:id` | Member | Update draft/pending |
| POST | `/purchase-requests/:id/approve` | Owner/Manager | Approve |
| POST | `/purchase-requests/:id/reject` | Owner/Manager | Reject |
| POST | `/purchase-requests/:id/assign-vendor` | Owner/Manager | Assign/change vendor |
| POST | `/purchase-requests/:id/remove-vendor` | Owner/Manager | Remove vendor |
| POST | `/purchase-requests/:id/close` | Owner/Manager | Close |
| GET | `/purchase-requests/:id/audit` | Member | Audit trail |
| GET | `/purchase-requests/suggestions/low-stock` | Member | Inventory suggestions |
| POST | `/purchase-requests/from-suggestion` | Member | Create from suggestion |

Controller: `purchase-requests.controller.ts` — Swagger `@ApiTags('PurchaseRequest')`.

**Tests**: 124 backend tests passing (includes PR service + suggestion specs).

## SECTION B — LLM Requirements

N/A for REST; WhatsApp path uses workflow not direct API.

## SECTION C — Contract Requirements

All mutating endpoints require `factory_id` + `performed_by` (or `requested_by` on create).

## SECTION D — Training Data Requirements

N/A

## SECTION E — Future Automation Opportunities

Webhook callbacks to vendor systems on assign (Prompt 11).
