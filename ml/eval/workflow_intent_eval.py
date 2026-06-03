"""Workflow intent evaluation with precision, recall, and confusion matrix."""

from __future__ import annotations

import argparse
import json
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from bot_engine import classify_hybrid

ROOT = Path(__file__).resolve().parents[1]
INTENT_DIR = ROOT / "data" / "eval" / "intents"
REPORT_DIR = ROOT / "eval" / "reports"


def load_datasets() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for path in sorted(INTENT_DIR.glob("*.json")):
        intent_key = path.stem
        for item in json.loads(path.read_text(encoding="utf-8")):
            rows.append(
                {
                    **item,
                    "dataset": intent_key,
                    "source_file": path.name,
                }
            )
    return rows


def compute_metrics(
    y_true: list[str],
    y_pred: list[str],
    labels: list[str],
) -> dict[str, Any]:
    tp = defaultdict(int)
    fp = defaultdict(int)
    fn = defaultdict(int)
    support = Counter(y_true)

    for truth, pred in zip(y_true, y_pred):
        if truth == pred:
            tp[truth] += 1
        else:
            fn[truth] += 1
            fp[pred] += 1

    per_intent: dict[str, Any] = {}
    precisions: list[float] = []
    recalls: list[float] = []

    for label in labels:
        p_den = tp[label] + fp[label]
        r_den = tp[label] + fn[label]
        precision = tp[label] / p_den if p_den else 0.0
        recall = tp[label] / r_den if r_den else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0
        per_intent[label] = {
            "support": support[label],
            "true_positives": tp[label],
            "false_positives": fp[label],
            "false_negatives": fn[label],
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
        }
        if support[label] > 0:
            precisions.append(precision)
            recalls.append(recall)

    accuracy = sum(1 for t, p in zip(y_true, y_pred) if t == p) / len(y_true)
    macro_precision = sum(precisions) / len(precisions) if precisions else 0.0
    macro_recall = sum(recalls) / len(recalls) if recalls else 0.0

    confusion: dict[str, dict[str, int]] = {label: defaultdict(int) for label in labels}
    for truth, pred in zip(y_true, y_pred):
        confusion[truth][pred] += 1

    false_positives = [
        {"expected": truth, "predicted": pred, "count": count}
        for truth in labels
        for pred, count in confusion[truth].items()
        if truth != pred and count > 0
    ]
    false_negatives = false_positives

    return {
        "accuracy": round(accuracy, 4),
        "macro_precision": round(macro_precision, 4),
        "macro_recall": round(macro_recall, 4),
        "per_intent": per_intent,
        "confusion_matrix": {k: dict(v) for k, v in confusion.items()},
        "false_positives": false_positives,
        "false_negatives": false_negatives,
    }


def evaluate(use_llm: bool = False) -> dict[str, Any]:
    rows = load_datasets()
    labels = sorted({row["expected_intent"] for row in rows})
    y_true: list[str] = []
    y_pred: list[str] = []
    failures: list[dict[str, Any]] = []
    latencies_ms: list[float] = []

    for row in rows:
        start = time.perf_counter()
        result = classify_hybrid(row["message"], use_llm=use_llm)
        latencies_ms.append((time.perf_counter() - start) * 1000)
        predicted = result.get("intent", "general_chat")
        expected = row["expected_intent"]
        y_true.append(expected)
        y_pred.append(predicted)
        if predicted != expected:
            failures.append(
                {
                    "message": row["message"],
                    "expected": expected,
                    "predicted": predicted,
                    "language": row.get("language"),
                    "dataset": row.get("dataset"),
                }
            )

    metrics = compute_metrics(y_true, y_pred, labels)
    by_language: dict[str, Any] = {}
    for language in sorted({r.get("language", "unknown") for r in rows}):
        lang_rows = [r for r in rows if r.get("language") == language]
        lt = [r["expected_intent"] for r in lang_rows]
        lp: list[str] = []
        for r in lang_rows:
            lp.append(classify_hybrid(r["message"], use_llm=use_llm).get("intent"))
        by_language[language] = {
            "count": len(lang_rows),
            "accuracy": round(sum(1 for t, p in zip(lt, lp) if t == p) / len(lt), 4),
        }

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mode": "live_llm" if use_llm else "deterministic",
        "total_examples": len(rows),
        "labels": labels,
        "latency_ms": {
            "mean": round(sum(latencies_ms) / len(latencies_ms), 2),
            "max": round(max(latencies_ms), 2),
        },
        "by_language": by_language,
        **metrics,
        "failures_sample": failures[:25],
        "failure_count": len(failures),
    }


def write_report(report: dict[str, Any], use_llm: bool) -> Path:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    suffix = "live" if use_llm else "deterministic"
    path = REPORT_DIR / f"workflow_intent_eval_{suffix}.json"
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    return path


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate workflow intent classification")
    parser.add_argument("--live", action="store_true", help="Use OpenAI LLM fallback")
    args = parser.parse_args()
    report = evaluate(use_llm=args.live)
    out = write_report(report, args.live)
    print(json.dumps({"report_path": str(out), "summary": {
        "accuracy": report["accuracy"],
        "macro_precision": report["macro_precision"],
        "macro_recall": report["macro_recall"],
        "failure_count": report["failure_count"],
    }}, indent=2))


if __name__ == "__main__":
    main()
