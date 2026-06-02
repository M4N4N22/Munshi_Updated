# Demo Go / No-Go Report

**Decision date:** 2026-06-02T15:19:24.263Z  
**Verdict:** **CONDITIONAL GO**

---

## Success Criteria Checklist

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Every demo command manually validated | ⚠️ PARTIAL | 10/12 certification rows pass; manager task list outbound failed once |
| 2 | Every workflow tested | ✅ YES | PR full path CLOSED; Discovery start; session interference mapped |
| 3 | Exact working phrases identified | ✅ YES | See `demo-script-certified.md` and `certified_phrases` in JSON |
| 4 | 400 errors fully explained | ✅ YES | `demo-400-root-cause-report.md` |
| 5 | Workflow session interference understood | ✅ YES | `demo-workflow-session-report.md` |
| 6 | Final certified demo script exists | ✅ YES | `demo-script-certified.md` |
| 7 | Demo recordable without uncertainty | ⚠️ PARTIAL | Core flow certifiable; manager task list + document NL remain risks |

**Overall:** **4/7 full pass, 3 partial** — proceed with certified script and preconditions

---

## What Works (high confidence)

- Attendance, task assign, inventory, full PR + vendor close, report
- Manager delegate **when task ID is known**
- Olli probe successful at audit time

## What Does Not Work (do not demo)

- `Rahul ko inventory check...` (wrong intent)
- `main khud yeh kaam karunga` (general_chat)
- WhatsApp "document uploaded" natural language
- Commands during active PR/Discovery without completing workflow

## Blockers Before Recording

1. Send test message to **both** demo phones on real WhatsApp — confirm delivery
2. Clear active sessions on both phones
3. Use **demo-script-certified.md** only — not demo-script-v1.md
4. Owner must capture **task ID** from routing confirmation (skip manager task list if Olli fails)

## Recording Decision

| Option | Recommendation |
|--------|----------------|
| Record today with certified script | ✅ **Approved with conditions** |
| Use demo-script-v1 as-is | ❌ **Not approved** |
| Implement fixes before any recording | Optional — not required for core 6-min flow |

---

## Artifacts

- Machine-readable: `docs/reports/demo-certification-results.json`
- Re-run audit: `node scripts/run-demo-certification-audit.mjs`
