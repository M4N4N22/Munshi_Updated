# Phase 4 — WhatsApp UAT Status

**Evidence sources:** Phase 4 live validation (`65-phase4-live-validation-summary.md`, `66-phase4-final-signoff.md`), import bug investigation (`inventory_bugs/`), idempotency branch docs.

| Journey | Implemented | Tested | Working (main) | Verified Live | Pending |
|---------|:-----------:|:------:|:--------------:|:-------------:|:-------:|
| `/inventory_status` (list) | Y | Y | Y | Y (Phase 4) | — |
| `/inventory_status SKU` | Y | Y | Y | Y | — |
| `/inventory_import_csv` session start | Y | Y | Y | Partial | Staging re-test post-merge |
| CSV upload → review | Y | Y | Y | **BUG on main** (dup webhooks) | Fix branch UAT |
| CONFIRM import | Y | Y | Y | **BUG on main** (dup complete) | Fix branch UAT |
| CANCEL import | Y | Y | Y | Not formally UAT'd | — |
| Direct CSV (no session) | Y (main) | Y | **Undesired on main** | Confirmed bug | Fixed on branch |
| `/inventory_create` workflow | Y | Y | Y | Y (Phase 4) | — |
| Task NL + inventory lines | Y | Y | Y | FULL PASS (66) | — |
| Low stock alert message | Y | Y | Y | ENV-ONLY (OLLI limits) | Notification smoke |
| Purchase Karein CTA | Y | Y | Y | PASS (procurement fix) | — |
| Procurement trigger (PR create) | Y | Y | Y | PASS | — |
| Help / command listing | Y | Y | Y | Y | — |

## Key WhatsApp commands

| Command | Handler location |
|---------|------------------|
| `/inventory_status` | `whatsapp.service.ts` |
| `/inventory_import_csv` | `owner-home.service.ts` + bulk import |
| `/inventory_create` | Workflow router |
| Low-stock interactive button | `whatsapp-inbound.parser.ts` + routing |

## UAT gaps

1. **Import duplicate execution** — confirmed on Railway main; fix on unmerged branch
2. **OLLI outbound** — rate limits blocked notification verification in some runs
3. **Post-merge regression** — reviewer checklist in `inventory_bug_fix/09-reviewer-validation-checklist.md` not executed on staging
