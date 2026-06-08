# Hardening Priority Report

## TOP 10 opportunities (ranked)

| Rank | Opportunity | Est. accuracy gain | Effort | Business impact | Evidence |
|------|-------------|-------------------|--------|-----------------|----------|
| 1 | Manager NL regex/LLM few-shot for mgrtransfer/mgrreject/mgrself | +25-30% on manager workflows | Medium | Critical | 30 mgr failures → ~0 |
| 2 | Bare members + English team phrases → /members | +5-8% member_lookup | Low | High | Known staging gap |
| 3 | Department slug detection in Hinglish (sales ko, IT team) | +15% dept_assignment | Medium | High | 8 dept failures |
| 4 | Route delivery NL to task-inventory extractor before /assign | +20% inventory_delivery | Medium | High | Dual-path fix |
| 5 | LLM few-shot expansion for resolve vs complete | +10% issue_resolve | Low | Medium | 11 resolve confusions |
| 6 | Typo-tolerant fuzzy layer for top 20 commands | +15% L7 accuracy | High | Medium | Typos 14% acc |
| 7 | inventory_status + purchase_request NL patterns | +15% stock/PR | Medium | Medium | 15 LLM fails |
| 8 | Short-command dictionary (present, leave, help, report) | +10% MSME/short | Low | Medium | Fragment input |
| 9 | Assign_clarify trigger refinement (reduce false positives) | +5% overall | Medium | Medium | tasks→clarify |
| 10 | Inventory extractor: broken English + ambiguous material | +10% extract | Medium | Medium | extract:null cases |