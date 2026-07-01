# Phase 9 — UAT Readiness

| Feature | Ready for UAT | Needs Staging | Needs Fixes | Blocked |
|---------|:-------------:|:-------------:|:-----------:|:-------:|
| Master data REST APIs | ✓ | ✓ | | |
| Transactions REST | ✓ | ✓ | | |
| `/inventory_status` WhatsApp | ✓ | ✓ | | |
| `/inventory_create` workflow | ✓ | ✓ | | |
| Task NL + inventory | ✓ | ✓ | | |
| REST CSV import | ✓ | ✓ | | |
| WhatsApp CSV review (main) | | ✓ | ✓ | Dup bugs |
| WhatsApp CSV (fix branch) | ✓ | ✓ | | Pending merge |
| Low stock alerts | ✓ | ✓ | | OLLI env |
| Purchase CTA | ✓ | ✓ | | |
| Procurement approval E2E | | ✓ | | Full flow UAT |
| Zoho OAuth | ✓ | ✓ | | |
| Zoho pull sync | | ✓ | | Live creds |
| Zoho push | | | ✓ | org_id + scope |

## Staging prerequisites

1. Postgres with migrations through 014 (main) or 016 (with fix branch)
2. Backend + ML + OLLI credentials
3. Owner/manager test factory with categories/locations
4. Zoho test org (for integration UAT)
5. Deploy fix branch for import UAT before merging

## UAT documents available

| Doc | Path |
|-----|------|
| Import bug fix reviewer checklist | `inventory_bug_fix/09-reviewer-validation-checklist.md` |
| Import staging UAT | `inventory_bug_fix/10-staging-uat-plan.md` |
| Zoho UAT plan | `zoho/09-uat-execution-plan.md` |
| Phase 4 NL workflow signoff | `66-phase4-final-signoff.md` |
