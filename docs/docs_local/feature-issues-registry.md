# Munshi Feature Issues Registry

**Document date:** 2026-06-06  
**Registry version:** 1.0  
**Source registry version:** Current Capability Registry v1.0 (`current-capability-registry.md`, build `0e78ae9`)

This document lists **confirmed, active known issues** for features currently marked **READY WITH KNOWN ISSUES**. It is an operational reference for support and deployment — not a roadmap, backlog, or future-planning document.

**Evidence scope:** Capability Registry; UAT 49 (`49-uat-*`); UAT 50 (`50-document-uat-*`, cross-referenced only where it affects RWKI features); implementation signoffs `27-*`, `39-*`, `41-*`, `42-*`, `44-*`, `45-*`, `99-*`.

---

## Section 1 — Executive Summary

| Metric | Count |
|--------|-------|
| **Total READY WITH KNOWN ISSUES features** | 38 |
| **Features with no feature-specific active issues** | 21 |
| **Features with confirmed feature-specific issues** | 17 |
| **Total unique confirmed issues** | 12 |

### Issues by severity (unique issue IDs)

| Severity | Count | Issue IDs |
|----------|-------|-----------|
| **CRITICAL** | 2 | FI-P01, FI-001 |
| **HIGH** | 2 | FI-P02, FI-002 |
| **MEDIUM** | 5 | FI-P03, FI-P04, FI-004, FI-005, FI-006 |
| **LOW** | 2 | FI-003, FI-P05 |
| **INFO** | 1 | FI-007 |

### Cross-cutting note

Most REST-backed features inherit **FI-P01** (no authentication). Most WhatsApp-backed features inherit **FI-P02** (outbound messaging depends on OLLI credentials). These are counted once above, not per feature.

---

## Section 2 — Feature Issue Catalog

Legend for inherited issues: **↳ inherits** = platform-wide issue documented once under Platform Issues; referenced on affected features.

### Platform Issues (affect multiple RWKI features)

#### FI-P01 — REST API has no authentication

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **Classification** | BUG |
| **Description** | All REST endpoints respond without credentials. Any caller with network access can read or mutate tenant data by supplying `factory_id` and related IDs. |
| **Evidence source** | UAT 49 (`49-uat-defects.md` UAT-D-01); Capability Registry §5 item 7 |
| **Business impact** | Unauthorized data access and modification across factories |
| **Current workaround** | Deploy behind private network / VPN; do not expose REST publicly |
| **Root cause** | No global auth guard or factory-membership validation on REST layer |
| **Verification status** | Confirmed |

**Affects (REST or Multiple availability):** All 38 RWKI features with REST API exposure (see Section 3 matrix).

---

#### FI-P02 — WhatsApp outbound messaging fails when OLLI credentials missing or invalid

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Classification** | CONFIGURATION |
| **Description** | After successful command/workflow processing, outbound send to OLLI WABA API may return HTTP 401. Client may receive 401 even when DB side effects committed. |
| **Evidence source** | UAT 49 UAT-D-05; Phase 0 signoff (`99-phase0-signoff.md`, DEF-ACC-001 in `99-phase0-defects.md`); UAT 50 execution (post-approval 401) |
| **Business impact** | User sees error or silence after successful backend action; uncertain whether operation completed |
| **Current workaround** | Configure `OLLI_URL` / `OLLI_KEY` (and related messaging credentials) in deployment env |
| **Root cause** | Empty or invalid OLLI API key in UAT/production env |
| **Verification status** | Partially Confirmed (intermittent — passed in UAT 49 supplement run when creds valid) |

**Affects:** All WhatsApp-backed RWKI features (commands, workflows, alerts, notifications, CSV WhatsApp import).

---

#### FI-P03 — REST inventory quantity fields require string type

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Classification** | DESIGN CHOICE |
| **Description** | Stock-in, stock-out, and related DTOs reject numeric JSON for `quantity` (e.g. `20` instead of `"20"`). |
| **Evidence source** | UAT 49 UAT-D-06; `49-uat-inventory-experience.md`; Capability Registry §5 item 14 |
| **Business impact** | Integrators see 400 validation errors; stock may appear unchanged |
| **Current workaround** | Send quantity as string in all REST inventory mutations |
| **Root cause** | DTO validation expects string type without numeric coercion |
| **Verification status** | Confirmed |

**Affects:** Task + Inventory Consumption, Inventory Items (REST path), Inventory Ledger mutations via REST, CSV Import (REST) when using transaction APIs.

---

#### FI-P04 — Unauthenticated test webhook exposed

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Classification** | BUG |
| **Description** | `POST /webhook/test` accepts arbitrary message injection without shared secret or production disable gate. |
| **Evidence source** | UAT 49 UAT-D-09; Capability Registry §5 item 13 |
| **Business impact** | If endpoint is publicly reachable, unauthorized parties can trigger WhatsApp workflows |
| **Current workaround** | Block route at reverse proxy in production; restrict to internal network |
| **Root cause** | Test route enabled in current build without env-gated protection |
| **Verification status** | Confirmed |

**Affects:** WhatsApp Test Webhook (primary); Structured Command Router when invoked via test webhook.

---

#### FI-P05 — UAT used test webhook, not production Meta webhook

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Classification** | UAT LIMITATION |
| **Description** | Phase 0–3 UAT exercised `/webhook/test` injection, not Meta production webhook payloads and signature verification. |
| **Evidence source** | UAT 49 UAT-D-11 |
| **Business impact** | Meta-specific edge cases (media, signatures, retries) not validated in business UAT |
| **Current workaround** | Supplement with Meta sandbox testing before go-live |
| **Root cause** | UAT methodology |
| **Verification status** | Confirmed |

**Affects:** WhatsApp Test Webhook, Structured Command Router.

---

### Feature Entries

---

#### Owner Onboarding (OTP)

| Field | Value |
|-------|-------|
| **Category** | Onboarding |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | REST API |
| **Dependencies** | PostgreSQL, OTP pepper, SMS (MSG91 optional) |

**Known issues**

| Issue ID | Severity | Description | Evidence | Business impact | Workaround | Root cause | Classification | Verification |
|----------|----------|-------------|----------|-----------------|------------|------------|----------------|--------------|
| FI-P01 | CRITICAL | ↳ inherits REST no auth | UAT 49 UAT-D-01 | Unauthorized onboarding/user data access | Private network only | No auth guard | BUG | Confirmed |
| FI-005 | MEDIUM | Dev OTP returned in API response when not in production | UAT 49 owner experience; Capability Registry notes | OTP visible to anyone who can call send endpoint in dev/staging | Use production mode + MSG91 for live; restrict network | Non-production dev convenience | DESIGN CHOICE | Confirmed |

---

#### Factory Management

| Field | Value |
|-------|-------|
| **Category** | Organization |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | REST API |
| **Dependencies** | PostgreSQL |

**Known issues:** FI-P01 only. UAT 49 PASS — no feature-specific defect logged.

---

#### Department Management

| Field | Value |
|-------|-------|
| **Category** | Organization |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | REST API |
| **Dependencies** | PostgreSQL |

**Known issues:** FI-P01 only. UAT 49 PASS (4 departments created).

---

#### Team Member Assignment

| Field | Value |
|-------|-------|
| **Category** | Organization |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | REST API |
| **Dependencies** | PostgreSQL |

**Known issues**

| Issue ID | Severity | Description | Evidence | Business impact | Workaround | Root cause | Classification | Verification |
|----------|----------|-------------|----------|-----------------|------------|------------|----------------|--------------|
| FI-P01 | CRITICAL | ↳ inherits REST no auth | UAT-D-01 | Unauthorized member changes | Private network | No auth guard | BUG | Confirmed |
| FI-004 | MEDIUM | Only OWNER, MANAGER, WORKER roles — no Inventory Manager or Vendor Coordinator enum | UAT 49 UAT-D-08; owner experience note | Specialist roles map to generic MANAGER | Document role mapping for operators | Product role model | DESIGN CHOICE | Confirmed |

---

#### User Management

| Field | Value |
|-------|-------|
| **Category** | Organization |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | REST API |
| **Dependencies** | PostgreSQL |

**Known issues:** FI-P01 only.

---

#### Owner Home Menu

| Field | Value |
|-------|-------|
| **Category** | Organization |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | WhatsApp |
| **Dependencies** | PostgreSQL, WhatsApp Provider, Inventory Module, Task Module |

**Known issues:** FI-P02. UAT 49 PASS for owner greeting.

---

#### Worker Onboarding Workflow

| Field | Value |
|-------|-------|
| **Category** | Workflows |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | WhatsApp |
| **Dependencies** | Workflow Engine, PostgreSQL, WhatsApp Provider |

**Known issues:** FI-P02. UAT 49 PASS (workflow start).

---

#### Purchase Request Create Workflow

| Field | Value |
|-------|-------|
| **Category** | Workflows |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | WhatsApp |
| **Dependencies** | Workflow Engine, Purchase Request Module, WhatsApp Provider |

**Known issues**

| Issue ID | Severity | Description | Evidence | Business impact | Workaround | Root cause | Classification | Verification |
|----------|----------|-------------|----------|-----------------|------------|------------|----------------|--------------|
| FI-P02 | HIGH | ↳ inherits messaging 401 | UAT-D-05, 99 DEF-ACC-001 | Workflow prompts may not deliver | Configure OLLI | Missing/invalid OLLI key | CONFIGURATION | Partially Confirmed |
| FI-002 | HIGH | PR must be submitted before approval — DRAFT cannot be approved via REST | UAT 49 UAT-D-04 | User completes workflow but REST-created DRAFT blocks approval path if mixed | Use `submit: true` on create or explicit submit step | Two-step PR lifecycle by design | DESIGN CHOICE | Confirmed |

---

#### Workflow Cancel

| Field | Value |
|-------|-------|
| **Category** | Workflows |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | WhatsApp |
| **Dependencies** | Workflow Engine |

**Known issues:** FI-P02. UAT 49 transcript PASS.

---

#### Mark Present

| Field | Value |
|-------|-------|
| **Category** | Attendance |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | WhatsApp |
| **Dependencies** | PostgreSQL, WhatsApp Provider |

**Known issues:** FI-P02. UAT 49 PASS.

---

#### Task Creation

| Field | Value |
|-------|-------|
| **Category** | Tasks |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | Multiple |
| **Dependencies** | PostgreSQL, Task Module, WhatsApp Provider |

**Known issues:** FI-P01 (REST), FI-P02 (WhatsApp). UAT 49 PASS via REST.

---

#### Task Assignment

| Field | Value |
|-------|-------|
| **Category** | Tasks |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | WhatsApp |
| **Dependencies** | Task Module, WhatsApp Provider |

**Known issues:** FI-P02.

---

#### Delivery Task Assignment

| Field | Value |
|-------|-------|
| **Category** | Tasks |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | WhatsApp |
| **Dependencies** | Task Module, Inventory Module, WhatsApp Provider |

**Known issues:** FI-P02. Phase 0 signoff 12/12 PASS (`99-phase0-signoff.md`); live WhatsApp delivery NOT VERIFIED (DEF-ACC-001).

---

#### Task Completion

| Field | Value |
|-------|-------|
| **Category** | Tasks |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | Multiple |
| **Dependencies** | Task Module, PostgreSQL, WhatsApp Provider |

**Known issues:** FI-P01 (REST), FI-P02 (WhatsApp). UAT 49 PASS.

---

#### Task Listing

| Field | Value |
|-------|-------|
| **Category** | Tasks |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | WhatsApp |
| **Dependencies** | Task Module, WhatsApp Provider |

**Known issues:** FI-P02. UAT 49 PASS (worker).

---

#### Task + Inventory Consumption

| Field | Value |
|-------|-------|
| **Category** | Tasks |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | Multiple |
| **Dependencies** | Task Module, Inventory Module, PostgreSQL |

**Known issues:** FI-P01, FI-P02, FI-P03. UAT 49 PASS; negative stock protection PRODUCTION READY (separate feature).

---

#### Inventory Categories

| Field | Value |
|-------|-------|
| **Category** | Inventory |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | REST API |
| **Dependencies** | PostgreSQL, Inventory Module |

**Known issues:** FI-P01. UAT 49 setup PASS.

---

#### Inventory Locations

| Field | Value |
|-------|-------|
| **Category** | Inventory |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | REST API |
| **Dependencies** | PostgreSQL, Inventory Module |

**Known issues:** FI-P01.

---

#### Inventory Items

| Field | Value |
|-------|-------|
| **Category** | Inventory |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | Multiple |
| **Dependencies** | PostgreSQL, Inventory Module |

**Known issues:** FI-P01, FI-P03. UAT 49 PASS.

---

#### Inventory Listing & Search

| Field | Value |
|-------|-------|
| **Category** | Inventory |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | REST API |
| **Dependencies** | PostgreSQL, Inventory Module |

**Known issues:** FI-P01. UAT 49 PASS.

---

#### Inventory Status Command

| Field | Value |
|-------|-------|
| **Category** | Inventory |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | WhatsApp |
| **Dependencies** | Inventory Module, WhatsApp Provider |

**Known issues:** FI-P02. UAT 49 / 7A transcript.

---

#### CSV Inventory Import (REST)

| Field | Value |
|-------|-------|
| **Category** | Import |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | REST API |
| **Dependencies** | PostgreSQL, Inventory Module |

**Known issues**

| Issue ID | Severity | Description | Evidence | Business impact | Workaround | Root cause | Classification | Verification |
|----------|----------|-------------|----------|-----------------|------------|------------|----------------|--------------|
| FI-P01 | CRITICAL | ↳ inherits REST no auth | UAT-D-01 | Unauthorized bulk inventory import | Private network | No auth guard | BUG | Confirmed |
| FI-P03 | MEDIUM | ↳ inherits quantity string | UAT-D-06 | Transaction API failures | Use string qty | DTO design | DESIGN CHOICE | Confirmed |
| FI-006 | MEDIUM | CSV `category` and `location` columns must match existing factory master names | Phase 1 `27-template-analysis.md`; UAT 50 test data setup; Registry §5 item 6 | Import fails or rows rejected if names not pre-seeded | Create categories/locations before import | Import resolves by name, no auto-create | DESIGN CHOICE | Confirmed |

Phase 1 signoff PASS (`27-phase1-final-signoff.md`).

---

#### CSV Inventory Import (WhatsApp)

| Field | Value |
|-------|-------|
| **Category** | Import |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | WhatsApp |
| **Dependencies** | PostgreSQL, Inventory Module, WhatsApp Provider |

**Known issues:** FI-P02, FI-006. Phase 1 integration 5/5 PASS.

---

#### Purchase Request Creation

| Field | Value |
|-------|-------|
| **Category** | Procurement |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | Multiple |
| **Dependencies** | PostgreSQL, Purchase Request Module, Inventory Module |

**Known issues:** FI-P01, FI-P02. UAT 49 PASS via REST.

---

#### Purchase Request Submit

| Field | Value |
|-------|-------|
| **Category** | Procurement |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | REST API |
| **Dependencies** | Purchase Request Module |

**Known issues**

| Issue ID | Severity | Description | Evidence | Business impact | Workaround | Root cause | Classification | Verification |
|----------|----------|-------------|----------|-----------------|------------|------------|----------------|--------------|
| FI-P01 | CRITICAL | ↳ inherits REST no auth | UAT-D-01 | Unauthorized PR state changes | Private network | No auth guard | BUG | Confirmed |
| FI-002 | HIGH | Create without `submit: true` leaves PR in DRAFT; not eligible for approve | UAT 49 UAT-D-04; Registry notes | Approval blocked with 400 | Pass `submit: true` on create or call submit endpoint | Explicit submit step required | DESIGN CHOICE | Confirmed |

---

#### Purchase Request Approval

| Field | Value |
|-------|-------|
| **Category** | Procurement |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | Multiple |
| **Dependencies** | Purchase Request Module, Workflow Engine |

**Known issues**

| Issue ID | Severity | Description | Evidence | Business impact | Workaround | Root cause | Classification | Verification |
|----------|----------|-------------|----------|-----------------|------------|------------|----------------|--------------|
| FI-P01 | CRITICAL | ↳ inherits REST no auth | UAT-D-01 | Unauthorized approvals | Private network | No auth guard | BUG | Confirmed |
| FI-P02 | HIGH | ↳ inherits messaging 401 | UAT-D-05 | WhatsApp approval confirm may fail | Configure OLLI | OLLI config | CONFIGURATION | Partially Confirmed |
| FI-002 | HIGH | Approve on DRAFT returns 400 | UAT 49 UAT-D-04 | User cannot approve until submitted | Submit first | PR lifecycle | DESIGN CHOICE | Confirmed |
| FI-003 | LOW | Approve DTO requires `performed_by`, not `actor_id` | UAT 49 UAT-D-12 | Integrator 400 on wrong field name | Use `performed_by` | API field naming | DESIGN CHOICE | Confirmed |

---

#### Low Stock PR Suggestions

| Field | Value |
|-------|-------|
| **Category** | Procurement |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | REST API |
| **Dependencies** | Inventory Module, Purchase Request Module |

**Known issues:** FI-P01.

---

#### Purchase Request Prefill (Low Stock)

| Field | Value |
|-------|-------|
| **Category** | Procurement |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | Multiple |
| **Dependencies** | Purchase Request Module, Inventory Module |

**Known issues**

| Issue ID | Severity | Description | Evidence | Business impact | Workaround | Root cause | Classification | Verification |
|----------|----------|-------------|----------|-----------------|------------|------------|----------------|--------------|
| FI-P01 | CRITICAL | ↳ inherits REST no auth | UAT-D-01 | Unauthorized prefill access | Private network | No auth guard | BUG | Confirmed |
| FI-P02 | HIGH | ↳ inherits messaging 401 | UAT-D-05 | CTA workflow prompt may not deliver | Configure OLLI | OLLI config | CONFIGURATION | Partially Confirmed |
| FI-001 | CRITICAL | `GET /purchase-requests/prefill/low-stock` returned 404 on UAT server (stale runtime) | UAT 49 UAT-D-02; Registry notes; `45-purchase-request-prefill-validation.md` integration PASS | Prefill unavailable until backend restarted with current build | Restart/redeploy backend; verify route in smoke test | UAT env running older process on port 4001 | ENVIRONMENT | Confirmed |

Integration: 115/115 PASS including prefill suite (`45-purchase-request-prefill-validation.md`).

---

#### Low Stock Owner Alerts

| Field | Value |
|-------|-------|
| **Category** | Alerts |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | WhatsApp |
| **Dependencies** | Domain Events, Inventory Module, WhatsApp Provider |

**Known issues**

| Issue ID | Severity | Description | Evidence | Business impact | Workaround | Root cause | Classification | Verification |
|----------|----------|-------------|----------|-----------------|------------|------------|----------------|--------------|
| FI-P02 | HIGH | ↳ inherits messaging 401 | UAT-D-05 | Alert not delivered to owner | Configure OLLI | OLLI config | CONFIGURATION | Partially Confirmed |
| FI-007 | INFO | Alert message copy validated in integration tests; live WhatsApp delivery not exercised in UAT 49 | UAT 49 UAT-D-15; `41-low-stock-validation.md` integration PASS | Operators cannot confirm live copy without staging WhatsApp | Run staging test with sandbox number | UAT scope | UAT LIMITATION | Confirmed |

---

#### Low Stock Manager Alerts

| Field | Value |
|-------|-------|
| **Category** | Alerts |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | WhatsApp |
| **Dependencies** | Domain Events, Departments Module, WhatsApp Provider |

**Known issues:** FI-P02, FI-007. Integration Phase 3.3A PASS (`44-manager-alert-validation.md`).

---

#### Task Completion Notifications

| Field | Value |
|-------|-------|
| **Category** | Alerts |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | WhatsApp |
| **Dependencies** | Task Module, WhatsApp Provider |

**Known issues:** FI-P02, FI-007. Phase 0 signoff; DEF-ACC-001 documents 401 with committed task side effects.

---

#### Integration Sync Failure Alerts

| Field | Value |
|-------|-------|
| **Category** | Alerts |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | WhatsApp |
| **Dependencies** | Domain Events, Integration Module, WhatsApp Provider |

**Known issues:** FI-P02, FI-007. Integration Phase 3.2 PASS (`42-sync-failure-validation.md`).

---

#### Zoho Push Delivery Tracking

| Field | Value |
|-------|-------|
| **Category** | Alerts / Integration visibility |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | REST API |
| **Dependencies** | Integration Module, PostgreSQL |

**Known issues**

| Issue ID | Severity | Description | Evidence | Business impact | Workaround | Root cause | Classification | Verification |
|----------|----------|-------------|----------|-----------------|------------|------------|----------------|--------------|
| FI-P01 | CRITICAL | ↳ inherits REST no auth | UAT-D-01 | Unauthorized view of push delivery records | Private network | No auth guard | BUG | Confirmed |
| FI-001 | CRITICAL | `GET /integrations/zoho/sync/push-deliveries` returned 404 on UAT server (stale runtime) | UAT 49 UAT-D-02; Registry notes; Phase 2 integration PASS (`39-phase2-signoff.md`) | Ops cannot list push deliveries until redeploy | Restart/redeploy backend | Stale UAT process | ENVIRONMENT | Confirmed |

---

#### Zoho Connections List

| Field | Value |
|-------|-------|
| **Category** | Integration |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | REST API |
| **Dependencies** | PostgreSQL, Integration Module |

**Known issues:** FI-P01 only. UAT 49 PASS (empty list when no connection).

*Note: Zoho OAuth Connect is CONDITIONAL (not RWKI). OAuth env misconfiguration (UAT-D-03) is documented under that feature in the Capability Registry, not here.*

---

#### WhatsApp Test Webhook

| Field | Value |
|-------|-------|
| **Category** | WhatsApp |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | REST API |
| **Dependencies** | WhatsApp Service |

**Known issues:** FI-P04 (primary), FI-P05. Used for all UAT 49 injection.

---

#### Structured Command Router

| Field | Value |
|-------|-------|
| **Category** | WhatsApp |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | WhatsApp |
| **Dependencies** | WhatsApp Service, Workflow Engine |

**Known issues:** FI-P02, FI-P04 (when accessed via test webhook), FI-P05. UAT 49 PASS — 5/5 commands.

---

#### Command Help

| Field | Value |
|-------|-------|
| **Category** | WhatsApp |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | WhatsApp |
| **Dependencies** | WhatsApp Provider |

**Known issues:** FI-P02. UAT 49 PASS.

---

#### Members List

| Field | Value |
|-------|-------|
| **Category** | WhatsApp |
| **Current state** | READY WITH KNOWN ISSUES |
| **Availability** | WhatsApp |
| **Dependencies** | User Module, WhatsApp Provider |

**Known issues:** FI-P02. UAT 49 exercised.

---

## Section 3 — Issue Matrix

| Feature | Issue count (incl. inherited) | Highest severity | Blocking? | User impact |
|---------|------------------------------|------------------|-----------|-------------|
| Owner Onboarding (OTP) | 2 | CRITICAL | Yes (public REST) | Security + dev OTP leak in non-prod |
| Factory Management | 1 | CRITICAL | Yes (public REST) | Unauthorized factory CRUD |
| Department Management | 1 | CRITICAL | Yes | Unauthorized org structure changes |
| Team Member Assignment | 2 | CRITICAL | Yes | Unauthorized role assignment; role granularity |
| User Management | 1 | CRITICAL | Yes | Unauthorized user CRUD |
| Owner Home Menu | 1 | HIGH | Partial | Menu may not render on messaging failure |
| Worker Onboarding Workflow | 1 | HIGH | Partial | Workflow prompts undelivered |
| Purchase Request Create Workflow | 2 | HIGH | Partial | PR submit/approve confusion; messaging |
| Workflow Cancel | 1 | HIGH | No | Cancel ack may not deliver |
| Mark Present | 1 | HIGH | Partial | Attendance ack may not deliver |
| Task Creation | 2 | CRITICAL | Yes (REST) / Partial (WA) | Unauthorized tasks; messaging |
| Task Assignment | 1 | HIGH | Partial | Assignment confirm may fail |
| Delivery Task Assignment | 1 | HIGH | Partial | Confirm may fail; logic PASS |
| Task Completion | 2 | CRITICAL / HIGH | Partial | REST exposure; notify may fail |
| Task Listing | 1 | HIGH | No | List may not return to user |
| Task + Inventory Consumption | 3 | CRITICAL | Yes (REST) | Stock API misuse; messaging |
| Inventory Categories | 1 | CRITICAL | Yes | Unauthorized master data |
| Inventory Locations | 1 | CRITICAL | Yes | Unauthorized master data |
| Inventory Items | 2 | CRITICAL | Yes | Unauthorized item CRUD; qty type |
| Inventory Listing & Search | 1 | CRITICAL | Yes | Data exposure |
| Inventory Status Command | 1 | HIGH | No | Status reply may fail |
| CSV Inventory Import (REST) | 3 | CRITICAL | Yes | Bulk import exposure; setup friction |
| CSV Inventory Import (WhatsApp) | 2 | HIGH | Partial | Import works; summary may fail |
| Purchase Request Creation | 2 | CRITICAL / HIGH | Partial | REST exposure |
| Purchase Request Submit | 2 | CRITICAL | Yes | DRAFT trap for approvers |
| Purchase Request Approval | 4 | CRITICAL | Yes | Approve blocked on DRAFT; field naming |
| Low Stock PR Suggestions | 1 | CRITICAL | Yes | Unauthorized suggestions read |
| Purchase Request Prefill | 3 | CRITICAL | Yes (UAT env) | Prefill 404 until redeploy |
| Low Stock Owner Alerts | 2 | HIGH | Partial | Alert may not reach owner |
| Low Stock Manager Alerts | 2 | HIGH | Partial | Alert may not reach manager |
| Task Completion Notifications | 2 | HIGH | Partial | Assigner may not be notified |
| Integration Sync Failure Alerts | 2 | HIGH | Partial | Owner/manager may not be warned |
| Zoho Push Delivery Tracking | 2 | CRITICAL | Yes (UAT env) | Visibility 404 until redeploy |
| Zoho Connections List | 1 | CRITICAL | Yes | Connection metadata exposed |
| WhatsApp Test Webhook | 2 | MEDIUM | Yes (if exposed) | Open workflow injection |
| Structured Command Router | 3 | HIGH | Partial | Commands work; delivery/method gaps |
| Command Help | 1 | HIGH | No | Help text may not deliver |
| Members List | 1 | HIGH | No | Member list may not deliver |

**Blocking definition:** "Yes" = prevents safe production use without mitigation (typically FI-P01 on public REST, FI-001 on stale deploy, or FI-P04 if test webhook public). "Partial" = core logic persists in DB but user-facing delivery or operator workflow friction remains.

---

## Section 4 — Issues by Severity

### CRITICAL

| Issue ID | Title | Features affected |
|----------|-------|-------------------|
| FI-P01 | REST API has no authentication | All REST-exposed RWKI features (38) |
| FI-001 | Stale UAT runtime — missing prefill and push-delivery routes | Purchase Request Prefill, Zoho Push Delivery Tracking |

### HIGH

| Issue ID | Title | Features affected |
|----------|-------|-------------------|
| FI-P02 | WhatsApp outbound messaging 401 when OLLI misconfigured | All WhatsApp RWKI features (~25) |
| FI-002 | PR approve fails on DRAFT without prior submit | Purchase Request Submit, Approval, Create Workflow |

### MEDIUM

| Issue ID | Title | Features affected |
|----------|-------|-------------------|
| FI-P03 | REST quantity must be string | Task + Inventory Consumption, Inventory Items, CSV Import (REST) |
| FI-P04 | Unauthenticated test webhook | WhatsApp Test Webhook, Structured Command Router |
| FI-004 | No specialist user roles (MANAGER only) | Team Member Assignment |
| FI-005 | Dev OTP returned in non-production API | Owner Onboarding (OTP) |
| FI-006 | CSV category/location names must pre-exist | CSV Inventory Import (REST), CSV Inventory Import (WhatsApp) |

### LOW

| Issue ID | Title | Features affected |
|----------|-------|-------------------|
| FI-003 | PR approve requires `performed_by` field name | Purchase Request Approval |
| FI-P05 | UAT used test webhook not Meta production webhook | WhatsApp Test Webhook, Structured Command Router |

### INFO

| Issue ID | Title | Features affected |
|----------|-------|-------------------|
| FI-007 | Alert copy not live-verified on WhatsApp in UAT 49 | Low Stock Owner/Manager Alerts, Task Completion Notifications, Integration Sync Failure Alerts |

---

## Section 5 — Issues by Type

### CONFIGURATION

| Issue ID | Description |
|----------|-------------|
| FI-P02 | OLLI / messaging credentials required for outbound WhatsApp |

### ENVIRONMENT

| Issue ID | Description |
|----------|-------------|
| FI-001 | Backend process on UAT port 4001 missing Phase 3.4+ routes (404) |

### BUG

| Issue ID | Description |
|----------|-------------|
| FI-P01 | REST API lacks authentication |
| FI-P04 | Test webhook open without secret or production disable |

### DESIGN CHOICE

| Issue ID | Description |
|----------|-------------|
| FI-002 | Two-step PR lifecycle (DRAFT → submit → approve) |
| FI-003 | `performed_by` field naming on approve DTO |
| FI-004 | OWNER / MANAGER / WORKER role enum only |
| FI-005 | Dev OTP in API response outside production |
| FI-006 | CSV import resolves category/location by existing names |
| FI-P03 | Quantity fields typed as string in REST DTOs |

### UAT LIMITATION

| Issue ID | Description |
|----------|-------------|
| FI-P05 | Business UAT via `/webhook/test`, not Meta webhook |
| FI-007 | Alert WhatsApp delivery not exercised live in UAT 49 |

### EXTERNAL DEPENDENCY

*No standalone issue IDs in this registry.* Messaging failures (FI-P02) are classified as CONFIGURATION because remediation is env credential setup, not third-party outage documentation.

---

## Section 6 — Features With No Feature-Specific Active Issues

The following **21** features are marked READY WITH KNOWN ISSUES in the Capability Registry but have **no defect logged against the feature itself** beyond inherited platform issues (FI-P01 and/or FI-P02). Registry state reflects product-wide security and messaging posture.

| Feature | Evidence | Inherited platform issues only |
|---------|----------|-------------------------------|
| Factory Management | UAT 49 PASS | FI-P01 |
| Department Management | UAT 49 PASS (4 departments) | FI-P01 |
| User Management | UAT 49 setup PASS | FI-P01 |
| Owner Home Menu | UAT 49 PASS (owner greeting) | FI-P02 |
| Worker Onboarding Workflow | UAT 49 PASS (workflow start) | FI-P02 |
| Workflow Cancel | UAT 49 transcript PASS | FI-P02 |
| Mark Present | UAT 49 PASS | FI-P02 |
| Task Creation | UAT 49 REST PASS | FI-P01, FI-P02 |
| Task Assignment | Commands registered; UAT 49 scope | FI-P02 |
| Delivery Task Assignment | Phase 0 12/12 PASS (`99-phase0-signoff.md`) | FI-P02 |
| Task Completion | UAT 49 PASS | FI-P01, FI-P02 |
| Task Listing | UAT 49 worker PASS | FI-P02 |
| Inventory Categories | UAT 49 setup | FI-P01 |
| Inventory Locations | UAT 49 setup | FI-P01 |
| Inventory Listing & Search | UAT 49 PASS | FI-P01 |
| Inventory Status Command | UAT 49 / 7A transcript | FI-P02 |
| Purchase Request Creation | UAT 49 REST PASS | FI-P01, FI-P02 |
| Low Stock PR Suggestions | Endpoint exists; integration covered in suite | FI-P01 |
| Zoho Connections List | UAT 49 PASS empty list | FI-P01 |
| Command Help | UAT 49 PASS | FI-P02 |
| Members List | UAT 49 exercised | FI-P02 |

---

## Section 7 — Verification Sources

| Source | Path / reference | Used for |
|--------|------------------|----------|
| **Capability Registry** | `docs/docs_local/current-capability-registry.md` | Feature list, states, limitations §5 |
| **UAT 49 — Defects** | `docs/docs_local/inventory/49-uat-defects.md` | UAT-D-01 through UAT-D-15 |
| **UAT 49 — Signoff** | `docs/docs_local/inventory/49-uat-signoff.md` | Overall RWKI verdict |
| **UAT 49 — Owner experience** | `docs/docs_local/inventory/49-uat-owner-experience.md` | Onboarding, roles, dev OTP |
| **UAT 49 — Inventory experience** | `docs/docs_local/inventory/49-uat-inventory-experience.md` | Quantity string friction |
| **UAT 50 — Defects** | `docs/docs_local/inventory/50-document-uat-defects.md` | FI-P02 cross-ref (messaging 401); CSV baseline setup |
| **UAT 50 — Test data** | `docs/docs_local/inventory/50-document-uat-test-data.md` | Category/location pre-seed requirement |
| **Phase 0 signoff** | `docs/docs_local/inventory/99-phase0-signoff.md` | Task-inventory, DEF-ACC-001 |
| **Phase 0 defects** | `docs/docs_local/inventory/99-phase0-defects.md` | OLLI 401 behaviour |
| **Phase 1 signoff** | `docs/docs_local/inventory/27-phase1-final-signoff.md` | CSV import PASS |
| **Phase 1 template analysis** | `docs/docs_local/inventory/27-template-analysis.md` | Category/location name matching |
| **Phase 2 signoff** | `docs/docs_local/inventory/39-phase2-signoff.md` | Zoho integration integration PASS |
| **Phase 3.1 validation** | `docs/docs_local/inventory/41-low-stock-validation.md` | Low stock owner alerts integration |
| **Phase 3.2 validation** | `docs/docs_local/inventory/42-sync-failure-validation.md` | Sync failure alerts integration |
| **Phase 3.3A validation** | `docs/docs_local/inventory/44-manager-alert-validation.md` | Manager alerts integration |
| **Phase 3.4 validation** | `docs/docs_local/inventory/45-purchase-request-prefill-validation.md` | Prefill integration PASS |
| **Integration tests** | 115/115 PASS (`npm run test:integration -- --runInBand`) | Prefill, alerts, Zoho, CSV, tasks |

### Explicitly excluded from this registry

| Item | Reason |
|------|--------|
| UAT-D-03 (Zoho OAuth env) | Feature **Zoho OAuth Connect** is CONDITIONAL, not RWKI |
| UAT-D-07 (document parsing E2E) | Document parsing features are CONDITIONAL |
| UAT-D-10 (ML service down) | Free-text / ML features are NOT VERIFIED |
| DOC-UAT-D-02, D-03, D-04, D-05 (document pipeline) | Apply to CONDITIONAL document features |
| UAT-D-13 (duplicate complete PASS) | Correct behaviour, not a defect |
| UAT-D-14 (port EADDRINUSE) | Operational INFO; no RWKI feature ownership |
| Roadmap / backlog items | Per document scope rules |

---

*End of registry. Update when Capability Registry state changes or new UAT/signoff evidence is recorded.*
