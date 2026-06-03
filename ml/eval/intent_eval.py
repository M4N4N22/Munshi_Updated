from typing import Dict, List


INTENT_FIXTURES: List[Dict[str, str]] = [
    {"message": "add worker rahul in production", "expected_intent": "addworker"},
    {"message": "show inventory", "expected_intent": "showinventory"},
    {"message": "yes", "expected_intent": "yes"},
    {"message": "no", "expected_intent": "no"},
]


def evaluate_intent_classification() -> dict:
    from bot_engine import CommandParser

    parser = CommandParser()
    passed = 0
    results = []

    for fixture in INTENT_FIXTURES:
        parsed = parser.parse(fixture["message"])
        intent = parsed.get("intent") if parsed else None
        ok = intent == fixture["expected_intent"]
        passed += int(ok)
        results.append({**fixture, "actual_intent": intent, "passed": ok})

    total = len(INTENT_FIXTURES)
    return {
        "total": total,
        "passed": passed,
        "accuracy": round(passed / total, 4) if total else 0.0,
        "results": results,
    }
