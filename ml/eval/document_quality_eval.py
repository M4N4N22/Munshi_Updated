"""Document parsing quality evaluation."""

from __future__ import annotations

import argparse
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from contracts.python.models import InventoryImportExtraction, StockRegisterExtraction
from parsers.base import ParserInput
from parsers.inventory_import_parser import InventoryImportParser
from parsers.stock_register_parser import StockRegisterParser

ROOT = Path(__file__).resolve().parents[1]
REPORT_DIR = ROOT / "eval" / "reports"


def _load_manifest(doc_type: str) -> list[dict[str, Any]]:
    path = ROOT / "data" / "eval" / "documents" / doc_type / "manifest.json"
    return json.loads(path.read_text(encoding="utf-8"))


def _validate_schema(doc_type: str, payload: dict) -> bool:
    try:
        if doc_type == "INVENTORY_IMPORT":
            InventoryImportExtraction(**payload)
        else:
            StockRegisterExtraction(**payload)
        return True
    except Exception:
        return False


def _field_accuracy(expected: dict[str, Any], payload: dict[str, Any], doc_type: str) -> dict[str, bool]:
    items = payload.get("items") or []
    checks: dict[str, bool] = {}
    if "item_count" in expected:
        checks["item_count"] = len(items) == expected["item_count"]
    checks["document_type"] = payload.get("document_type") == doc_type
    if expected.get("first_name") and items:
        checks["first_name"] = items[0].get("name") == expected.get("first_name")
    if "first_qty" in expected and items:
        checks["first_qty"] = float(items[0].get("quantity", -1)) == float(expected["first_qty"])
    if expected.get("first_sku") and items:
        checks["first_sku"] = items[0].get("sku") == expected.get("first_sku")
    if expected.get("as_of_date"):
        checks["as_of_date"] = str(payload.get("as_of_date", "")).startswith(str(expected["as_of_date"])[:10])
    if expected.get("as_of_date_missing"):
        checks["as_of_date_missing"] = not payload.get("as_of_date")
    return checks


def _evaluate_type(doc_type: str, parser) -> dict[str, Any]:
    manifest = _load_manifest(doc_type)
    results: list[dict[str, Any]] = []
    schema_pass = 0
    parse_pass = 0
    field_pass = 0
    field_total = 0
    failures: list[dict[str, Any]] = []
    latencies: list[float] = []

    for fixture in manifest:
        rel = fixture["storage_path"]
        content = (ROOT / "data" / "eval" / "documents" / doc_type / rel).read_bytes()
        start = time.perf_counter()
        error = None
        payload: dict[str, Any] = {}
        schema_ok = False
        parse_ok = False
        field_checks: dict[str, bool] = {}

        try:
            result = parser.parse(
                ParserInput(
                    factory_id=1,
                    file_name=fixture["file_name"],
                    mime_type=fixture.get("mime_type", "text/csv"),
                    content=content,
                    document_type=fixture["document_type"],
                )
            )
            payload = result.payload
            parse_ok = True
            latencies.append((time.perf_counter() - start) * 1000)
            schema_ok = _validate_schema(fixture["document_type"], payload)
            if schema_ok:
                schema_pass += 1
            field_checks = _field_accuracy(fixture["expected"], payload, fixture["document_type"])
            field_pass += sum(1 for v in field_checks.values() if v)
            field_total += len(field_checks)
        except Exception as exc:
            error = str(exc)
            latencies.append((time.perf_counter() - start) * 1000)

        should_fail = fixture.get("should_fail", False)
        field_ok = all(field_checks.values()) if field_checks else True
        passed = (not parse_ok and should_fail) or (
            parse_ok and not should_fail and schema_ok and field_ok
        )

        if passed:
            parse_pass += 1
        else:
            failures.append(
                {
                    "id": fixture["id"],
                    "file_name": fixture["file_name"],
                    "error": error,
                    "should_fail": should_fail,
                    "field_checks": field_checks,
                }
            )

        results.append(
            {
                "id": fixture["id"],
                "passed": passed,
                "should_fail": should_fail,
                "parse_ok": parse_ok,
                "schema_ok": schema_ok,
                "field_checks": field_checks,
                "tags": fixture.get("tags", []),
                "error": error,
            }
        )

    total = len(manifest)
    return {
        "document_type": doc_type,
        "total_fixtures": total,
        "parser_pass_rate": round(parse_pass / total, 4),
        "schema_compliance_rate": round(schema_pass / max(1, total - sum(1 for f in manifest if f.get("should_fail"))), 4),
        "field_extraction_accuracy": round(field_pass / field_total, 4) if field_total else 1.0,
        "failure_rate": round(len(failures) / total, 4),
        "contract_compliance_rate": round(schema_pass / total, 4),
        "latency_ms_mean": round(sum(latencies) / len(latencies), 2),
        "results": results,
        "failures": failures,
    }


def evaluate() -> dict[str, Any]:
    inventory = _evaluate_type("inventory_import", InventoryImportParser())
    stock = _evaluate_type("stock_register", StockRegisterParser())
    total = inventory["total_fixtures"] + stock["total_fixtures"]
    passed = sum(1 for r in inventory["results"] + stock["results"] if r["passed"])
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "inventory_import": inventory,
        "stock_register": stock,
        "overall_pass_rate": round(passed / total, 4),
        "overall_failure_rate": round(1 - (passed / total), 4),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-report", action="store_true")
    args = parser.parse_args()
    report = evaluate()
    if args.write_report:
        REPORT_DIR.mkdir(parents=True, exist_ok=True)
        out = REPORT_DIR / "document_quality_eval.json"
        out.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps({"report_path": str(out), "overall_pass_rate": report["overall_pass_rate"]}, indent=2))
    else:
        print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
