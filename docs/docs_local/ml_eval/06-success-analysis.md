# Success Analysis

**Intent-correct cases:** 164 / 349 (47.0%)

## Top 20 strongest patterns

1. **home_menu** — intent acc 100.0% (n=12)
2. **task_completion** — intent acc 83.3% (n=12)
3. **onboard_vendor** — intent acc 83.3% (n=12)
4. **inventory_create** — intent acc 75.0% (n=12)
5. **business_discovery** — intent acc 75.0% (n=12)
6. **inventory_count** — intent acc 66.7% (n=12)
7. **attendance_present** — intent acc 61.5% (n=13)
8. **inventory_status** — intent acc 58.3% (n=12)
9. **onboard_worker** — intent acc 58.3% (n=12)
10. **attendance_absent** — intent acc 50.0% (n=12)
11. **task_update** — intent acc 50.0% (n=12)
12. **issue_list** — intent acc 50.0% (n=12)
13. **general_help** — intent acc 50.0% (n=12)
14. **inventory_issue** — intent acc 50.0% (n=12)
15. **task_assignment** — intent acc 41.7% (n=12)
16. **task_listing** — intent acc 41.7% (n=12)
17. **member_lookup** — intent acc 41.7% (n=12)
18. **purchase_request** — intent acc 41.7% (n=12)
19. **report** — intent acc 41.7% (n=12)
20. **assign_clarify** — intent acc 41.7% (n=12)

## What works well today

- **Slash commands** — `/present`, `/tasks`, `/complete`, `/onboard_*`, `/help` bypass ML reliably
- **Deterministic operational regex** — Hindi/Hinglish attendance, tasks, issues with clear keywords
- **Member lookup phrases** — `team members dikhao` hits `/members` (not bare `members`)
- **Assign clarify** — Unassigned work without @mention routes to `/assign_clarify`
- **Home / greeting** — `general_chat` stable for owner home menu path
- **Task-inventory extractor** — Structured `X ko N item deliver/issue` patterns (not all variants)
- **Worker onboarding / vendor / inventory_create** — workflow intents with keyword triggers
- **Business discovery** — phrase list matches registry

## Success mechanism breakdown

- Deterministic regex pre-classify: 114
- Slash command parser: 19
- Task-inventory extractor: 18
- General chat / home triggers: 10
- LLM or hybrid correct: 1
- Canonical slash commands: 1
- Hindi operational phrases: 1