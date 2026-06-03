from contracts.python.models import ClassifyResponse, InventoryImportExtraction, ParseResponse


def evaluate_contract_compliance() -> dict:
    checks = [
        _check_classify_response(),
        _check_inventory_extraction(),
        _check_parse_response(),
    ]
    passed = sum(1 for ok in checks if ok)
    return {
        "total": len(checks),
        "passed": passed,
        "compliance_rate": round(passed / len(checks), 4),
    }


def _check_classify_response() -> bool:
    model = ClassifyResponse(intent="yes", reject_reason=None)
    return model.intent == "yes" and "reject_reason" in model.model_fields


def _check_inventory_extraction() -> bool:
    model = InventoryImportExtraction(items=[{"name": "Cement", "quantity": 1}])
    dumped = model.model_dump()
    return dumped["document_type"] == "INVENTORY_IMPORT" and len(dumped["items"]) == 1


def _check_parse_response() -> bool:
    model = ParseResponse(
        document_type="INVENTORY_IMPORT",
        payload={"document_type": "INVENTORY_IMPORT", "items": [{"name": "Cement"}]},
    )
    return model.document_type == "INVENTORY_IMPORT"
