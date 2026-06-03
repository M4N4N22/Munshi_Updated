from bot_engine import classify_hybrid, workflow_pre_classify, operational_pre_classify


def _intent(msg: str) -> str:
    return classify_hybrid(msg, use_llm=False)["intent"]


def test_continue_discovery_hindi():
    assert workflow_pre_classify("setup phir se shuru")["intent"] == "/continue_discovery"
    assert workflow_pre_classify("onboarding resume")["intent"] == "/continue_discovery"


def test_inventory_status_typo():
    assert _intent("invntry sttus batao") == "/inventory_status"
    assert _intent("printing ink kitna hai") == "/inventory_status"
    assert _intent("stock register status") == "/inventory_status"


def test_inventory_create_phrases():
    assert _intent("SKU register karna hai") == "/inventory_create"
    assert _intent("warehouse mein item add") == "/inventory_create"
    assert _intent("stock item create karo") == "/inventory_create"


def test_procurement_hardening():
    assert _intent("packaging tape khatam hone wali hai order karo") == "/purchase_request_create"
    assert _intent("50 rolls packaging tape order") == "/purchase_request_create"
    assert _intent("order chahiye") == "/purchase_request_create"


def test_complete_shorthand():
    assert operational_pre_classify("task finish")["intent"] == "/complete"
    assert operational_pre_classify("job complete")["intent"] == "/complete"
    assert operational_pre_classify("task khatam")["intent"] == "/complete"


def test_update_before_complete():
    assert operational_pre_classify("kaam almost complete hai")["intent"] == "/update"
    assert operational_pre_classify("task 5 update packing done")["intent"] == "/update"
    assert operational_pre_classify("aadha kaam ho gaya")["intent"] == "/update"


def test_members_and_help():
    assert operational_pre_classify("team members dikhao")["intent"] == "/members"
    assert operational_pre_classify("help chahiye")["intent"] == "/help"
    assert operational_pre_classify("madad chahiye")["intent"] == "/help"


def test_vendor_status_not_update():
    assert _intent("order status update karo") == "general_chat"
