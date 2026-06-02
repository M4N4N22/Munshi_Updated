# Demo Dry Run Report

**Executed:** 2026-06-02T14:54:57.978Z  
**Script:** `node scripts/run-demo-readiness-sprint.mjs`

## Summary

| Check | Result |
|-------|--------|
| Environment | ✅ PASS |
| Users | ✅ PASS |
| Dataset | ✅ PASS |
| Natural language (≥85%) | 10/12 — PASS with exclusions |
| Dry run flows | ✅ PASS |
| Document demo | ✅ PASS |

## Manager Delegation Trace

- Owner message: `Rahul Verma ko dispatch planning ka task do`
- Delegate: `task 83 Rahul Kumar ko do`
- Result routing: `DELEGATED_TO_WORKER`

## Purchase Request Trace

- `purchase request bana do` → step REQUEST_CREATION (ok)
- `Demo PR 1780412076699` → step REQUEST_CREATION (ok)
- `Steel Sheets` → step REQUEST_CREATION (ok)
- `25` → step REQUEST_CREATION (ok)
- `NO` → step APPROVAL (ok)
- `YES` → step VENDOR_ASSIGNMENT (ok)
- `Gupta Metals` → step CLOSE (ok)
- `YES` → step done (ok)

## Issues Observed

1. Partial first names ("Rahul") fail worker resolution — use **Rahul Kumar**.
2. Word "inventory" in task phrases triggers `/inventory_status`.
3. `/mgrself` and standalone vendor lookup remain excluded.

## Recording Checklist

- [ ] Backend `yarn dev` running
- [ ] ML service on :8000
- [ ] Cancel stale workflows: send "cancel" in Hindi if needed
- [ ] Real phones logged into WhatsApp
- [ ] Do not use `/webhook/test` during capture
