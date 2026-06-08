# 24 — Confusion Matrix After Hardening (Phase 5A)

**Date:** 2026-06-08  
**Corpus:** 77 manager workflow cases  
**Path:** Deterministic pre-classify (`use_llm=False`)

---

## Manager Intent Confusion Matrix

| Expected ↓ / Predicted → | `/mgrself` | `/mgrassign` | `/mgrtransfer` | `/mgrreject` | `/assign` | `general_chat` |
|---|---:|---:|---:|---:|---:|---:|
| `/mgrself` | **19** | 0 | 0 | 0 | 0 | 0 |
| `/mgrassign` | 0 | **18** | 0 | 0 | 0 | 0 |
| `/mgrtransfer` | 0 | 0 | **20** | 0 | 0 | 0 |
| `/mgrreject` | 0 | 0 | 0 | **19** | 0 | 0 |
| `/assign` (negative control) | 0 | 0 | 0 | 0 | **1** | 0 |

**Diagonal accuracy:** 77/77 = **100%**

---

## Pre-Hardening Top Confusions (from baseline taxonomy)

| Expected | Most common wrong prediction | Count (approx) |
|---|---|---:|
| `/mgrtransfer` | `general_chat` | 10 |
| `/mgrreject` | `general_chat` | 10 |
| `/mgrself` | `general_chat` | 10 |
| `/mgrassign` | `general_chat` | 8 |
| `/mgrself` | `/assign_clarify` | 3 |
| `/mgrassign` | `/assign` | 2 |

---

## Post-Hardening Confusion Summary

| Confusion pair | Count |
|---|---:|
| Any manager → `general_chat` | **0** |
| Any manager → `/assign_clarify` | **0** |
| `/mgrassign` → `/assign` | **0** |
| `/mgrtransfer` → `/mgrassign` | **0** |
| `/mgrreject` → `/mgrassign` | **0** |

---

## Negative Control

`priya ko bhej do` (expected `/assign`, not manager delegation) correctly remains `/assign` — no over-routing to `/mgrassign`.

---

## Interpretation

Phase 5A eliminated the primary failure cluster (manager NL → `general_chat`). The deterministic manager router now captures all benchmark cases before LLM fallback.
