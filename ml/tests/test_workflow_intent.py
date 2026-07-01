from bot_engine import classify_hybrid, workflow_pre_classify


def test_workflow_pre_classify_vendor():
    result = workflow_pre_classify("naya vendor add karna hai")
    assert result["intent"] == "/onboard_vendor"


def test_workflow_pre_classify_inventory_status():
    result = workflow_pre_classify("check inventory status")
    assert result["intent"] == "/inventory_status"


def test_classify_hybrid_inventory_create():
    result = classify_hybrid("create inventory item", use_llm=False)
    assert result["intent"] == "/inventory_create"


def test_workflow_pre_classify_purchase_request():
    result = workflow_pre_classify("need cement bags")
    assert result["intent"] == "/purchase_request_create"


def test_classify_hybrid_purchase_request():
    result = classify_hybrid("create purchase request for steel", use_llm=False)
    assert result["intent"] == "/purchase_request_create"


def test_workflow_pre_classify_business_discovery():
    result = workflow_pre_classify("tell you about my business")
    assert result["intent"] == "/business_discovery"


def test_workflow_pre_classify_business_discovery_hindi():
    result = workflow_pre_classify("mera business setup karna hai")
    assert result["intent"] == "/business_discovery"


def test_workflow_pre_classify_continue_discovery():
    result = workflow_pre_classify("continue setup")
    assert result["intent"] == "/continue_discovery"


def test_workflow_pre_classify_continue_onboarding():
    result = workflow_pre_classify("continue onboarding")
    assert result["intent"] == "/continue_discovery"


def test_workflow_pre_classify_import_inventory_csv():
    result = workflow_pre_classify("import inventory list")
    assert result["intent"] == "/inventory_import_csv"


def test_classify_hybrid_business_discovery():
    result = classify_hybrid("register my company", use_llm=False)
    assert result["intent"] == "/business_discovery"


def test_classify_hybrid_continue_discovery():
    result = classify_hybrid("setup wapas karo", use_llm=False)
    assert result["intent"] == "/continue_discovery"
