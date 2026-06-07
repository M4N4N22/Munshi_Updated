# Phase 4.4 — Compatibility Matrix

**Run date:** 2026-06-07

---

| Contract | Producer | Consumer | Validation Status |
|----------|----------|----------|-------------------|
| **TaskInventoryExtraction** (JSON) | ML `/extract/task-inventory` | Backend `MlTaskInventoryClient`, resolver DTO | **PASS** — backend/ML schemas identical |
| **TaskInventoryExtraction** (TS) | Shared `contracts/typescript` | Backend orchestrator, DTO validators | **PASS** — `TASK_KINDS` aligned |
| **TaskInventoryExtraction** (Python) | ML extractor | ML endpoint, pytest | **PASS** — models identical, Literal matches catalog |
| **TaskKind catalog** | `task-kinds.json` | JSON schema enum, TS, Python | **PASS** — single source of truth |
| **ResolveTaskInventoryRequest** | Backend API contract | `TaskInventoryResolutionController` | **PASS** — DTO keys match schema |
| **ResolvedTaskInventoryIntent** | `TaskInventoryResolutionService` | NL orchestrator, workflow handler | **PASS** — interface matches JSON schema |
| **DisambiguationPayload** | Resolver + `disambiguation.util` | Workflow handler, confirmation service | **PASS** — types in resolution schema |
| **WORKFLOW_TYPE.TASK_INVENTORY_CREATION** | Backend workflow constants | Registry, handler, session engine | **PASS** — handler registered |
| **workflow-types.json** | Shared contract | Backend + ML TS/Python loaders | **PASS** — identical in both repos |
| **WORKFLOW_START_COMMANDS** | Backend constants | Registry, `workflow-types.json` | **PASS** — includes `/task_inventory_nl` |
| Document extraction schemas | ML `/parse` | `ContractValidationService` | **PASS** — legacy drift tests unchanged |
| Classify response | ML `/classify` | WhatsApp classify path | **PASS** — unchanged |

---

## Cross-Repo Parity Summary

| Pair | Fields | Types | Enums | Version | Status |
|------|--------|-------|-------|---------|--------|
| Backend ↔ ML extraction schema | Match | Match | Match | v1 | **PASS** |
| Backend ↔ ML task-kinds.json | Match | — | Match | v1 | **PASS** |
| Backend ↔ ML workflow-types.json | Match | — | Match | v1 | **PASS** |
| Backend TS ↔ ML TS (Phase 4) | Match | Match | Match | v1 | **PASS** (after 4.4 fix) |
| Backend Python ↔ ML Python models | Match | Match | Match | v1 | **PASS** |
| Backend DTO ↔ resolution schema | Match | Match | Match | v1 | **PASS** |

---

## Known Gaps

| Gap | Impact | Mitigation |
|-----|--------|------------|
| Resolution schemas not mirrored to ML | Low — ML does not consume resolver | Documented as backend-internal |
| CI does not run drift tests automatically | Medium — drift could merge undetected | Commands documented in validation report |
| `ContractValidationService` does not validate task-inventory extraction | Low — validated at ML + drift tests | Future: optional runtime AJV hook |

---

*End of compatibility matrix.*
