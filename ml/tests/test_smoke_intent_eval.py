"""Smoke eval harness and dataset validation."""

import json
from pathlib import Path

from eval.smoke_intent_eval import SMOKE_FILE, evaluate, load_cases

SCHEMA = Path(__file__).resolve().parents[1] / "eval" / "schemas" / "smoke_case.schema.json"
MANIFEST = Path(__file__).resolve().parents[1] / "data" / "eval" / "smoke" / "manifest.json"


def test_smoke_dataset_exists_with_200_cases():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    cases = load_cases()
    assert manifest["total_cases"] == 200
    assert len(cases) == 200


def test_smoke_cases_have_required_fields():
    required = {"id", "message", "expected_intent", "slice", "contract_version"}
    for case in load_cases():
        assert required.issubset(case.keys())
        assert case["contract_version"] == "v1.1"


def test_smoke_eval_deterministic_meets_threshold():
    report = evaluate(use_llm=False)
    assert report["total_examples"] == 200
    assert report["accuracy"] >= 0.75
    assert report.get("contract_gap_accuracy", 0) >= 0.80


def test_import_collision_in_smoke():
    cases = [c for c in load_cases() if c["message"].strip().lower() == "import inventory"]
    assert cases
    report = evaluate(use_llm=False)
    failures = {f["message"]: f["predicted"] for f in report.get("failures_sample", [])}
    for case in cases:
        from bot_engine import classify_hybrid

        assert classify_hybrid(case["message"], use_llm=False)["intent"] == "/inventory_import_csv"
