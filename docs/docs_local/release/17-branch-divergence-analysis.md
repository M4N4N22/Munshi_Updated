# Branch Divergence Analysis

**Date:** 2026-06-07  
**Branches:** `Shantanu` vs `origin/main`

---

## HEAD positions (after fetch)

| Branch | Commit | Message |
|--------|--------|---------|
| `origin/main` | `332edd3` | docs(deploy): troubleshoot VM permissions and Docker Hub pull errors |
| `origin/Shantanu` (pre-sync) | `bd3c6b3` | Complete Phase 4 task-inventory NL workflow and live defect remediation |
| Merge base | `7ff06ac` | docs: add P2 inventory-task integration build guide |

---

## Commits only in Shantanu (7)

| Commit | Summary |
|--------|---------|
| `acebee2` | Phase 0 inventory-task integration with WhatsApp delivery assign |
| `2903789` | Phase 1 CSV inventory import stack |
| `d65d5ad` | Phase 1.4 WhatsApp CSV import + web template |
| `7cbed08` | Phase 2 Zoho integration stack |
| `3105c83` | Zoho stock push handler + retry processing |
| `0e78ae9` | Phase 3 alerts + purchase request prefill |
| `bd3c6b3` | Phase 4 task-inventory NL workflow + remediation |

**Scope:** Inventory, Zoho, workflows, ML contracts, web integrations — 458 files vs merge-base.

---

## Commits only in main (6)

| Commit | Summary | Files touched |
|--------|---------|---------------|
| `9a4fa27` | fix(ci): use ubuntu SSH user for GCP VM deploy | `.github/workflows/cicd.yml`, `.gitignore`, `README.md`, docs |
| `bc3b2fd` | fix(ci): harden GCP SSH deploy + bootstrap scripts | CI workflows, deploy scripts, docs |
| `cd0d0f1` | feat(deploy): GCP VM production docker-compose stack | `deploy/gcp-vm/*`, scripts, README |
| `340892a` | feat(deploy): run backend and ML together on GCP VM | `deploy/gcp-vm/*`, `cicd.yml`, scripts |
| `ffe52f0` | docs: mention ml.env in GCP bootstrap | `docs/p0-gcp-deploy-ssh.md` |
| `ac3a603` | fix(deploy): SSH timeouts in sync script | `scripts/sync-gcp-prod-stack.ps1` |
| `332edd3` | docs(deploy): troubleshoot VM permissions | `deploy/gcp-vm/README.md`, scripts |

**Scope:** GCP VM deploy, CI/CD hardening, deploy scripts — no application feature code.

---

## Files modified by both branches

**Count: 0** (since merge-base `7ff06ac`)

Main-only and Shantanu-only changes touch **disjoint file sets**. No overlapping edits to the same paths.

### Potential conflict areas (theoretical)

| Area | Risk | Actual outcome |
|------|------|----------------|
| `.github/workflows/cicd.yml` | MEDIUM — both touch CI | Only main changed it; Shantanu did not |
| `README.md` | LOW | Only main changed it |
| `backend/` application code | HIGH if overlap | **No overlap** — Shantanu only |
| `ml/` / `web/` features | HIGH if overlap | **No overlap** with main commits |

---

## Pre-sync local state

Uncommitted remediation work (Railway readiness) was stashed before merge and restored after. Merge commit created locally; **not pushed**.
