"""Contract drift detection across shared JSON schemas and Python models."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from contracts.python.models import (
    ClassifyResponse,
    InventoryImportExtraction,
    ParseResponse,
    StockRegisterExtraction,
)

ROOT = Path(__file__).resolve().parents[1]
CONTRACTS = ROOT / "contracts"


def _load_json(name: str) -> dict[str, Any]:
    return json.loads((CONTRACTS / name).read_text(encoding="utf-8"))


def _check_intent_contract() -> dict[str, Any]:
    intent_file = _load_json("intent-types.json")
    model_fields = set(ClassifyResponse.model_fields.keys())
    schema = _load_json("schemas/classify-response.json")
    required = set(schema.get("required", []))
    workflow_intents = {
        "/onboard_vendor",
        "/onboard_worker",
        "/inventory_create",
        "/inventory_status",
    }
    missing_workflow = workflow_intents - set(intent_file.get("intents", []))
    return {
        "passed": not missing_workflow and required.issubset(model_fields),
        "missing_workflow_intents": sorted(missing_workflow),
        "schema_required_fields": sorted(required),
        "model_fields": sorted(model_fields),
    }


def _check_extraction_contracts() -> dict[str, Any]:
    checks = []
    inventory_schema = _load_json("schemas/inventory-import-extraction.json")
    stock_schema = _load_json("schemas/stock-register-extraction.json")
    inv_sample = InventoryImportExtraction(items=[{"name": "Cement", "quantity": 1}])
    stk_sample = StockRegisterExtraction(items=[{"name": "Sand", "quantity": 2}], as_of_date="2026-05-01")
    checks.append(
        {
            "name": "inventory_import",
            "passed": inv_sample.document_type == inventory_schema["properties"]["document_type"]["const"],
        }
    )
    checks.append(
        {
            "name": "stock_register",
            "passed": stk_sample.document_type == stock_schema["properties"]["document_type"]["const"],
        }
    )
    return {"passed": all(c["passed"] for c in checks), "checks": checks}


def _check_task_inventory_contracts() -> dict[str, Any]:
    schema = _load_json("schemas/task-inventory-extraction.json")
    task_kinds = _load_json("task-kinds.json")
    schema_enum = [
        v for v in schema["properties"]["task_kind"]["enum"] if v is not None
    ]
    catalog = task_kinds.get("task_kinds", [])
    models_text = (CONTRACTS / "python" / "models.py").read_text(encoding="utf-8")
    return {
        "passed": sorted(schema_enum) == sorted(catalog),
        "schema_task_kinds": sorted(schema_enum),
        "catalog_task_kinds": sorted(catalog),
        "models_py_present": "TaskInventoryExtraction" in models_text,
    }


def _check_suggestion_and_workflow_enums() -> dict[str, Any]:
    suggestions = _load_json("suggestion-types.json")
    workflows = _load_json("workflow-types.json")
    required_suggestions = {
        "INITIAL_INVENTORY_IMPORT",
        "NEW_INVENTORY_ITEM",
        "STOCK_IN",
        "STOCK_OUT",
    }
    required_workflows = {
        "ONBOARD_VENDOR",
        "ONBOARD_WORKER",
        "INVENTORY_CREATE",
        "SUGGESTION_APPROVAL",
        "TASK_INVENTORY_CREATION",
    }
    missing_s = required_suggestions - set(suggestions.get("types", []))
    missing_w = required_workflows - set(workflows.get("types", []))
    return {
        "passed": not missing_s and not missing_w,
        "missing_suggestions": sorted(missing_s),
        "missing_workflows": sorted(missing_w),
    }


def _check_parse_response() -> dict[str, Any]:
    sample = ParseResponse(
        document_type="INVENTORY_IMPORT",
        payload={"document_type": "INVENTORY_IMPORT", "items": [{"name": "Cement"}]},
    )
    return {"passed": sample.document_type == "INVENTORY_IMPORT"}


def evaluate() -> dict[str, Any]:
    sections = {
        "intent_contract": _check_intent_contract(),
        "extraction_contracts": _check_extraction_contracts(),
        "task_inventory_contracts": _check_task_inventory_contracts(),
        "suggestion_workflow_contracts": _check_suggestion_and_workflow_enums(),
        "parse_response": _check_parse_response(),
    }
    passed = sum(1 for s in sections.values() if s.get("passed"))
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sections": sections,
        "compliance_rate": round(passed / len(sections), 4),
        "passed": passed == len(sections),
    }


if __name__ == "__main__":
    import json as _json

    report = evaluate()
    out = ROOT / "eval" / "reports" / "contract_drift_eval.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(_json.dumps(report, indent=2), encoding="utf-8")
    print(_json.dumps(report, indent=2))
