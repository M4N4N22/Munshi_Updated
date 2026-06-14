"""Generate smoke-v1.1.jsonl (~200 cases) per doc 62."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "eval" / "smoke"
OUT.mkdir(parents=True, exist_ok=True)

CV = "v1.1"


def case(
    id_: str,
    message: str,
    expected: str,
    slice_: str,
    language: str = "hinglish",
    role: str | None = None,
    category: str = "positive",
    boundary: str | None = None,
    forbidden: list[str] | None = None,
    notes: str = "",
) -> dict:
    row = {
        "id": id_,
        "message": message,
        "expected_intent": expected,
        "expected_slots": {},
        "category": category,
        "slice": slice_,
        "boundary_pair": boundary,
        "language": language,
        "tags": ["v1.1"],
        "contract_version": CV,
        "notes": notes,
    }
    if role:
        row["role"] = role
    if forbidden:
        row["forbidden_intents"] = forbidden
    return row


def main() -> None:
    rows: list[dict] = []
    n = 0

    def add(c: dict) -> None:
        nonlocal n
        rows.append(c)
        n += 1

    # S1 contract_gap (40)
    import_pos = [
        ("import inventory", "hinglish"),
        ("import inventory list", "english"),
        ("inventory csv import karo", "hinglish"),
        ("bulk inventory import", "english"),
        ("csv se inventory import", "hinglish"),
        ("inventory sheet import", "english"),
        ("inventory list import", "hinglish"),
        ("import inventory csv file", "english"),
    ]
    for i, (msg, lang) in enumerate(import_pos, 1):
        add(case(f"SMOKE-CG-{i:03d}", msg, "/inventory_import_csv", "contract_gap", lang, notes="import positive"))

    import_neg_disc = [
        "import inventory for my business setup",
        "import inventory during onboarding",
        "mera business import inventory",
        "setup business import inventory",
    ]
    for i, msg in enumerate(import_neg_disc, 1):
        add(
            case(
                f"SMOKE-CG-{12+i:03d}",
                msg,
                "/inventory_import_csv",
                "contract_gap",
                "hinglish",
                forbidden=["/business_discovery"],
                notes="import not discovery",
            )
        )

    delivery_pos = [
        ("ram ko 50 bolt bhejo", "hinglish"),
        ("priya ko 20 sku ABC dispatch", "english"),
        ("@anil 10 piece delivery karo", "hinglish"),
        ("dispatch 5 bolt to rahul", "english"),
        ("50 bolt bhejo ram ko", "hinglish"),
        ("/assign_delivery @ram bolt 50", "english"),
    ]
    for i, (msg, lang) in enumerate(delivery_pos, 1):
        add(case(f"SMOKE-AD-{i:03d}", msg, "/assign_delivery", "contract_gap", lang, "OWNER"))

    tinl_pos = [
        ("stock count karo warehouse ka", "hinglish"),
        ("inventory count for bolts", "english"),
        ("ginati karo stock ki", "hindi"),
        ("count stock bolts", "english"),
        ("inventory count cement", "hinglish"),
        ("/task_inventory_nl", "english"),
    ]
    for i, (msg, lang) in enumerate(tinl_pos, 1):
        add(case(f"SMOKE-TI-{i:03d}", msg, "/task_inventory_nl", "contract_gap", lang))

    cancel_pos = [("cancel", "english"), ("cancel workflow", "english"), ("workflow cancel", "english"), ("band karo", "hindi")]
    for i, (msg, lang) in enumerate(cancel_pos, 1):
        add(case(f"SMOKE-CA-{i:03d}", msg, "/cancel", "contract_gap", lang))

    sugg = [("/suggestion_approve", "english"), ("suggestion approve", "english")]
    for i, (msg, lang) in enumerate(sugg, 1):
        add(case(f"SMOKE-SA-{i:03d}", msg, "/suggestion_approve", "contract_gap", lang))

    # S2 import_boundary (25) - reuse/adapt
    s2_msgs = [
        ("import inventory", "/inventory_import_csv", "import_boundary"),
        ("setup my business", "/business_discovery", "import_boundary"),
        ("register my company", "/business_discovery", "import_boundary"),
        ("inventory item banao", "/inventory_create", "import_boundary"),
        ("create inventory item", "/inventory_create", "import_boundary"),
        ("import vendors", "/business_discovery", "import_boundary"),
        ("naya vendor add karna hai", "/onboard_vendor", "import_boundary"),
        ("import inventory csv", "/inventory_import_csv", "import_boundary"),
        ("tell you about my business", "/business_discovery", "import_boundary"),
        ("stock item create karo", "/inventory_create", "import_boundary"),
        ("import inventory sheet", "/inventory_import_csv", "import_boundary"),
        ("mera business setup", "/business_discovery", "import_boundary"),
        ("SKU register karna hai", "/inventory_create", "import_boundary"),
        ("bulk inventory import", "/inventory_import_csv", "import_boundary"),
        ("continue setup", "/continue_discovery", "import_boundary"),
        ("import inventory list", "/inventory_import_csv", "import_boundary"),
        ("add new stock item", "/inventory_create", "import_boundary"),
        ("update company details", "/business_discovery", "import_boundary"),
        ("inventory csv import", "/inventory_import_csv", "import_boundary"),
        ("warehouse mein item add", "/inventory_create", "import_boundary"),
        ("import vendor list", "/business_discovery", "import_boundary"),
        ("register a new vendor", "/onboard_vendor", "import_boundary"),
        ("import inventory data", "/inventory_import_csv", "import_boundary"),
        ("inventory create workflow", "/inventory_create", "import_boundary"),
        ("company details update", "/business_discovery", "import_boundary"),
    ]
    for i, (msg, exp, sl) in enumerate(s2_msgs, 1):
        add(case(f"SMOKE-S2-{i:03d}", msg, exp, sl, notes="import vs discovery vs create"))

    # S3 assign vs depart (25)
    s3 = [
        ("ajay ko report bhejo", "/assign", "OWNER"),
        ("@rahul invoice bhejdo", "/assign", "OWNER"),
        ("priya client ko call kare", "/assign", "OWNER"),
        ("warehouse khali karo", "/depart_assign", "OWNER"),
        ("invoice bhejo", "/depart_assign", "OWNER"),
        ("server theek karo", "/depart_assign", "OWNER"),
        ("raw material order karo", "/depart_assign", "OWNER"),
        ("ram ko cleaning karo", "/assign", "OWNER"),
        ("sales team ko target do", "/depart_assign", "OWNER"),
        ("it ko server fix karo", "/depart_assign", "OWNER"),
        ("anil ko dispatch bolo", "/assign", "OWNER"),
        ("packaging karo", "/depart_assign", "OWNER"),
        ("meena ko file bhejo", "/assign", "OWNER"),
        ("purchase ko vendor call", "/depart_assign", "OWNER"),
        ("operations ko load karo", "/depart_assign", "OWNER"),
        ("kumar ko training do", "/assign", "OWNER"),
        ("customer payment followup", "/depart_assign", "OWNER"),
        ("sunita ko email karo", "/assign", "OWNER"),
        ("machine repair karo", "/depart_assign", "OWNER"),
        ("rahul ko bol dena", "/assign", "OWNER"),
        ("quotation bhejo", "/depart_assign", "OWNER"),
        ("deepak ko sample do", "/assign", "OWNER"),
        ("dispatch team ko bolo", "/depart_assign", "OWNER"),
        ("vendor payment karo", "/depart_assign", "OWNER"),
        ("sonia ko list bhejo", "/assign", "OWNER"),
    ]
    for i, (msg, exp, role) in enumerate(s3, 1):
        add(case(f"SMOKE-S3-{i:03d}", msg, exp, "assign_depart", "hinglish", role, boundary="A1"))

    # S4 assign vs clarify (15)
    s4 = [
        ("aaj website banegi", "/assign_clarify"),
        ("kal dispatch ho jayega", "/assign_clarify"),
        ("machine repair karni hai", "/assign_clarify"),
        ("Aaj 4 website banegi", "/assign_clarify"),
        ("packing karni hai", "/assign_clarify"),
        ("ajay ko website banani hai", "/assign"),
        ("priya se packing karwao", "/assign"),
        ("meeting setup karo ram se", "/assign"),
        ("report ready karo anil se", "/assign"),
        ("delivery plan banao", "/assign_clarify"),
        ("inventory check karna hai", "/assign_clarify"),
        ("rahul ko audit karo", "/assign"),
        ("website update karni hai", "/assign_clarify"),
        ("sabko training do", "/assign_clarify"),
        ("anil ko task do packing", "/assign"),
    ]
    for i, (msg, exp) in enumerate(s4, 1):
        add(case(f"SMOKE-S4-{i:03d}", msg, exp, "assign_clarify", "hinglish", "OWNER", boundary="A2"))

    # S5 stock-linked vs assign (25)
    s5 = [
        ("ram ko 50 bolt bhejo", "/assign_delivery"),
        ("priya ko 20 nut dispatch", "/assign_delivery"),
        ("50 bolt bhejo anil ko", "/assign_delivery"),
        ("dispatch sku X12 to ram", "/assign_delivery"),
        ("stock count bolts", "/task_inventory_nl"),
        ("inventory count warehouse", "/task_inventory_nl"),
        ("ginati karo cement ki", "/task_inventory_nl"),
        ("ram ko report do", "/assign"),
        ("priya ko call karo", "/assign"),
        ("anil ko meeting bhejo", "/assign"),
        ("@kumar 10 pcs bolt bhejo", "/assign_delivery"),
        ("delivery 5 sku to priya", "/assign_delivery"),
        ("count stock nuts", "/task_inventory_nl"),
        ("stock count karo", "/task_inventory_nl"),
        ("ram ko kaam do", "/assign"),
        ("bolt dispatch ram ko", "/assign_delivery"),
        ("inventory ginati", "/task_inventory_nl"),
        ("worker ko task do", "/assign"),
        ("15 bolt bhejo sunita ko", "/assign_delivery"),
        ("sku ABC count karo", "/task_inventory_nl"),
        ("rahul ko file bhejo", "/assign"),
        ("dispatch 3 unit bolt", "/task_inventory_nl"),
        ("meena ko training", "/assign"),
        ("50 piece delivery priya", "/assign_delivery"),
        ("stock inventory count", "/task_inventory_nl"),
    ]
    for i, (msg, exp) in enumerate(s5, 1):
        add(case(f"SMOKE-S5-{i:03d}", msg, exp, "stock_linked", "hinglish", "OWNER", boundary="A3"))

    # S6 mgrself vs mgrassign (20) - from manager_workflows patterns
    s6 = [
        ("task 12 main karunga", "/mgrself"),
        ("12 main sambhal lunga", "/mgrself"),
        ("I'll do task 12", "/mgrself"),
        ("i do task 12", "/mgrself"),
        ("12 main", "/mgrself"),
        ("main kar lunga", "/mgrself"),
        ("mgrse 12", "/mgrself"),
        ("priya ko task 15 do", "/mgrassign"),
        ("priya task 15 do", "/mgrassign"),
        ("15 priya ko", "/mgrassign"),
        ("assign task 15 to priya", "/mgrassign"),
        ("ram karega task 9", "/mgrassign"),
        ("owner ne diya tha 15 priya ko transfer karo", "/mgrassign"),
        ("task 8 main lunga", "/mgrself"),
        ("main task 3", "/mgrself"),
        ("20 priya ko do", "/mgrassign"),
        ("anil task 7 karega", "/mgrassign"),
        ("5 main karunga", "/mgrself"),
        ("prnya ko task 15", "/mgrassign"),
        ("task 11 main", "/mgrself"),
    ]
    for i, (msg, exp) in enumerate(s6, 1):
        add(case(f"SMOKE-S6-{i:03d}", msg, exp, "mgr_boundary", "hinglish", "MANAGER", boundary="B1"))

    # S7 mgrtransfer vs mgrreject (15)
    s7 = [
        ("15 IT ko", "/mgrtransfer"),
        ("transfer task 15 to sales", "/mgrtransfer"),
        ("15 send to it", "/mgrtransfer"),
        ("galat dept 15 IT ko", "/mgrtransfer"),
        ("transfer karo", "/mgrtransfer"),
        ("mgrtr 15", "/mgrtransfer"),
        ("reject task 18", "/mgrreject"),
        ("18 reject", "/mgrreject"),
        ("not our scope", "/mgrreject"),
        ("hamara scope nahi", "/mgrreject"),
        ("galat assign hua", "/mgrreject"),
        ("reject karo", "/mgrreject"),
        ("mgrre 18", "/mgrreject"),
        ("mgrtrasfer 15 it", "/mgrtransfer"),
        ("15 it department", "/mgrtransfer"),
    ]
    for i, (msg, exp) in enumerate(s7, 1):
        add(case(f"SMOKE-S7-{i:03d}", msg, exp, "mgr_boundary", "hinglish", "MANAGER", boundary="B2"))

    # S8 inventory status vs create (15)
    s8 = [
        ("check inventory status", "/inventory_status"),
        ("stock level dikhao", "/inventory_status"),
        ("kitna stock hai cement ka", "/inventory_status"),
        ("invntry sttus batao", "/inventory_status"),
        ("printing ink kitna hai", "/inventory_status"),
        ("create inventory item", "/inventory_create"),
        ("inventory item banao", "/inventory_create"),
        ("add new stock item", "/inventory_create"),
        ("SKU register karna hai", "/inventory_create"),
        ("warehouse mein item add", "/inventory_create"),
        ("low stock dikhao", "/inventory_status"),
        ("stock register status", "/inventory_status"),
        ("naya item add karo inventory", "/inventory_create"),
        ("cement stock kitna", "/inventory_status"),
        ("stock item create karo", "/inventory_create"),
    ]
    for i, (msg, exp) in enumerate(s8, 1):
        add(case(f"SMOKE-S8-{i:03d}", msg, exp, "inventory_boundary", "hinglish", boundary="C1"))

    # S9 complete vs update (15)
    s9 = [
        ("ho gaya", "/complete"),
        ("kar diya", "/complete"),
        ("done", "/complete"),
        ("task complete ho gaya", "/complete"),
        ("dispatch done", "/complete"),
        ("kaam khatam ho gaya", "/complete"),
        ("task finish", "/complete"),
        ("kaam almost complete hai", "/update"),
        ("task 5 update packing done", "/update"),
        ("aadha kaam ho gaya", "/update"),
        ("80 percent done task 5", "/update"),
        ("task 3 update progress", "/update"),
        ("status update task 7", "/update"),
        ("progress update karo", "/update"),
        ("half complete task 2", "/update"),
    ]
    for i, (msg, exp) in enumerate(s9, 1):
        add(case(f"SMOKE-S9-{i:03d}", msg, exp, "complete_update", "hinglish", boundary="D1"))

    # S10 regression (15) - sample from existing eval
    s10 = [
        ("naya vendor add karna hai", "/onboard_vendor"),
        ("register a new vendor", "/onboard_vendor"),
        ("need cement bags", "/purchase_request_create"),
        ("create purchase request for steel", "/purchase_request_create"),
        ("tell you about my business", "/business_discovery"),
        ("register my company", "/business_discovery"),
        ("continue setup", "/continue_discovery"),
        ("setup wapas karo", "/continue_discovery"),
        ("team members dikhao", "/members"),
        ("help chahiye", "/help"),
        ("aa gaya hu", "/present"),
        ("aaj nahi aa paunga", "/absent"),
        ("packaging tape order karo", "/purchase_request_create"),
        ("mera business setup karna hai", "/business_discovery"),
        ("continue onboarding", "/continue_discovery"),
    ]
    for i, (msg, exp) in enumerate(s10, 1):
        add(case(f"SMOKE-S10-{i:03d}", msg, exp, "regression", "hinglish"))

    assert len(rows) == 200, f"expected 200 cases, got {len(rows)}"

    jsonl = OUT / "smoke-v1.1.jsonl"
    jsonl.write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in rows) + "\n", encoding="utf-8")

    slices = Counter(r["slice"] for r in rows)
    manifest = {
        "version": "v1.1",
        "contract_version": CV,
        "total_cases": len(rows),
        "file": "smoke-v1.1.jsonl",
        "slices": dict(sorted(slices.items())),
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
