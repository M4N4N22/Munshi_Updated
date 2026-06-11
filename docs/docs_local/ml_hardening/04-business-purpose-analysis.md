# Phase 4 — Business Purpose Analysis

Real-world operational framing for each command.

## Attendance

| Command | Why use it | Problem solved | Outcome |
|---------|------------|----------------|---------|
| /present | Daily check-in from factory floor | Paper registers, supervisor chasing | Attendance record for payroll |
| /absent | Report leave same day | Unknown absenteeism | Accurate headcount |

## Tasks & delegation

| Command | Why use it | Problem solved | Outcome |
|---------|------------|----------------|---------|
| /tasks | "What do I do today?" | Work scattered on calls | Single task inbox |
| /complete | Close finished work | Tasks stuck open | Completion + stock movements if linked |
| /assign | Owner delegates without app | Verbal instructions lost | Assigned task with deadline |
| /assign_clarify | "Get this done" without naming person | Ambiguous NL assign | Guided assignee pick |
| /depart_assign | Route to department not person | Wrong person assigned | Dept queue |
| /assign_delivery | Ship/deliver specific SKU qty | Stock + delivery disconnected | Task tied to inventory line |
| /task_inventory_nl | Natural delivery/count/issue | Typing slash syntax | Same as structured delivery tasks |
| /mgrself | Manager takes owner task | Owner overload | Manager ownership |
| /mgrassign | Manager splits to worker | Bottleneck at manager | Worker execution |
| /mgrtransfer | Wrong department | Misrouted work | Correct dept |
| /mgrreject | Task not for this dept | Silent failure | Owner notified |
| /update | Worker reports progress | No visibility mid-task | Audit trail on task |

## Inventory

| Command | Why use it | Problem solved | Outcome |
|---------|------------|----------------|---------|
| /inventory_create | Add SKU to system | Excel-only stock | Searchable master |
| /inventory_status | "How much X?" | Stock surprises | Current qty / low stock list |
| /inventory_import_csv | Bulk load from Zoho/export | Manual one-by-one entry | Validated bulk import |

## Procurement

| Command | Why use it | Problem solved | Outcome |
|---------|------------|----------------|---------|
| /purchase_request_create | Reorder when low | Reactive buying | PR with approval path |

## Issues

| Command | Why use it | Problem solved | Outcome |
|---------|------------|----------------|---------|
| /issue | Report breakdown/blocker | Problems only on phone calls | Tracked issue |
| /issues | Manager oversight | Unknown open problems | Active issue list |
| /resolve | Close fixed issue | Issues never closed | Resolution record |

## Onboarding & master data

| Command | Why use it | Problem solved | Outcome |
|---------|------------|----------------|---------|
| /onboard_worker | Add employee to WhatsApp | HR spreadsheet | User can /present, /tasks |
| /onboard_vendor | Add supplier | Vendor chaos | Vendor for POs |
| /business_discovery | Initial company profile | Empty tenant | Factory metadata for ML/routing |
| /continue_discovery | Resume setup | Interrupted onboarding | Completed profile |

## Team & reporting

| Command | Why use it | Problem solved | Outcome |
|---------|------------|----------------|---------|
| /members | Who works here | Tribal knowledge | Roster + departments |
| /report | Attendance for date | Manual tally | Report for owner/manager |

## Documents & AI

| Command | Why use it | Problem solved | Outcome |
|---------|------------|----------------|---------|
| /suggestion_approve | Confirm AI-parsed document action | Blind automation | Human-in-loop approval |

## Meta

| Command | Why use it | Problem solved | Outcome |
|---------|------------|----------------|---------|
| /help | Learn commands | Low adoption | Guided usage |
| /cancel | Abort multi-step flow | Stuck in workflow | Clean session |
