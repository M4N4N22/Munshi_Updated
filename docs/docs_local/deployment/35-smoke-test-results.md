# Smoke Test Results

**Date:** 2026-06-08  
**Backend URL:** https://backend-production-41504.up.railway.app  
**Method:** `POST /webhook/test` (staging flag enabled) + `POST /resolve/task-inventory`

---

## Intent smoke tests

| Test | Message | Expected | Result |
|------|---------|----------|--------|
| `/help` | `help chahiye` | Intent routed | **PASS** — HTTP 201 |
| `/present` | `aaj main present hoon` | Intent routed | **PASS** — HTTP 201 |
| `/members` | `team members dikhao` | Intent routed | **PASS** — HTTP 201 |

Backend → ML classify path operational.

---

## Inventory workflow

**Message:** `Ram ko 20 cement deliver kar do` (via structured resolve API)

```
POST /resolve/task-inventory
x-secret: secret
```

| Check | Result |
|-------|--------|
| HTTP status | **201** |
| `task_kind` | `delivery` |
| `quantity` | `20` |
| ML extraction path | **PASS** (via backend) |

| Check | Result | Notes |
|-------|--------|-------|
| Inventory resolved | `not_found` | Fresh DB — no inventory master seeded |
| Worker resolved | `not_found` | Fresh DB — no workers seeded |
| Workflow session created | **PARTIAL** | Resolve works; full E2E needs factory onboarding data |
| Task creation | **PARTIAL** | Requires seeded factory + workers + inventory |

---

## Security checks

| Test | Expected | Result |
|------|----------|--------|
| `/resolve/task-inventory` without `x-secret` | 401 | **PASS** (before secret applied) |
| `/webhook/test` without flag | 404 | Disabled when `ENABLE_WEBHOOK_TEST_ROUTE` unset |

---

## Summary

| Area | Verdict |
|------|---------|
| Intent routing (/help, /present, /members) | **PASS** |
| ML connectivity | **PASS** |
| Inventory extraction API | **PASS** |
| Full workflow + task creation | **PARTIAL** — needs seeded staging data |
