from contracts.python.models import ClassifyResponse, InventoryImportExtraction


def test_classify_response_has_reject_reason():
    model = ClassifyResponse(intent="mgrreject", reject_reason="invalid worker")
    assert model.reject_reason == "invalid worker"


def test_inventory_import_contract_shape():
    model = InventoryImportExtraction(items=[{"name": "Cement", "quantity": 10}])
    payload = model.model_dump()
    assert payload["document_type"] == "INVENTORY_IMPORT"
    assert payload["items"][0]["name"] == "Cement"
