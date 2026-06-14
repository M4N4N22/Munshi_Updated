"""Phase 4.1 task inventory extraction tests."""

from extractors.task_inventory_extractor import extract_task_inventory


def _extract(message: str) -> dict:
    return extract_task_inventory(message)


def test_delivery_request():
    result = _extract("Ram ko 20 cement bags deliver kar do")
    assert result["item_name_or_sku"] == "cement"
    assert result["quantity"] == 20
    assert result["assignee_hint"] == "Ram"
    assert result["task_kind"] == "delivery"


def test_issue_request():
    result = _extract("Shyam ko 5 PVC pipes issue karo")
    assert result["item_name_or_sku"] == "PVC pipe"
    assert result["quantity"] == 5
    assert result["assignee_hint"] == "Shyam"
    assert result["task_kind"] == "issue"


def test_inventory_count():
    result = _extract("Inventory count karwa do")
    assert result["item_name_or_sku"] is None
    assert result["quantity"] is None
    assert result["assignee_hint"] is None
    assert result["task_kind"] == "inventory_count"


def test_missing_quantity():
    result = _extract("Ram ko cement deliver karo")
    assert result["assignee_hint"] == "Ram"
    assert result["quantity"] is None
    assert result["item_name_or_sku"] == "cement"
    assert result["task_kind"] == "delivery"


def test_missing_assignee():
    result = _extract("20 cement deliver karo")
    assert result["assignee_hint"] is None
    assert result["quantity"] == 20
    assert result["item_name_or_sku"] == "cement"
    assert result["task_kind"] == "delivery"


def test_unknown_item():
    result = _extract("Ram ko deliver karo")
    assert result["assignee_hint"] == "Ram"
    assert result["item_name_or_sku"] is None
    assert result["quantity"] is None
    assert result["task_kind"] == "delivery"


def test_hindi_inputs():
    result = _extract("Ram ko 20 cement ki thaili bhej do")
    assert result["assignee_hint"] == "Ram"
    assert result["quantity"] == 20
    assert result["item_name_or_sku"] == "cement"
    assert result["task_kind"] == "delivery"


def test_mixed_hindi_english():
    result = _extract("Shyam ko 10 steel rods issue karo please")
    assert result["assignee_hint"] == "Shyam"
    assert result["quantity"] == 10
    assert result["item_name_or_sku"] == "steel rod"
    assert result["task_kind"] == "issue"


def test_sku_inputs():
    result = _extract("Ramesh ko CEMENT_50KG 5 deliver karo")
    assert result["assignee_hint"] == "Ramesh"
    assert result["item_name_or_sku"] == "CEMENT_50KG"
    assert result["quantity"] == 5
    assert result["task_kind"] == "delivery"


def test_mention_assignee_with_sku():
    result = _extract("@vikram TEST_ITEM_01 bhejo")
    assert result["assignee_hint"] == "Vikram"
    assert result["item_name_or_sku"] == "TEST_ITEM_01"
    assert result["quantity"] is None
    assert result["task_kind"] == "delivery"


def test_name_before_sku_without_ko():
    result = _extract("vikram shah TEST_ITEM_01 bhejo")
    assert result["assignee_hint"] == "Vikram Shah"
    assert result["item_name_or_sku"] == "TEST_ITEM_01"
    assert result["task_kind"] == "delivery"


def test_mention_assignee_with_item_name():
    result = _extract("@vikram test item 1 bhejo")
    assert result["assignee_hint"] == "Vikram"
    assert result["item_name_or_sku"] == "test item 1"
    assert result["quantity"] is None
    assert result["task_kind"] == "delivery"


def test_name_before_item_without_ko():
    result = _extract("vikram test item 1 bhejo")
    assert result["assignee_hint"] == "Vikram"
    assert result["item_name_or_sku"] == "test item 1"
    assert result["quantity"] is None
    assert result["task_kind"] == "delivery"


def test_jana_hai_aaj_delivery():
    result = _extract("vikram test item 1 jana hai aaj")
    assert result["assignee_hint"] == "Vikram"
    assert result["item_name_or_sku"] == "test item 1"
    assert result["quantity"] is None
    assert result["task_kind"] == "delivery"


def test_contract_always_has_four_keys():
    result = _extract("")
    assert set(result.keys()) == {
        "item_name_or_sku",
        "quantity",
        "assignee_hint",
        "task_kind",
    }


def test_stock_count_hindi_phrase():
    result = _extract("Maal ki ginati karwa do")
    assert result["task_kind"] == "inventory_count"
    assert result["item_name_or_sku"] is None
    assert result["quantity"] is None
    assert result["assignee_hint"] is None
