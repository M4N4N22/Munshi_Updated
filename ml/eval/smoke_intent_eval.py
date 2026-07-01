"""Smoke intent evaluation (~200 cases) for ML Hardening V1."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from bot_engine import classify_hybrid
from eval.workflow_intent_eval import compute_metrics

ROOT = Path(__file__).resolve().parents[1]
SMOKE_DIR = ROOT / "data" / "eval" / "smoke"
SMOKE_FILE = SMOKE_DIR / "smoke-v1.1.jsonl"
MANIFEST_FILE = SMOKE_DIR / "manifest.json"
SCHEMA_FILE = Path(__file__).resolve().parent / "schemas" / "smoke_case.schema.json"
REPORT_DIR = ROOT / "eval" / "reports"


def load_cases(slice_filter: str | None = None) -> list[dict[str, Any]]:
    if not SMOKE_FILE.exists():
        return []
    rows: list[dict[str, Any]] = []
    for line in SMOKE_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        case = json.loads(line)
        if slice_filter and case.get("slice") != slice_filter:
            continue
        rows.append(case)
    return rows


def evaluate(use_llm: bool = False, slice_filter: str | None = None) -> dict[str, Any]:
    rows = load_cases(slice_filter)
    if not rows:
        return {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "mode": "live_llm" if use_llm else "deterministic",
            "total_examples": 0,
            "accuracy": 0.0,
            "macro_precision": 0.0,
            "macro_recall": 0.0,
            "failure_count": 0,
            "by_slice": {},
            "failures_sample": [],
            "passed": True,
        }

    labels = sorted({row["expected_intent"] for row in rows})
    y_true: list[str] = []
    y_pred: list[str] = []
    failures: list[dict[str, Any]] = []

    for row in rows:
        predicted = classify_hybrid(row["message"], use_llm=use_llm).get("intent", "general_chat")
        expected = row["expected_intent"]
        y_true.append(expected)
        y_pred.append(predicted)
        forbidden = row.get("forbidden_intents") or []
        ok = predicted == expected and predicted not in forbidden
        if not ok:
            failures.append(
                {
                    "id": row.get("id"),
                    "message": row["message"],
                    "expected": expected,
                    "predicted": predicted,
                    "slice": row.get("slice"),
                    "forbidden_hit": predicted in forbidden,
                }
            )

    metrics = compute_metrics(y_true, y_pred, labels)
    by_slice: dict[str, Any] = {}
    for slice_name in sorted({r.get("slice", "unknown") for r in rows}):
        slice_rows = [r for r in rows if r.get("slice") == slice_name]
        st = [r["expected_intent"] for r in slice_rows]
        sp: list[str] = []
        for r in slice_rows:
            sp.append(classify_hybrid(r["message"], use_llm=use_llm).get("intent", "general_chat"))
        by_slice[slice_name] = {
            "count": len(slice_rows),
            "accuracy": round(sum(1 for t, p in zip(st, sp) if t == p) / len(st), 4),
        }

    contract_gap_slices = {"contract_gap", "import_boundary"}
    cg_rows = [r for r in rows if r.get("slice") in contract_gap_slices]
    cg_acc = 0.0
    if cg_rows:
        cg_hits = sum(
            1
            for r in cg_rows
            if classify_hybrid(r["message"], use_llm=use_llm).get("intent") == r["expected_intent"]
        )
        cg_acc = round(cg_hits / len(cg_rows), 4)

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mode": "live_llm" if use_llm else "deterministic",
        "total_examples": len(rows),
        "contract_gap_accuracy": cg_acc,
        "by_slice": by_slice,
        **metrics,
        "failures_sample": failures[:30],
        "failure_count": len(failures),
        "passed": metrics["accuracy"] >= 0.75 if len(rows) >= 50 else True,
    }


def write_report(report: dict[str, Any], use_llm: bool) -> Path:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    suffix = "live" if use_llm else "deterministic"
    path = REPORT_DIR / f"smoke_intent_eval_{suffix}.json"
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    return path


def main() -> None:
    parser = argparse.ArgumentParser(description="Smoke intent evaluation")
    parser.add_argument("--live", action="store_true", help="Use OpenAI LLM fallback")
    parser.add_argument("--no-llm", action="store_true", help="Deterministic only (default)")
    parser.add_argument("--slice", type=str, default=None, help="Filter by slice name")
    args = parser.parse_args()
    use_llm = args.live and not args.no_llm
    report = evaluate(use_llm=use_llm, slice_filter=args.slice)
    out = write_report(report, use_llm)
    print(
        json.dumps(
            {
                "report_path": str(out),
                "summary": {
                    "accuracy": report.get("accuracy"),
                    "failure_count": report.get("failure_count"),
                    "contract_gap_accuracy": report.get("contract_gap_accuracy"),
                    "total_examples": report.get("total_examples"),
                },
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
