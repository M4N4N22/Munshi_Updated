# Stash Audit

**Date:** 2026-06-07  
**Action taken:** Inspect only — not applied, not dropped

---

## Stash inventory

| Stash | Branch | Message | Recommendation |
|-------|--------|---------|----------------|
| `stash@{0}` | `Shantanu` | `pre-main-sync remediation and release docs` | **Drop** (after commit) |

---

## `stash@{0}` contents summary

Created during `main` → `Shantanu` sync to temporarily clear the working tree before merge.

**Overlaps with current uncommitted working tree:**

| File | In stash | In working tree |
|------|----------|-----------------|
| `.env.example` | Yes | Yes |
| `backend/.env.example` | Yes | Yes |
| `backend/Dockerfile` | Yes | Yes |
| `backend/src/main.ts` | Yes | Yes |
| `whatsapp.controller.ts` | Yes | Yes |
| `task-inventory-resolution.*` | Yes | Yes |
| `workflow-*.spec.ts` | Yes | Yes |
| `ml/.env.example` | Yes | Yes |
| `web/.env.example` | Yes | Yes |
| `backend/package-lock.json` | Yes | Yes |
| `web/package-lock.json` | Yes | Yes |
| `web/yarn.lock` | Yes | Yes |

**Also attempted to include (untracked):**

- `docs/docs_local/release/` — already on disk as untracked
- `ml/pytest.ini` — already on disk as untracked
- `.local/` — partially stashed; pgdata caused permission errors

---

## Determination

| Question | Answer |
|----------|--------|
| Apply stash? | **No** — working tree already has the same changes |
| Drop stash? | **Yes, after committing** — redundant duplicate |
| Investigate further? | **No** — contents fully superseded by working tree |

---

## Risk if stash applied now

Would conflict with current modified files (`git stash pop` already failed once with overwrite error during sync restore). Safe to ignore until post-commit cleanup.
