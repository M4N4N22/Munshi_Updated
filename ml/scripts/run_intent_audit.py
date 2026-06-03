"""One-off audit runner — compares before/after intent accuracy."""
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from bot_engine import classify_hybrid

AUDIT_PATH = Path(r"c:\Users\shant\Downloads\munshi-dada-AS-sructure\munshi-dada-AS-sructure\docs\reports\intent-audit-results.json")
EXPANSION_PATH = AUDIT_PATH.parent / "intent-audit-sprint2-expansion.json"
SPRINT1_PATH = AUDIT_PATH.parent / "intent-audit-results-after.json"
OUT_PATH = AUDIT_PATH.parent / "intent-audit-results-sprint2.json"


def acc(d: dict) -> float:
    return round(100 * d["correct"] / d["total"], 1) if d["total"] else 0.0


def main() -> None:
    baseline = json.loads(AUDIT_PATH.read_text(encoding="utf-8"))
    sprint1 = json.loads(SPRINT1_PATH.read_text(encoding="utf-8")) if SPRINT1_PATH.exists() else baseline
    expansion = json.loads(EXPANSION_PATH.read_text(encoding="utf-8")) if EXPANSION_PATH.exists() else []

    seen = {r["phrase"] for r in baseline["results"]}
    rows = list(baseline["results"])
    for row in expansion:
        if row["phrase"] not in seen:
            rows.append(row)
            seen.add(row["phrase"])

    sprint1_overall = sprint1.get("after_overall", baseline["overall"]["accuracy"])
    sprint1_by_cat = sprint1.get("after_by_category", baseline["by_category"])

    results = []
    by_role: dict = defaultdict(lambda: {"total": 0, "correct": 0})
    by_cat: dict = defaultdict(lambda: {"total": 0, "correct": 0})
    correct = 0

    for row in rows:
        predicted = classify_hybrid(row["phrase"], use_llm=True)["intent"]
        expected = row["expected"]
        if expected == "NOT_SUPPORTED":
            ok = predicted == "general_chat"
        else:
            ok = predicted == expected
        correct += int(ok)
        by_role[row["role"]]["total"] += 1
        by_cat[row["category"]]["total"] += 1
        if ok:
            by_role[row["role"]]["correct"] += 1
            by_cat[row["category"]]["correct"] += 1
        results.append({**row, "predicted_after": predicted, "correct_after": ok})

    total = len(rows)
    out = {
        "sprint1_overall": sprint1_overall,
        "sprint2_overall": round(100 * correct / total, 1),
        "baseline_overall": baseline["overall"]["accuracy"],
        "after_overall": round(100 * correct / total, 1),
        "dataset_size": total,
        "baseline_by_role": {k: v["accuracy"] for k, v in baseline["by_role"].items()},
        "after_by_role": {k: acc(v) for k, v in by_role.items()},
        "sprint1_by_category": {k: v if isinstance(v, (int, float)) else v.get("accuracy", 0) for k, v in sprint1_by_cat.items()},
        "baseline_by_category": {k: v["accuracy"] for k, v in baseline["by_category"].items()},
        "after_by_category": {k: acc(v) for k, v in by_cat.items()},
        "remaining_failures": [r for r in results if not r["correct_after"]],
        "results": results,
    }
    OUT_PATH.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Sprint1: {sprint1_overall}% -> Sprint2: {out['sprint2_overall']}% (n={total})")
    print(f"Baseline: {out['baseline_overall']}%")
    for cat in (
        "discovery", "inventory", "procurement", "complete", "update",
        "members", "help", "attendance", "tasks", "reporting", "issue",
        "assign", "mgrassign", "depart_assign", "mgrtransfer", "mgrreject", "mgrself",
    ):
        s1 = sprint1_by_cat.get(cat, {})
        s1a = s1 if isinstance(s1, (int, float)) else s1.get("accuracy", "n/a")
        a = acc(by_cat[cat]) if cat in by_cat else 0.0
        t = by_cat[cat]["total"] if cat in by_cat else 0
        c = by_cat[cat]["correct"] if cat in by_cat else 0
        print(f"  {cat}: {s1a} -> {a} ({c}/{t})")
    print(f"Failures: {total - correct}")


if __name__ == "__main__":
    main()
