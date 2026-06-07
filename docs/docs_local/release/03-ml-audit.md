# Phase 3 — ML Audit

**Branch:** `Shantanu`  
**Audit date:** 2026-06-07  
**Verdict:** **FAIL**

---

## Requirements & runtime

| Check | Result |
|-------|--------|
| `requirements.txt` present | PASS (16 packages) |
| Heavy deps (`torch`, `sentence-transformers`) | Present — large image footprint |
| Python version in Dockerfile | `3.12-slim` |
| Local venv test run | Python 3.14 used locally |

---

## Test execution

| Command | Result | Notes |
|---------|--------|-------|
| `pytest` (no PYTHONPATH) | **FAIL** | 9 collection errors — `ModuleNotFoundError` |
| `PYTHONPATH=ml pytest` | **PASS** | **56 passed** in 5.85s |
| Contract tests (`test_contract.py`) | PASS (included above) |

**Gap:** No `pytest.ini` or `conftest.py` to set `PYTHONPATH` automatically. CI does not run ML tests.

---

## Endpoints registered (`main.py`)

| Method | Path | Dependencies |
|--------|------|--------------|
| GET | `/`, `/health` | None |
| POST | `/classify` | `bot_engine` |
| POST | `/convert` | `bot_engine` |
| POST | `/parse` | `parsers.router`, `contracts.python` |
| POST | `/extract/task-inventory` | `extractors.task_inventory_extractor` |

All endpoints import modules under `parsers/`, `contracts/`, `extractors/`.

---

## Dockerfile audit — **CRITICAL**

`ml/Dockerfile` lines 22–23:

```dockerfile
COPY main.py bot_engine.py ./
```

**NOT copied into image:**

- `parsers/` (6+ files)
- `contracts/` (15+ files)
- `extractors/` (2 files)

**Impact:** Docker image will fail at import for `/parse` and `/extract/task-inventory`. `/classify` may work if imports are lazy enough, but `main.py` imports all at module load (lines 181–184).

**Verdict:** ML Docker build is **not production-ready**.

---

## Contract compatibility

| Check | Result |
|-------|--------|
| `ml/contracts/` mirrors `backend/contracts/` | PASS (drift tests green) |
| Backend `contract-drift` | PASS |
| ML `test_contract.py` | PASS |

---

## CI / workflow orphan

`ml/.github/workflows/cicd.yml` exists but GitHub Actions **only reads** `.github/workflows/` at repo root.

Root `.github/workflows/cicd.yml` has **no ML job** (no pytest, no ML Docker push).

---

## Dead code / unused models

- Large block of commented-out legacy `main.py` at file top (lines 1–169) — maintenance noise, not runtime risk
- `streamlit` in `requirements.txt` — no Streamlit app in repo; likely unused in production

---

## Localhost references

- Dockerfile `HEALTHCHECK` uses `http://localhost:8000/health` — acceptable inside container
- No hardcoded external URLs in `bot_engine.py` production paths

---

## Summary

| Category | Result |
|----------|--------|
| Requirements | PASS |
| Tests (correct invocation) | PASS |
| Tests (default invocation) | FAIL |
| Contract compatibility | PASS |
| Docker build completeness | **FAIL** |
| CI coverage | **FAIL** |

**Overall:** **FAIL**
