# Prompt 11 — Workflow Report

## SECTION A — Backend Implementation

Workflow type **`BUSINESS_DISCOVERY`** registered in `WorkflowRegistry` with alias `/continue_discovery`.

| Step | ID | Behavior |
|------|-----|----------|
| 1 | `MENU` | Choose bucket (identity/org/inventory/vendors) or view progress |
| 2 | `COLLECT` | Collect fields per bucket; SKIP supported; `pause` ends session |

Reuses: persisted `workflow_sessions`, `/cancel`, role gates (owner/manager), `WorkflowSessionService`.

Handler: `src/services/workflow/handlers/business-discovery.handler.ts`

Pause completes session without blocking app usage. Resume calls `BusinessDiscoveryService.resume()` and continues from last bucket state in profile + optional new session.

## SECTION B — LLM Requirements

Natural language maps to workflow start commands. `workflow_pre_classify` runs before LLM for high-confidence discovery phrases.

## SECTION C — Contract Requirements

```json
{
  "workflow_type": "BUSINESS_DISCOVERY",
  "start_command": "/business_discovery",
  "resume_command": "/continue_discovery",
  "steps": ["MENU", "COLLECT"]
}
```

Session data: `current_bucket`, `field_index` (stored in workflow session row only).

## SECTION D — Training Data Requirements

Avoid collision with vendor onboarding ("add vendor" → `/onboard_vendor`) vs discovery ("import vendors" → `/business_discovery`).

## SECTION E — Future Automation Opportunities

Resume active session with last unanswered field prompt when owner sends `/continue_discovery` without re-showing full menu.
