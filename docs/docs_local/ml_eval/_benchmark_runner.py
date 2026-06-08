"""One-off ML benchmark runner — evaluation only, not part of product runtime."""
from __future__ import annotations

import json
import sys
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ML_ROOT = Path(__file__).resolve().parents[3] / "ml"
sys.path.insert(0, str(ML_ROOT))

from bot_engine import classify_hybrid, CommandParser, operational_pre_classify, workflow_pre_classify, assign_clarify_pre_classify, deterministic_pre_classify  # noqa: E402
from extractors.task_inventory_extractor import extract_task_inventory  # noqa: E402

OUT_DIR = Path(__file__).resolve().parent
CORPUS_PATH = OUT_DIR / "benchmark_corpus.json"
RESULTS_PATH = OUT_DIR / "benchmark_results.json"


def infer_path(message: str) -> str:
    if CommandParser().parse(message):
        return "command_parser"
    for fn in (workflow_pre_classify, operational_pre_classify, assign_clarify_pre_classify, deterministic_pre_classify):
        if fn(message) is not None:
            return "deterministic_pre"
    return "llm"


def load_corpus() -> list[dict]:
    return json.loads(CORPUS_PATH.read_text(encoding="utf-8"))


def entity_match(expected: dict | None, predicted: dict, keys: list[str]) -> bool:
    if not expected:
        return True
    for k in keys:
        ev = expected.get(k)
        pv = predicted.get(k)
        if ev is None:
            continue
        if isinstance(ev, str) and isinstance(pv, str):
            if ev.lower() != pv.lower():
                return False
        elif ev != pv:
            return False
    return True


def run() -> dict:
    corpus = load_corpus()
    results = []
    for i, case in enumerate(corpus):
        msg = case["message"]
        eval_type = case.get("eval_type", "classify")
        start = time.perf_counter()
        if eval_type == "extract":
            pred = extract_task_inventory(msg)
            predicted_intent = f"extract:{pred.get('task_kind')}" if pred.get("task_kind") else "extract:null"
            confidence = "deterministic"
            inference_path = "task_inventory_extractor"
            entities = pred
        else:
            pred = classify_hybrid(msg, use_llm=True)
            predicted_intent = pred.get("intent", "general_chat")
            confidence = "n/a"
            inference_path = infer_path(msg)
            entities = {
                "id": pred.get("id"),
                "worker_slug": pred.get("worker_slug"),
                "depart_slug": pred.get("depart_slug"),
                "deadline": pred.get("deadline"),
                "reject_reason": pred.get("reject_reason"),
                "task_description": pred.get("task_description"),
            }
        latency_ms = round((time.perf_counter() - start) * 1000, 1)
        expected_intent = case["expected_intent"]
        intent_ok = predicted_intent == expected_intent
        entity_ok = entity_match(case.get("expected_entities"), entities, list((case.get("expected_entities") or {}).keys()))
        if case.get("eval_type") == "extract":
            entity_ok = entity_match(case.get("expected_entities"), entities, list((case.get("expected_entities") or {}).keys()))
            outcome = "PASS" if intent_ok and entity_ok else ("PARTIAL PASS" if intent_ok else "FAIL")
        else:
            outcome = "PASS" if intent_ok and entity_ok else ("PARTIAL PASS" if intent_ok else "FAIL")
        results.append({
            **case,
            "case_id": case.get("case_id", f"CASE-{i+1:04d}"),
            "predicted_intent": predicted_intent,
            "confidence": confidence,
            "inference_path": inference_path,
            "entities_extracted": entities,
            "latency_ms": latency_ms,
            "intent_correct": intent_ok,
            "entity_correct": entity_ok,
            "outcome": outcome,
        })
        if (i + 1) % 25 == 0:
            print(f"  {i+1}/{len(corpus)}", flush=True)
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mode": "production (use_llm=True, classify_hybrid + extract_task_inventory)",
        "total_cases": len(results),
        "results": results,
    }


if __name__ == "__main__":
    print("Running ML benchmark...", flush=True)
    report = run()
    RESULTS_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    passed = sum(1 for r in report["results"] if r["outcome"] == "PASS")
    print(json.dumps({"total": report["total_cases"], "pass": passed, "accuracy": round(passed / report["total_cases"], 4)}, indent=2))
