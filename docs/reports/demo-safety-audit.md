# Demo Safety Audit

Every demo step classified for video inclusion.

## SAFE ✅ (include in video)

| Step | Classification | Notes |
|------|----------------|-------|
| Manager attendance | SAFE | "Aaj main present hoon" |
| Owner task assign to worker | SAFE | Full name phrase required |
| Worker task update / complete | SAFE | Hardened phrases |
| Owner → manager routed task | SAFE | Natural assign to Rahul Verma |
| Manager delegate with task id | SAFE | Read task id from Munshi task list |
| Steel sheets inventory query | SAFE | Stable `/inventory_status` |
| Purchase request full workflow | SAFE | Dry run passed |
| Vendor assign + close (Gupta Metals) | SAFE | Same as vendor simulation |
| Daily report | SAFE | Stable `/report` |
| Business discovery intro (30s) | SAFE | Pause after menu — do not complete all buckets |
| Document CSV demo | SAFE | Pre-validated upload |

## RISKY ⚠️ (exclude from video)

| Step | Classification | Reason |
|------|----------------|--------|
| "Rahul ko inventory check…" | RISKY | ML → `/inventory_status` |
| Manager self-assign | RISKY | NL → `general_chat` |
| Manager dept transfer | RISKY | Known unreliable (production audit) |
| Standalone vendor lookup NL | RISKY | No intent; general chat |
| New vendor onboard (Gupta exists) | RISKY | Duplicate vendor name collision in workflow |

## UNSAFE ❌ (never demo live)

| Step | Reason |
|------|--------|
| Slash commands (`/assign`, etc.) | Violates demo requirements |
| Cursor/webhook test during recording | Not real user experience |
| Ledger / Tally / auto-procurement | Out of scope — not implemented |

## Final Video Rule

**Only SAFE rows above appear in `demo-script-v1.md`.**
