"""End-to-end validation scenario runner (LLM-local steps + contract checks)."""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from bot_engine import classify_hybrid
from contracts.python.models import InventoryImportExtraction, StockRegisterExtraction
from eval.document_quality_eval import _load_manifest
from parsers.base import ParserInput
from parsers.inventory_import_parser import InventoryImportParser
from parsers.stock_register_parser import StockRegisterParser

ROOT = Path(__file__).resolve().parents[1]
SCENARIOS = ROOT / "data" / "eval" / "e2e" / "scenarios.json"
REPORT_DIR = ROOT / "eval" / "reports"


def _parse_fixture(doc_type: str, fixture_id: str) -> dict[str, Any]:
    folder = "inventory_import" if doc_type == "INVENTORY_IMPORT" else "stock_register"
    manifest = _load_manifest(folder)
    fixture = next(item for item in manifest if item["id"] == fixture_id)
    content = (ROOT / "data" / "eval" / "documents" / folder / fixture["storage_path"]).read_bytes()
    parser = InventoryImportParser() if doc_type == "INVENTORY_IMPORT" else StockRegisterParser()
    start = time.perf_counter()
    try:
        result = parser.parse(
            ParserInput(
                factory_id=1,
                file_name=fixture["file_name"],
                mime_type=fixture.get("mime_type", "text/csv"),
                content=content,
                document_type=doc_type,
            )
        )
        latency_ms = (time.perf_counter() - start) * 1000
        payload = result.payload if isinstance(result.payload, dict) else result.payload
        if doc_type == "INVENTORY_IMPORT":
            InventoryImportExtraction(**payload)
        else:
            StockRegisterExtraction(**payload)
        return {"ok": True, "latency_ms": latency_ms, "payload": payload}
    except Exception as exc:
        return {"ok": False, "latency_ms": (time.perf_counter() - start) * 1000, "error": str(exc)}


def _run_scenario(scenario: dict[str, Any]) -> dict[str, Any]:
    steps = scenario["steps"]
    trace: list[dict[str, Any]] = []
    passed = True
    failure_point = None
    contract_violations: list[str] = []

    for step in steps:
        step_result: dict[str, Any] = {"step": step, "ok": True}
        if step == "classify_intent":
            start = time.perf_counter()
            result = classify_hybrid(scenario["message"], use_llm=False)
            step_result["latency_ms"] = round((time.perf_counter() - start) * 1000, 2)
            step_result["predicted_intent"] = result.get("intent")
            step_result["ok"] = result.get("intent") == scenario.get("expected_intent")
        elif step in {"parse", "validate_extraction"}:
            parse_result = _parse_fixture(scenario["document_type"], scenario["fixture_id"])
            step_result.update(parse_result)
            expected_fail = scenario.get("expected_failure_step") == "parse"
            step_result["ok"] = (not parse_result["ok"] and expected_fail) or (
                parse_result["ok"] and not expected_fail
            )
            if not parse_result["ok"] and not expected_fail:
                contract_violations.append(parse_result.get("error", "parse_failed"))
        elif step in {
            "upload",
            "generate_suggestions",
            "queue",
            "workflow",
            "inventory_update",
            "start_workflow",
            "inventory_status_command",
        }:
            step_result["simulated"] = True
            step_result["note"] = "Backend step validated via separate NestJS e2e spec"
        else:
            step_result["ok"] = False
            step_result["error"] = "unknown_step"

        trace.append(step_result)
        if not step_result["ok"]:
            passed = False
            failure_point = step
            break

    return {
        "id": scenario["id"],
        "name": scenario["name"],
        "passed": passed,
        "failure_point": failure_point,
        "contract_violations": contract_violations,
        "trace": trace,
    }


def evaluate() -> dict[str, Any]:
    scenarios = json.loads(SCENARIOS.read_text(encoding="utf-8"))
    results = [_run_scenario(s) for s in scenarios]
    passed = sum(1 for r in results if r["passed"])
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_scenarios": len(results),
        "passed": passed,
        "success_rate": round(passed / len(results), 4),
        "results": results,
    }


if __name__ == "__main__":
    report = evaluate()
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    out = REPORT_DIR / "e2e_validation.json"
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"success_rate": report["success_rate"], "report_path": str(out)}, indent=2))
