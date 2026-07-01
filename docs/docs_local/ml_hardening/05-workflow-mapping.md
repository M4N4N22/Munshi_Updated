# Phase 5 — Workflow Mapping

## Direct commands (single-shot)

| Command | Start | Process | End |
|---------|-------|---------|-----|
| /present, /absent | User sends command | Record attendance for today | Confirmation message |
| /tasks | User sends command | Fetch tasks by role | Formatted task list |
| /complete [id] | User + taskId | Validate → complete → optional inventory | Task closed |
| /update [id] msg | Worker + id + text | Append update | Update logged |
| /issue [msg] | User + message | Create issue | Issue ID returned |
| /issues | Manager/owner | List active | Issue list |
| /resolve [id] | Manager/owner | Mark resolved | Closure message |
| /members | Manager/owner | Load factory + depts | Roster |
| /report [date?] | Manager/owner | Generate attendance report | Report text |
| /help | Any user | Build role help | Help messages |
| /mgrself [id] | Manager | Accept owner task | Assignment updated |
| /mgrassign [id] @w | Manager | Delegate to worker | Worker notified |
| /mgrtransfer [id] dept | Manager | Change department | Transfer notice |
| /mgrreject [id] reason | Manager | Reject + notify owner | Rejection logged |
| /assign @w desc | Owner/manager | Parse → create task | Task created |
| /depart_assign dept desc | Owner/manager | Dept slug match → task | Dept task |
| /assign_delivery @w sku qty | Manager | Resolve mention + SKU → task w/ inventory meta | Delivery task |
| /inventory_status [sku?] | Manager/owner | Lookup or low-stock scan | Status message |

## Multi-step workflows

| Command | Start | Process steps | End |
|---------|-------|---------------|-----|
| /onboard_vendor | `/onboard_vendor` | Name → contact → … → confirm | Vendor in DB |
| /onboard_worker | `/onboard_worker` | Name → phone → dept → role → DOJ | User + factory_link |
| /inventory_create | `/inventory_create` or home CTA | Name → SKU → category → unit → qty → confirm | inventory_items row |
| /inventory_import_csv | `/inventory_import_csv` + CSV doc | Parse → review list → CONFIRM/CANCEL | Stock-in transactions |
| /purchase_request_create | Command or low-stock CTA | Items → quantities → approval | purchase_requests |
| /business_discovery | NL or `/business_discovery` | Progressive profile fields | business profile updated |
| /continue_discovery | Resume phrase or command | Same handler, restore session | Profile progress |
| /suggestion_approve | After document ingest | Show suggestion → yes/no | Action executed or skipped |
| /assign_clarify | ML routes ambiguous assign | Pick worker from list | `/assign` equivalent |
| /task_inventory_nl | NL "deliver 50 widgets" | Intent → worker disambiguation → confirm | Task + inventory |
| /cancel | During any workflow | Clear session | "Cancelled" |

## ML routing path (no active session)

```
Message → (slash bypass?) → processCommand
       → (workflow start?) → startWorkflowFromCommand
       → (low-stock CTA?) → purchase_request_create
       → (free text NL task?) → taskInventoryNl.tryHandleFreeText
       → (slash?) → processCommand
       → POST /classify → normalizeIntentCommand → workflow or processCommand
       → general_chat → conversational reply
```
