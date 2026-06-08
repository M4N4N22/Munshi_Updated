# Railway Deployment Execution

**Date:** 2026-06-08  
**Project:** munshi-staging  
**Method:** Railway MCP + CLI (local upload deploy)  
**Branch intent:** `Shantanu` (local validated code — GitHub repo not linked)

---

## MCP connectivity

| Check | Result |
|-------|--------|
| Railway MCP `whoami` | **PASS** — Shantanu Garg |
| Railway CLI auth | **PASS** |

---

## Project

| Field | Value |
|-------|-------|
| **Project Name** | `munshi-staging` |
| **Project ID** | `043b8a36-21f6-422b-82af-fd7831269075` |
| **Environment ID** | `e43240a6-1d77-4c72-801d-4d81e606f88e` |
| **Project URL** | https://railway.com/project/043b8a36-21f6-422b-82af-fd7831269075 |

---

## Services created

| Service | ID | Status |
|---------|-----|--------|
| Postgres | `4d1374d9-585e-4c55-a236-c4f2b6264ff8` | SUCCESS |
| Postgres-I2eB | (duplicate template) | SUCCESS — **remove duplicate** |
| ml | `f18087b3-ee5f-43d3-8356-0ea4110626b7` | SUCCESS |
| backend | `5adcc79f-a9fb-41bf-a0d4-d635293063e9` | SUCCESS |

---

## Deploy method note

GitHub repo `ShantanuGarg2004/Munshi_Updated` is **not accessible** to Railway (not connected). Deployments used **local CLI/MCP upload** from validated local `Shantanu` workspace.

---

## Code fixes applied during deploy

| Fix | File | Reason |
|-----|------|--------|
| ML Dockerfile COPY full tree | `ml/Dockerfile` | Runtime imports `parsers/`, `contracts/`, `extractors/` |
| ML PORT shell expansion | `ml/Dockerfile` + start command | `$PORT` literal error |
| Backend entrypoint path | `backend/scripts/docker-entrypoint.mjs` | Nest outputs `dist/src/main.js` not `dist/main.js` |

---

## Successful deployment IDs

| Service | Deployment ID |
|---------|---------------|
| ML (active) | `5b66af41-b6fc-4602-843b-a18365664c62` |
| Backend (active) | `8f5cb7de-c980-4643-bcc9-65c24b38a95d` |

---

## URLs

| Service | URL |
|---------|-----|
| Backend (public) | https://backend-production-41504.up.railway.app |
| ML (private) | `ml.railway.internal:8080` |
| Postgres (private) | `postgres.railway.internal:5432` |
