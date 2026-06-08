# PASS-State Comparison

**Run date:** 2026-06-08  
**Baseline signoffs reviewed:**

- `docs/docs_local/inventory/66-phase4-final-signoff.md` — FULL PASS
- `docs/docs_local/release/16-final-merge-readiness.md` — READY FOR RAILWAY DEPLOYMENT: YES
- `docs/docs_local/release/31-ready-to-push-signoff.md` — YES safe to push
- `docs/docs_local/deployment/10-final-deployment-runbook.md` — READY FOR RAILWAY EXECUTION: YES

---

## Remediation fixes (commit `197e03d`)

| Fix ID | Description | Status | Evidence |
|--------|-------------|--------|----------|
| MB-01 | OpenAI key placeholder in `ml/.env.example` | **PRESENT** | `your-openai-api-key-here`; no `sk-proj-` in tree |
| MB-03 | `/webhook/test` env gated | **PRESENT** | `ENABLE_WEBHOOK_TEST_ROUTE !== 'true'` in whatsapp.controller |
| MB-04 | `/resolve/task-inventory` guarded | **PRESENT** | `@UseGuards(InternalCallGuard)` on controller |
| MB-05 | Workflow tests aligned | **PRESENT** | Commit `f24cc0d`; 340/340 tests pass |
| MB-06 | PORT 4001 aligned | **PRESENT** | `main.ts` default 4001; Dockerfile `EXPOSE 4001` |
| MB-10 | MSG91 vars documented | **PRESENT** | `backend/.env.example` |
| MB-11 | Turso + admin key documented | **PRESENT** | `web/.env.example` |
| MB-13 | Canonical `MUNSHI_WEB_URL` | **PRESENT** | `.env.example` cleanup in `197e03d` |
| `.gitignore` + `.local/` | Local dev isolation | **PRESENT** | `.gitignore` updated |
| `ml/pytest.ini` | Python path for tests | **PRESENT** | `pythonpath = .` |

---

## Phase 4 remediation fixes (commit `bd3c6b3`)

| Defect | Description | Status | Evidence |
|--------|-------------|--------|----------|
| LIVE-001 | Double disambiguation → CANCELLED | **PRESENT** | `buildBootstrap()` refactor in orchestrator |
| LIVE-002 | No delivery tasks after disambiguation | **PRESENT** | Handler selection-before-cancel routing |
| LIVE-004 | Session expiry on `updated_at` | **PRESENT** | `workflow-session.service.ts` `isExpired()` |
| LIVE-005 | `/help` during active workflow | **PRESENT** | `parseDirectSlashCommand()` in whatsapp layer |
| Confirmation | `theek hai` token | **PRESENT** | `task-inventory-nl.constants.ts` |
| Duplicate confirm guard | `task_created_id` | **PRESENT** | Tests pass in handler spec |

---

## Deferred items (unchanged from prior signoff)

| ID | Item | Status | Notes |
|----|------|--------|-------|
| MB-02 | ML Dockerfile incomplete COPY | **PRESENT (deferred)** | Legacy path; Railway uses source build |
| MB-07 | Triple lockfiles in `web/` | **PRESENT (known)** | Non-blocking |
| MB-08 | ML not in CI | **PRESENT (known)** | Non-blocking for Railway |

---

## Documentation state

| Artifact | Prior PASS | Current |
|----------|------------|---------|
| Release reports 01–27 | Committed (`fa8ea11`) | **PRESENT** |
| Release reports 28–31 | Created session | **UNTRACKED** (docs only) |
| Deployment runbook 01–10 | Created session | **UNTRACKED** (docs only) |

Untracked docs do not affect code PASS state.

---

## Summary classification

| Category | Count |
|----------|-------|
| **PRESENT** | 18 validated fixes |
| **MISSING** | 0 |
| **MODIFIED** | 0 (regressions) |
| **UNKNOWN** | 0 |

---

## Conclusion

The current codebase **contains all changes** that produced the prior FULL PASS and Railway readiness signoffs. No code regressions detected against baseline commits `bd3c6b3`, `197e03d`, `f24cc0d`.
