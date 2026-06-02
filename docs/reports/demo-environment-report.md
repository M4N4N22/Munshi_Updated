# Demo Environment Report — Prompt 13.5

**Validated:** 2026-06-02T14:54:57.978Z  
**Factory:** 3

## Service Status

| Component | Status | Notes |
|-----------|--------|-------|
| Backend (:4001) | ✅ Running | Postgres up |
| ML (:8000) | ✅ Running | Local `ML_URL` in `.env.local` |
| Database | ✅ Connected | Remote Postgres `65.1.128.181:5431/munshi_data` |
| WhatsApp Integration | ✅ Configured | Olli + Meta tokens in `.env.local`; use real WhatsApp for recording |
| Workflow Engine | ✅ Active | Session + handler routes verified via dry run |
| Document Endpoints | ✅ Active | `POST /documents/upload` returned 201 |

## Migrations

| Migration | Status |
|-----------|--------|
| 001_traderos_foundation.sql | ✅ Applied |
| 002_vendors_master.sql | ✅ Applied |
| 003_workflow_sessions.sql | ✅ Applied |
| 004_inventory_master.sql | ✅ Applied |
| 005_document_processing.sql | ✅ Applied |
| 006_procurement_foundation.sql | ✅ Applied |
| 007_business_discovery.sql | ✅ Applied |
| 008_business_discovery_expansion.sql | ✅ Applied |

**Pending migrations:** 0  
**Latest applied:** 008_business_discovery_expansion.sql

## Readiness Summary

Environment is **ready for demo recording**. Backend and ML run locally; all migrations through 008 are applied. Document upload pipeline processed `demo-assets/inventory-import-demo.csv` successfully during validation.

## Fixes Applied This Sprint

1. Started backend via `yarn dev` (was down at sprint start).
2. Promoted demo owner phone `917452897444` (Shantanu Garg) to **OWNER** role.
3. Onboarded manager phone `919456157007` (Rahul Verma) into Factory 3.
4. Seeded demo departments, vendor, inventory item, and worker via `scripts/demo-setup-users-data.mjs`.
