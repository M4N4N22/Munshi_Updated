from contracts.python.document_types import TASK_KINDS
from contracts.python.models import ClassifyResponse, InventoryImportExtraction, TaskInventoryExtraction


def test_classify_response_has_reject_reason():
    model = ClassifyResponse(intent="mgrreject", reject_reason="invalid worker")
    assert model.reject_reason == "invalid worker"


def test_inventory_import_contract_shape():
    model = InventoryImportExtraction(items=[{"name": "Cement", "quantity": 10}])
    payload = model.model_dump()
    assert payload["document_type"] == "INVENTORY_IMPORT"
    assert payload["items"][0]["name"] == "Cement"


def test_task_inventory_extraction_contract_shape():
    model = TaskInventoryExtraction(
        item_name_or_sku="cement",
        quantity=20,
        assignee_hint="Ram",
        task_kind="delivery",
    )
    payload = model.model_dump()
    assert payload == {
        "item_name_or_sku": "cement",
        "quantity": 20,
        "assignee_hint": "Ram",
        "task_kind": "delivery",
    }
    empty = TaskInventoryExtraction().model_dump()
    assert empty["item_name_or_sku"] is None
    assert empty["quantity"] is None
    assert empty["assignee_hint"] is None
    assert empty["task_kind"] is None


def test_task_kinds_loaded_from_catalog():
    assert TASK_KINDS == ["delivery", "issue", "inventory_count"]


def test_task_inventory_task_kind_values_in_catalog():
    for kind in ("delivery", "issue", "inventory_count"):
        assert kind in TASK_KINDS
