# Demo Natural Language Validation Report

Validation method: ML `POST /classify` → `POST /webhook/test` → DB snapshot.  
**No slash commands** in approved demo phrases.

## Summary

| Metric | Value |
|--------|-------|
| Phrases tested | 12 |
| Passed | 10 |
| Safe for video | 10 |

## Approved Demo Phrases (SAFE)

| Flow | Phrase | Intent | DB Mutation |
|------|--------|--------|-------------|
| attendance_present | Aaj main present hoon | /present | ✅ |
| task_assign | Rahul Kumar ko store check ka kaam do | /assign | ✅ |
| inventory_status | Steel sheets ka stock kitna bacha hai | /inventory_status | ✅ |
| vendor_onboard | Naya vendor Gupta Metals add karo | /onboard_vendor | ✅ |
| purchase_request | purchase request bana do | /purchase_request_create | ✅ |
| report | Mujhe aaj ka report dikhao | /report | ✅ |
| tasks_list | mere tasks dikhao | /tasks | ✅ |
| task_update | task update kaam shuru ho gaya | /update | ✅ |
| task_complete | kaam complete ho gaya | /complete | ✅ |
| business_discovery | mera business setup karna hai | /business_discovery | ✅ |

## Hardened Replacements (use these in the video)

| Original (unstable) | Hardened phrase | Reason |
|---------------------|-----------------|--------|
| Rahul ko inventory check karne ka task de do | **Rahul Kumar ko store check ka kaam do** | Avoid "inventory" — ML confuses with `/inventory_status` |
| task complete inventory check ho gaya | **kaam complete ho gaya** | Same confusion |
| task update inventory check shuru ho gaya | **task update kaam shuru ho gaya** | Stable `/update` classification |
| Rahul ko loading ka kaam do (manager, no task id) | **task [ID] Rahul Kumar ko do** | Requires routed task id from prior Munshi message |

## Excluded / Risky Phrases

- **Rahul ko loading ka kaam do** → predicted `/assign` (expected `/mgrassign`)
- **main khud yeh kaam karunga** → predicted `general_chat` (expected `/mgrself`)

## Vendor Lookup

Standalone vendor lookup NL (**"Gupta Metals vendor dikhao"**) classifies as `general_chat`. **Do not demo standalone vendor lookup.** Show Gupta Metals during purchase-request vendor assignment instead.
