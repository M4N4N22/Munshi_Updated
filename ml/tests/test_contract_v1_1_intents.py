"""ML Hardening V1 — contract v1.1 intent coverage."""

import json
from pathlib import Path

from bot_engine import (
    VALID_INTENTS,
    classify_hybrid,
    get_intent_contract,
    load_valid_intents,
    workflow_pre_classify,
)

CONTRACT_PATH = Path(__file__).resolve().parents[1] / "contracts" / "intent-types.json"


def test_contract_version_v1_1():
    contract = get_intent_contract()
    assert contract["version"] == "v1.1"


def test_thirty_slash_intents_plus_general_chat():
    intents = contract_intents()
    slash = [i for i in intents if i.startswith("/")]
    assert len(slash) == 30
    assert "general_chat" in intents
    assert len(VALID_INTENTS) == 31


def test_valid_intents_loaded_from_json():
    file_intents = set(json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))["intents"])
    assert load_valid_intents() == file_intents
    assert VALID_INTENTS == file_intents


def test_v1_1_gap_intents_in_contract():
    intents = contract_intents()
    for intent in (
        "/assign_delivery",
        "/task_inventory_nl",
        "/inventory_import_csv",
        "/suggestion_approve",
        "/cancel",
    ):
        assert intent in intents


def test_import_inventory_routes_to_import_csv():
    assert workflow_pre_classify("import inventory")["intent"] == "/inventory_import_csv"
    assert classify_hybrid("import inventory", use_llm=False)["intent"] == "/inventory_import_csv"


def test_gap_intent_slash_commands():
    cases = {
        "/assign_delivery @ram bolt 50": "/assign_delivery",
        "/inventory_import_csv": "/inventory_import_csv",
        "/cancel": "/cancel",
        "/suggestion_approve": "/suggestion_approve",
        "/task_inventory_nl": "/task_inventory_nl",
    }
    for message, expected in cases.items():
        assert classify_hybrid(message, use_llm=False)["intent"] == expected


def test_discovery_phrases_no_import_inventory():
    phrases = get_intent_contract().get("discovery_phrases", [])
    assert "import inventory" not in phrases


def contract_intents() -> list[str]:
    return get_intent_contract()["intents"]
