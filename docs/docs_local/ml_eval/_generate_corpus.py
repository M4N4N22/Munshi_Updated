"""Generate benchmark_corpus.json — evaluation artifact only."""
import json
from pathlib import Path

corpus = []
cid = 0


def add(workflow, role, level, lang, message, expected_intent, entities=None, eval_type="classify"):
    global cid
    cid += 1
    corpus.append({
        "case_id": f"B-{cid:04d}",
        "workflow": workflow,
        "role": role,
        "level": level,
        "language": lang,
        "message": message,
        "expected_intent": expected_intent,
        "expected_entities": entities,
        "eval_type": eval_type,
    })


def bulk(workflow, role, cases, eval_type="classify"):
    for level, lang, message, expected_intent, *rest in cases:
        entities = rest[0] if rest else None
        add(workflow, role, level, lang, message, expected_intent, entities, eval_type)


bulk("attendance_present", "WORKER", [
    (1, "english", "/present", "/present"),
    (1, "hinglish", "present", "/present"),
    (2, "english", "I am here today", "/present"),
    (3, "hindi", "aaj main present hoon", "/present"),
    (4, "hinglish", "main aa gaya factory", "/present"),
    (5, "broken", "present today i come", "/present"),
    (6, "msme", "shift mein present", "/present"),
    (7, "typos", "presnt hu aaj", "/present"),
    (8, "short", "present", "/present"),
    (9, "conversational", "boss main pahunch gaya factory ab", "/present"),
    (10, "context", "kal bola tha aaj aaunga main aa gaya", "/present"),
    (11, "ambiguous", "aaj aa gaya", "/present"),
    (12, "multi", "present hu aur tasks dikhao", "/present"),
])

bulk("attendance_absent", "WORKER", [
    (1, "english", "/absent", "/absent"),
    (2, "english", "I will not come today", "/absent"),
    (3, "hindi", "aaj nahi aa paunga bimar hu", "/absent"),
    (4, "hinglish", "not coming today leave", "/absent"),
    (5, "broken", "today no come sick", "/absent"),
    (6, "msme", "chutti chahiye", "/absent"),
    (7, "typos", "absnt aaj", "/absent"),
    (8, "short", "leave", "/absent"),
    (9, "conversational", "bukhar hai aaj factory nahi aa sakta", "/absent"),
    (10, "context", "doctor ne rest bola hai kal se aaunga", "/absent"),
    (11, "ambiguous", "aaj nahi", "/absent"),
    (12, "multi", "absent hu aur kal aaunga", "/absent"),
])

bulk("task_assignment", "OWNER", [
    (1, "hinglish", "@ram aaj warehouse saaf karo", "/assign", {"worker_slug": "ram"}),
    (2, "english", "Please ask Ram to clean the warehouse today", "/assign", {"worker_slug": "ram"}),
    (3, "hindi", "ram ko bolna godown saaf kare", "/assign", {"worker_slug": "ram"}),
    (4, "hinglish", "ram se kehna store saaf kare aaj", "/assign", {"worker_slug": "ram"}),
    (5, "broken", "ram clean warehouse today", "/assign", {"worker_slug": "ram"}),
    (6, "msme", "ram safai karo", "/assign", {"worker_slug": "ram"}),
    (7, "typos", "@ram warehous safai", "/assign", {"worker_slug": "ram"}),
    (8, "short", "@ram safai", "/assign", {"worker_slug": "ram"}),
    (9, "conversational", "ram free hai usko warehouse wala kaam de do", "/assign", {"worker_slug": "ram"}),
    (10, "context", "kal jo pending tha ram ko wahi safai karwa do", "/assign", {"worker_slug": "ram"}),
    (11, "ambiguous", "ram ko kaam do", "/assign", {"worker_slug": "ram"}),
    (12, "multi", "ram ko safai karo aur shyam ko loading", "/assign", {"worker_slug": "ram"}),
])

bulk("department_assignment", "OWNER", [
    (1, "english", "/depart_assign sales today figures", "/depart_assign", {"depart_slug": "sales"}),
    (2, "english", "Ask sales team to send today figures", "/depart_assign", {"depart_slug": "sales"}),
    (3, "hindi", "sales team ko aaj ka data bhejne ko bolo", "/depart_assign", {"depart_slug": "sales"}),
    (4, "hinglish", "sales ko figures bhejo aaj ke", "/depart_assign", {"depart_slug": "sales"}),
    (5, "broken", "sales team figure today send", "/depart_assign", {"depart_slug": "sales"}),
    (6, "msme", "sales walo ko bolo", "/depart_assign", {"depart_slug": "sales"}),
    (7, "typos", "slaes ko data bhejo", "/depart_assign", {"depart_slug": "sales"}),
    (8, "short", "sales figures", "/depart_assign", {"depart_slug": "sales"}),
    (9, "conversational", "sales department se kehna aaj closing bhejein", "/depart_assign", {"depart_slug": "sales"}),
    (10, "context", "month end hai sales ko report chahiye", "/depart_assign", {"depart_slug": "sales"}),
    (11, "ambiguous", "figures bhejo", "/assign_clarify"),
    (12, "multi", "sales ko figures aur it ko server check", "/depart_assign", {"depart_slug": "sales"}),
])

bulk("task_delegation", "MANAGER", [
    (1, "english", "/mgrassign @priya 15", "/mgrassign", {"worker_slug": "priya", "id": 15}),
    (2, "english", "@priya will do task 15", "/mgrassign", {"worker_slug": "priya", "id": 15}),
    (3, "hindi", "priya ko task 15 do", "/mgrassign", {"worker_slug": "priya", "id": 15}),
    (4, "hinglish", "task 15 priya karegi", "/mgrassign", {"worker_slug": "priya", "id": 15}),
    (5, "broken", "priya task 15 do", "/mgrassign", {"worker_slug": "priya", "id": 15}),
    (6, "msme", "15 priya ko", "/mgrassign", {"worker_slug": "priya", "id": 15}),
    (7, "typos", "prnya ko task 15", "/mgrassign", {"worker_slug": "priya", "id": 15}),
    (8, "short", "@priya 15", "/mgrassign", {"worker_slug": "priya", "id": 15}),
    (9, "conversational", "priya free hai usko 15 wala kaam de do", "/mgrassign", {"worker_slug": "priya", "id": 15}),
    (10, "context", "owner ne diya tha 15 priya ko transfer karo", "/mgrassign", {"worker_slug": "priya", "id": 15}),
    (11, "ambiguous", "priya ko bhej do", "/assign", {"worker_slug": "priya"}),
    (12, "multi", "priya ko 15 do aur ram ko 16", "/mgrassign", {"worker_slug": "priya", "id": 15}),
])

for workflow, role, cmd, eid in [
    ("task_transfer", "MANAGER", "/mgrtransfer", 15),
    ("task_rejection", "MANAGER", "/mgrreject", 18),
    ("task_self_assign", "MANAGER", "/mgrself", 12),
]:
    bulk(workflow, role, [
        (1, "english", f"{cmd} {eid} it" if "transfer" in cmd else f"{cmd} {eid} not our scope" if "reject" in cmd else f"{cmd} {eid}", cmd),
        (2, "english", f"I will do task {eid}" if "self" in workflow else f"transfer task {eid} to IT" if "transfer" in workflow else f"reject task {eid}", cmd),
        (3, "hindi", f"task {eid} main kar lunga" if "self" in workflow else f"task {eid} IT ko bhejo" if "transfer" in workflow else f"task {eid} reject karo", cmd),
        (4, "hinglish", f"{eid} main sambhal lunga" if "self" in workflow else f"{eid} send to it" if "transfer" in workflow else f"{eid} reject", cmd),
        (5, "broken", f"{'i do' if 'self' in workflow else 'transfer' if 'transfer' in workflow else 'reject'} task {eid}", cmd),
        (6, "msme", f"{eid} {'main karunga' if 'self' in workflow else 'it ko' if 'transfer' in workflow else 'reject'}", cmd),
        (7, "typos", f"{cmd[1:6]} {eid}", cmd),
        (8, "short", f"{eid} {'main' if 'self' in workflow else 'it' if 'transfer' in workflow else 'reject'}", cmd),
        (9, "conversational", f"owner ne diya {eid} mujhe khud karna hai" if "self" in workflow else f"galat dept {eid} IT ko" if "transfer" in workflow else f"scope nahi {eid} reject", cmd),
        (10, "context", f"pending {eid} aaj handle", cmd),
        (11, "ambiguous", "main kar lunga" if "self" in workflow else "transfer karo" if "transfer" in workflow else "reject karo", cmd),
        (12, "multi", f"{eid} handle aur next", cmd),
    ])

bulk("task_completion", "WORKER", [
    (1, "english", "/complete 14", "/complete", {"id": 14}),
    (2, "english", "Task 14 is finished", "/complete", {"id": 14}),
    (3, "hindi", "task 14 ho gaya", "/complete", {"id": 14}),
    (4, "hinglish", "14 complete ho gaya kaam", "/complete", {"id": 14}),
    (5, "broken", "14 done", "/complete", {"id": 14}),
    (6, "msme", "kaam ho gaya 14", "/complete", {"id": 14}),
    (7, "typos", "complte 14", "/complete", {"id": 14}),
    (8, "short", "14 done", "/complete", {"id": 14}),
    (9, "conversational", "warehouse safai kar di 14 wala", "/complete", {"id": 14}),
    (10, "context", "jo subah diya tha 14 poora ho gaya", "/complete", {"id": 14}),
    (11, "ambiguous", "task complete", "/complete"),
    (12, "multi", "14 done aur 15 start", "/complete", {"id": 14}),
])

bulk("task_listing", "WORKER", [
    (1, "english", "/tasks", "/tasks"),
    (2, "english", "Show my tasks please", "/tasks"),
    (3, "hindi", "mere tasks dikhao", "/tasks"),
    (4, "hinglish", "aaj ke tasks batao", "/tasks"),
    (5, "broken", "my task show", "/tasks"),
    (6, "msme", "kaam dikhao", "/tasks"),
    (7, "typos", "taks dikhao", "/tasks"),
    (8, "short", "tasks", "/tasks"),
    (9, "conversational", "aaj mujhe kya karna hai wo batao", "/tasks"),
    (10, "context", "subah se pending kya hai mere", "/tasks"),
    (11, "ambiguous", "kya karna hai", "/tasks"),
    (12, "multi", "tasks dikhao aur present mark", "/tasks"),
])

bulk("task_update", "WORKER", [
    (1, "english", "/update 3 50 percent done", "/update", {"id": 3}),
    (2, "english", "Task 3 is half complete", "/update", {"id": 3}),
    (3, "hindi", "task 3 par kaam chal raha", "/update", {"id": 3}),
    (4, "hinglish", "3 almost complete hai", "/update", {"id": 3}),
    (5, "broken", "3 half done", "/update", {"id": 3}),
    (6, "msme", "3 aadha ho gaya", "/update", {"id": 3}),
    (7, "typos", "updat task 3", "/update", {"id": 3}),
    (8, "short", "3 update", "/update", {"id": 3}),
    (9, "conversational", "3 wala abhi 50 percent ho chuka", "/update", {"id": 3}),
    (10, "context", "subah start kiya 3 abhi bhi chal raha", "/update", {"id": 3}),
    (11, "ambiguous", "kaam chal raha", "/update"),
    (12, "multi", "3 update aur 4 complete", "/update", {"id": 3}),
])

bulk("issue_reporting", "WORKER", [
    (1, "english", "/issue mixer not working", "/issue"),
    (2, "english", "The forklift will not start", "/issue"),
    (3, "hindi", "machine kharab hai", "/issue"),
    (4, "hinglish", "forklift start nahi ho rahi", "/issue"),
    (5, "broken", "machine not work", "/issue"),
    (6, "msme", "mixer band", "/issue"),
    (7, "typos", "mchine kharab", "/issue"),
    (8, "short", "machine down", "/issue"),
    (9, "conversational", "subah se mixer chal nahi raha", "/issue"),
    (10, "context", "kal se pending repair mixer abhi bhi band", "/issue"),
    (11, "ambiguous", "problem hai", "/issue"),
    (12, "multi", "mixer band aur task 5 update", "/issue"),
])

bulk("issue_list", "MANAGER", [
    (1, "english", "/issues", "/issues"),
    (2, "english", "Show active issues", "/issues"),
    (3, "hindi", "active issues dikhao", "/issues"),
    (4, "hinglish", "open issues batao", "/issues"),
    (5, "broken", "show issues", "/issues"),
    (6, "msme", "issues list", "/issues"),
    (7, "typos", "isues dikhao", "/issues"),
    (8, "short", "issues", "/issues"),
    (9, "conversational", "kya kya problems open hain", "/issues"),
    (10, "context", "kal wale issues abhi bhi open?", "/issues"),
    (11, "ambiguous", "problems", "/issues"),
    (12, "multi", "issues dikhao aur report", "/issues"),
])

bulk("issue_resolve", "WORKER", [
    (1, "english", "/resolve 5", "/resolve", {"id": 5}),
    (2, "english", "Issue 5 is fixed now", "/resolve", {"id": 5}),
    (3, "hindi", "issue 5 theek ho gaya", "/resolve", {"id": 5}),
    (4, "hinglish", "5 resolve kar do fix ho gaya", "/resolve", {"id": 5}),
    (5, "broken", "resolve 5 fixed", "/resolve", {"id": 5}),
    (6, "msme", "5 band nahi ab theek", "/resolve", {"id": 5}),
    (7, "typos", "resolv 5", "/resolve", {"id": 5}),
    (8, "short", "resolve 5", "/resolve", {"id": 5}),
    (9, "conversational", "electrician ne mixer theek kar diya issue 5 close", "/resolve", {"id": 5}),
    (10, "context", "kal report kiya tha 5 ab resolve", "/resolve", {"id": 5}),
    (11, "ambiguous", "theek ho gaya", "/resolve"),
    (12, "multi", "5 resolve aur 6 open", "/resolve", {"id": 5}),
])

bulk("member_lookup", "OWNER", [
    (1, "english", "/members", "/members"),
    (2, "english", "Show team members", "/members"),
    (3, "hindi", "team members batao", "/members"),
    (4, "hinglish", "team members dikhao", "/members"),
    (5, "broken", "show team member", "/members"),
    (6, "msme", "kaun kaun hai team mein", "/members"),
    (7, "typos", "memebers list", "/members"),
    (8, "short", "members", "general_chat"),
    (9, "conversational", "mere factory mein kaun kaun kaam karta hai", "/members"),
    (10, "context", "naye worker aaye hain list dikhao", "/members"),
    (11, "ambiguous", "team dikhao", "/members"),
    (12, "multi", "members dikhao aur tasks", "/members"),
])

bulk("inventory_status", "OWNER", [
    (1, "english", "/inventory_status CEMENT-50KG", "/inventory_status"),
    (2, "english", "How much cement stock do we have", "/inventory_status"),
    (3, "hindi", "cement kitna bacha hai", "/inventory_status"),
    (4, "hinglish", "stock dikhao cement ka", "/inventory_status"),
    (5, "broken", "how much cement", "/inventory_status"),
    (6, "msme", "cement stock", "/inventory_status"),
    (7, "typos", "inventry status cement", "/inventory_status"),
    (8, "short", "stock cement", "/inventory_status"),
    (9, "conversational", "customer puch raha kitna cement hai batao", "/inventory_status"),
    (10, "context", "kal delivery ke baad kitna bacha", "/inventory_status"),
    (11, "ambiguous", "kitna hai", "/inventory_status"),
    (12, "multi", "cement stock aur low items", "/inventory_status"),
])

bulk("purchase_request", "OWNER", [
    (1, "english", "/purchase_request_create", "/purchase_request_create"),
    (2, "english", "Create purchase request for cement", "/purchase_request_create"),
    (3, "hindi", "cement ka order karna hai", "/purchase_request_create"),
    (4, "hinglish", "purchase request banao cement ke liye", "/purchase_request_create"),
    (5, "broken", "order cement purchase", "/purchase_request_create"),
    (6, "msme", "cement mangwana hai", "/purchase_request_create"),
    (7, "typos", "purchse request cement", "/purchase_request_create"),
    (8, "short", "order cement", "/purchase_request_create"),
    (9, "conversational", "stock kam hai cement ka purchase chahiye", "/purchase_request_create"),
    (10, "context", "low stock alert aaya cement order karo", "/purchase_request_create"),
    (11, "ambiguous", "order karo", "/purchase_request_create"),
    (12, "multi", "cement order aur steel bhi", "/purchase_request_create"),
])

bulk("general_help", "OWNER", [
    (1, "english", "/help", "/help"),
    (2, "english", "What can you do", "/help"),
    (3, "hindi", "madad chahiye", "/help"),
    (4, "hinglish", "help please munshi", "/help"),
    (5, "broken", "help me", "/help"),
    (6, "msme", "commands batao", "/help"),
    (7, "typos", "hlp", "/help"),
    (8, "short", "help", "/help"),
    (9, "conversational", "mujhe samajh nahi aa raha kya likhun", "/help"),
    (10, "context", "pehli baar use kar raha hun guide karo", "/help"),
    (11, "ambiguous", "kya kar sakte ho", "/help"),
    (12, "multi", "help aur tasks", "/help"),
])

bulk("home_menu", "OWNER", [
    (1, "english", "hi", "general_chat"),
    (2, "english", "Hello Munshi", "general_chat"),
    (3, "hindi", "namaste", "general_chat"),
    (4, "hinglish", "hi munshi good morning", "general_chat"),
    (5, "broken", "hey", "general_chat"),
    (6, "msme", "shuru karte hain", "general_chat"),
    (7, "typos", "hii", "general_chat"),
    (8, "short", "hi", "general_chat"),
    (9, "conversational", "aaj kya scene hai munshi", "general_chat"),
    (10, "context", "kal baat hui thi aaj continue", "general_chat"),
    (11, "ambiguous", "ok", "general_chat"),
    (12, "multi", "hi aur team dikhao", "general_chat"),
])

bulk("report", "MANAGER", [
    (1, "english", "/report", "/report"),
    (2, "english", "Daily summary please", "/report"),
    (3, "hindi", "aaj ka report dikhao", "/report"),
    (4, "hinglish", "report chahiye aaj ka", "/report"),
    (5, "broken", "daily report", "/report"),
    (6, "msme", "summary dikhao", "/report"),
    (7, "typos", "reprot dikhao", "/report"),
    (8, "short", "report", "/report"),
    (9, "conversational", "shift khatam report bana do", "/report"),
    (10, "context", "kal wala report abhi bhejo", "/report"),
    (11, "ambiguous", "summary", "/report"),
    (12, "multi", "report aur issues", "/report"),
])

bulk("onboard_worker", "OWNER", [
    (1, "english", "/onboard_worker", "/onboard_worker"),
    (2, "english", "Add new worker", "/onboard_worker"),
    (3, "hindi", "naya worker add karo", "/onboard_worker"),
    (4, "hinglish", "worker onboard karna hai", "/onboard_worker"),
    (5, "broken", "add worker", "/onboard_worker"),
    (6, "msme", "naya banda join karega", "/onboard_worker"),
    (7, "typos", "onbord worker", "/onboard_worker"),
    (8, "short", "onboard worker", "/onboard_worker"),
    (9, "conversational", "ek helper aaya hai usko system mein daalo", "/onboard_worker"),
    (10, "context", "monday join karega naya worker add", "/onboard_worker"),
    (11, "ambiguous", "naya banda", "/onboard_worker"),
    (12, "multi", "worker add aur vendor bhi", "/onboard_worker"),
])

bulk("onboard_vendor", "OWNER", [
    (1, "english", "/onboard_vendor", "/onboard_vendor"),
    (2, "english", "Register new vendor", "/onboard_vendor"),
    (3, "hindi", "naya vendor add karo", "/onboard_vendor"),
    (4, "hinglish", "supplier register karo", "/onboard_vendor"),
    (5, "broken", "add vendor", "/onboard_vendor"),
    (6, "msme", "naya supplier", "/onboard_vendor"),
    (7, "typos", "onbord vendor", "/onboard_vendor"),
    (8, "short", "vendor add", "/onboard_vendor"),
    (9, "conversational", "cement wale naye supplier aaye register karo", "/onboard_vendor"),
    (10, "context", "kal meeting thi vendor onboard karna hai", "/onboard_vendor"),
    (11, "ambiguous", "supplier", "/onboard_vendor"),
    (12, "multi", "vendor add aur PR", "/onboard_vendor"),
])

bulk("inventory_create", "OWNER", [
    (1, "english", "/inventory_create", "/inventory_create"),
    (2, "english", "Add new inventory item", "/inventory_create"),
    (3, "hindi", "naya item add karo stock mein", "/inventory_create"),
    (4, "hinglish", "inventory item banao", "/inventory_create"),
    (5, "broken", "new stock item", "/inventory_create"),
    (6, "msme", "naya maal add", "/inventory_create"),
    (7, "typos", "inventry create", "/inventory_create"),
    (8, "short", "add item", "/inventory_create"),
    (9, "conversational", "nails ka naya SKU banana hai", "/inventory_create"),
    (10, "context", "supplier ne naya product diya add karo", "/inventory_create"),
    (11, "ambiguous", "naya item", "/inventory_create"),
    (12, "multi", "item add aur stock check", "/inventory_create"),
])

bulk("business_discovery", "OWNER", [
    (1, "english", "/business_discovery", "/business_discovery"),
    (2, "english", "Tell you about my business", "/business_discovery"),
    (3, "hindi", "apna business setup karna hai", "/business_discovery"),
    (4, "hinglish", "setup my business munshi", "/business_discovery"),
    (5, "broken", "register company", "/business_discovery"),
    (6, "msme", "business profile", "/business_discovery"),
    (7, "typos", "busines setup", "/business_discovery"),
    (8, "short", "setup business", "/business_discovery"),
    (9, "conversational", "naya factory hai profile complete karni hai", "/business_discovery"),
    (10, "context", "continue onboarding setup", "/continue_discovery"),
    (11, "ambiguous", "setup", "/business_discovery"),
    (12, "multi", "business setup aur import inventory", "/business_discovery"),
])

bulk("assign_clarify", "OWNER", [
    (1, "english", "aaj website banegi", "/assign_clarify"),
    (2, "english", "Finish the quarterly audit", "/assign_clarify"),
    (3, "hindi", "aaj website update karni hai", "/assign_clarify"),
    (4, "hinglish", "quarterly audit complete karna hai", "/assign_clarify"),
    (5, "broken", "website update today", "/assign_clarify"),
    (6, "msme", "audit karo", "/assign_clarify"),
    (7, "typos", "websit update", "/assign_clarify"),
    (8, "short", "audit karo", "/assign_clarify"),
    (9, "conversational", "kisi ko assign karna hai par naam nahi pata website ka kaam", "/assign_clarify"),
    (10, "context", "owner ne bola tha audit kisko du", "/assign_clarify"),
    (11, "ambiguous", "kaam hai", "/assign_clarify"),
    (12, "multi", "website banao aur report bhejo", "/assign_clarify"),
])

bulk("inventory_delivery", "OWNER", [
    (1, "hinglish", "Ram ko 20 cement bags deliver kar do", "extract:delivery", {"assignee_hint": "Ram", "quantity": 20, "item_name_or_sku": "cement", "task_kind": "delivery"}),
    (2, "english", "Please deliver 20 bags of cement to Ram", "extract:delivery", {"assignee_hint": "Ram", "quantity": 20, "item_name_or_sku": "cement", "task_kind": "delivery"}),
    (3, "hindi", "Ram ko 20 cement de do", "extract:delivery", {"assignee_hint": "Ram", "quantity": 20, "item_name_or_sku": "cement", "task_kind": "delivery"}),
    (4, "hinglish", "Ram ko 20 bag cement issue kar do", "extract:delivery", {"assignee_hint": "Ram", "quantity": 20, "item_name_or_sku": "cement", "task_kind": "delivery"}),
    (5, "broken", "20 cement Ram give", "extract:delivery", {"quantity": 20, "item_name_or_sku": "cement", "task_kind": "delivery"}),
    (6, "msme", "ram cement le jaaye", "extract:delivery", {"assignee_hint": "Ram", "item_name_or_sku": "cement", "task_kind": "delivery"}),
    (7, "typos", "ram ko 20 cemnt delo", "extract:delivery", {"assignee_hint": "Ram", "quantity": 20, "item_name_or_sku": "cement", "task_kind": "delivery"}),
    (8, "short", "20 cement ram", "extract:delivery", {"quantity": 20, "item_name_or_sku": "cement", "task_kind": "delivery"}),
    (9, "conversational", "Ram ko material chahiye tha usko 20 cement de do", "extract:delivery", {"assignee_hint": "Ram", "quantity": 20, "item_name_or_sku": "cement", "task_kind": "delivery"}),
    (10, "context", "Kal jo Ram ne material manga tha 20 cement bhej do", "extract:delivery", {"assignee_hint": "Ram", "quantity": 20, "item_name_or_sku": "cement", "task_kind": "delivery"}),
    (11, "ambiguous", "Ram ko bhej do", "extract:delivery", {"assignee_hint": "Ram", "task_kind": "delivery"}),
    (12, "multi", "Ram ko 20 cement de do aur Shyam ko kal site bhejna", "extract:delivery", {"assignee_hint": "Ram", "quantity": 20, "item_name_or_sku": "cement", "task_kind": "delivery"}),
], eval_type="extract")

bulk("inventory_issue", "MANAGER", [
    (1, "hinglish", "Shyam ko 5 PVC pipes issue karo", "extract:issue", {"assignee_hint": "Shyam", "quantity": 5, "item_name_or_sku": "PVC pipe", "task_kind": "issue"}),
    (2, "english", "Issue 5 steel rods to Shyam", "extract:issue", {"assignee_hint": "Shyam", "quantity": 5, "item_name_or_sku": "steel rod", "task_kind": "issue"}),
    (3, "hindi", "Shyam ko 5 pipe de do", "extract:issue", {"assignee_hint": "Shyam", "quantity": 5, "item_name_or_sku": "pipe", "task_kind": "issue"}),
    (4, "hinglish", "5 rod shyam ko issue", "extract:issue", {"assignee_hint": "Shyam", "quantity": 5, "item_name_or_sku": "rod", "task_kind": "issue"}),
    (5, "broken", "5 pipe shyam give", "extract:issue", {"assignee_hint": "Shyam", "quantity": 5, "item_name_or_sku": "pipe", "task_kind": "issue"}),
    (6, "msme", "shyam ko pipe do", "extract:issue", {"assignee_hint": "Shyam", "item_name_or_sku": "pipe", "task_kind": "issue"}),
    (7, "typos", "shyam ko 5 pip issue", "extract:issue", {"assignee_hint": "Shyam", "quantity": 5, "item_name_or_sku": "pipe", "task_kind": "issue"}),
    (8, "short", "5 pipe shyam", "extract:issue", {"assignee_hint": "Shyam", "quantity": 5, "item_name_or_sku": "pipe", "task_kind": "issue"}),
    (9, "conversational", "site pe shyam ko 5 pipe chahiye issue karo", "extract:issue", {"assignee_hint": "Shyam", "quantity": 5, "item_name_or_sku": "pipe", "task_kind": "issue"}),
    (10, "context", "kal order tha shyam ko 5 pipe", "extract:issue", {"assignee_hint": "Shyam", "quantity": 5, "item_name_or_sku": "pipe", "task_kind": "issue"}),
    (11, "ambiguous", "material bhej do", "extract:null"),
    (12, "multi", "shyam ko 5 pipe aur ram ko cement", "extract:issue", {"assignee_hint": "Shyam", "quantity": 5, "item_name_or_sku": "pipe", "task_kind": "issue"}),
], eval_type="extract")

bulk("inventory_count", "OWNER", [
    (1, "english", "inventory count please", "extract:inventory_count", {"task_kind": "inventory_count"}),
    (2, "english", "Start stock count", "extract:inventory_count", {"task_kind": "inventory_count"}),
    (3, "hindi", "maal ki ginati karwa do", "extract:inventory_count", {"task_kind": "inventory_count"}),
    (4, "hinglish", "stock count karo", "extract:inventory_count", {"task_kind": "inventory_count"}),
    (5, "broken", "count stock", "extract:inventory_count", {"task_kind": "inventory_count"}),
    (6, "msme", "ginati karo", "extract:inventory_count", {"task_kind": "inventory_count"}),
    (7, "typos", "inventry count", "extract:inventory_count", {"task_kind": "inventory_count"}),
    (8, "short", "stock count", "extract:inventory_count", {"task_kind": "inventory_count"}),
    (9, "conversational", "month end hai poora stock ginna hai", "extract:inventory_count", {"task_kind": "inventory_count"}),
    (10, "context", "kal se pending count aaj karwa do", "extract:inventory_count", {"task_kind": "inventory_count"}),
    (11, "ambiguous", "ginati", "extract:inventory_count", {"task_kind": "inventory_count"}),
    (12, "multi", "stock count aur report", "extract:inventory_count", {"task_kind": "inventory_count"}),
], eval_type="extract")

low_msgs = [
    "low stock items", "What is running low in stock", "kya kya kam pad raha hai",
    "low stock dikhao", "stock low show", "kya khatam ho raha", "low stok", "low stock",
    "reorder kya karna chahiye batao", "alert aaya tha cement low ab kya karein",
    "kam hai stock", "low stock aur order cement",
]
low_exp = [
    "/inventory_status", "/inventory_status", "/inventory_status", "/inventory_status",
    "/inventory_status", "/purchase_request_create", "/inventory_status", "/inventory_status",
    "/purchase_request_create", "/purchase_request_create", "/inventory_status", "/purchase_request_create",
]
for lvl, msg, exp in zip(range(1, 13), low_msgs, low_exp):
    add("low_stock_workflow", "OWNER", lvl, "mixed", msg, exp)

out = Path(__file__).parent / "benchmark_corpus.json"
out.write_text(json.dumps(corpus, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Wrote {len(corpus)} cases, {len(set(c['workflow'] for c in corpus))} workflows")
