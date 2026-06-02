# Demo Dataset Report

Minimal dataset prepared for Factory 3 demo flows. No bulk test pollution added.

## Departments

- **Inventory** (id 10, slug `inventory`)
- **Operations** (id 6, slug `operations`)
- **Sales** (id 5, slug `sales`)

## Demo Entities

| Entity | Details |
|--------|---------|
| Vendor | **Gupta Metals** (id 12) — phone 9876543200 |
| Inventory item | **Steel Sheets** — SKU `DEMO-STEEL-001`, qty **120 sheets** (id 15) |
| Worker | **Rahul Kumar** (id 35) |
| Manager | **Rahul Verma** — Operations head |
| Owner | **Shantanu Garg** |

## Inventory Master

- Categories: Audit Cat, Runtime Cat, Raw Materials
- Locations: Audit Loc, Main Store, Main Warehouse

## Demo Assets (CSV)

| File | Purpose |
|------|---------|
| `demo-assets/inventory-import-demo.csv` | Document upload / inventory import demo |
| `demo-assets/vendor-import-demo.csv` | Future vendor bulk import reference |
| `demo-assets/employee-import-demo.csv` | Future workforce import reference |

## Setup Script

`node scripts/demo-setup-users-data.mjs` — idempotent; safe to re-run before recording.
