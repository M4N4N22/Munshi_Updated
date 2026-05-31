# Prompt 10 — Intent Report

## SECTION A — Backend Implementation

WhatsApp command registered: `COMMANDS.PURCHASE_REQUEST_CREATE = '/purchase_request_create'`.

Workflow router matches command via existing `WorkflowRegistry.matchWorkflowStartCommand()`.

## SECTION B — LLM Requirements

**Intent**: `/purchase_request_create`

**Examples added** (EN/HI/Hinglish):
- Create purchase request / procurement request banao
- Need cement / need steel / need raw material
- Order packaging material / buy steel
- steel kharidna hai

**Pre-classifier regex**: `_PURCHASE_REQUEST_CREATE_RE` in `bot_engine.py`

**Slash bypass**: `/purchase_request_create` in command parser

## SECTION C — Contract Requirements

`contracts/intent-types.json` updated in both repos.

## SECTION D — Training Data Requirements

Generate `data/eval/intents/purchase_request_create.json` with 100 labeled examples for eval harness v2.

## SECTION E — Future Automation Opportunities

Intent slots for `item_name`, `quantity` extracted by ML to pre-fill workflow session (reduce steps).
