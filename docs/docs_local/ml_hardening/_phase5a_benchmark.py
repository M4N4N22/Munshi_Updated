"""Phase 5A before/after benchmark for manager workflows."""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

ML = Path(__file__).resolve().parents[3] / "ml"
sys.path.insert(0, str(ML))
from bot_engine import classify_hybrid  # noqa: E402

OUT = Path(__file__).parent
CORPUS = json.loads(
    (Path(__file__).parent.parent / "ml_eval" / "benchmark_corpus.json").read_text(encoding="utf-8")
)
MANAGER_EXTRA = json.loads(
    (ML / "data" / "eval" / "intents" / "manager_workflows.json").read_text(encoding="utf-8")
)

MGR_WORKFLOWS = {"task_self_assign", "task_delegation", "task_transfer", "task_rejection"}
REGRESSION_WORKFLOWS = {
    "attendance_present",
    "attendance_absent",
    "member_lookup",
    "general_help",
    "inventory_status",
    "purchase_request",
    "issue_reporting",
    "onboard_worker",
    "inventory_delivery",
    "inventory_count",
    "home_menu",
    "task_listing",
}

BEFORE = {
    "task_self_assign": 0.083,
    "task_delegation": 0.333,
    "task_transfer": 0.167,
    "task_rejection": 0.167,
    "overall_mgr": 0.188,
}

WORKFLOW_TO_INTENT = {
    "task_self_assign": "/mgrself",
    "task_delegation": "/mgrassign",
    "task_transfer": "/mgrtransfer",
    "task_rejection": "/mgrreject",
}


def eval_cases(cases, use_llm: bool):
    results = []
    for c in cases:
        pred = classify_hybrid(c["message"], use_llm=use_llm)
        intent = pred.get("intent", "general_chat")
        expected = c["expected_intent"]
        ok = intent == expected
        results.append({**c, "predicted": intent, "ok": ok, "use_llm": use_llm})
    return results


def summarize(results, label):
    by_wf = defaultdict(list)
    for r in results:
        by_wf[r.get("workflow", "extra")].append(r)
    out = {
        "label": label,
        "total": len(results),
        "accuracy": round(sum(r["ok"] for r in results) / len(results), 4) if results else 0,
    }
    out["by_workflow"] = {}
    for wf, rows in by_wf.items():
        out["by_workflow"][wf] = round(sum(r["ok"] for r in rows) / len(rows), 4)
    return out


def confusion_matrix(results):
    matrix = defaultdict(Counter)
    for r in results:
        matrix[r["expected_intent"]][r["predicted"]] += 1
    return {k: dict(v) for k, v in matrix.items()}


mgr_cases = [c for c in CORPUS if c["workflow"] in MGR_WORKFLOWS]
for item in MANAGER_EXTRA:
    mgr_cases.append(
        {
            **item,
            "workflow": "manager_extra",
            "role": "MANAGER",
            "level": 1,
            "eval_type": "classify",
        }
    )

reg_cases = [c for c in CORPUS if c["workflow"] in REGRESSION_WORKFLOWS]

mgr_det = eval_cases(mgr_cases, use_llm=False)
reg_det = eval_cases(reg_cases, use_llm=False)
# Hybrid path: manager cases should match deterministic after Phase 5A pre-classify.
mgr_hybrid = eval_cases(mgr_cases, use_llm=True)

report = {
    "before": BEFORE,
    "after_mgr_deterministic": summarize(mgr_det, "manager_det"),
    "after_mgr_hybrid": summarize(mgr_hybrid, "manager_hybrid"),
    "after_regression_deterministic": summarize(reg_det, "regression_det"),
    "mgr_failures_det": [r for r in mgr_det if not r["ok"]],
    "mgr_failures_hybrid": [r for r in mgr_hybrid if not r["ok"]],
    "regression_failures_det": [r for r in reg_det if not r["ok"]],
    "confusion_matrix_mgr": confusion_matrix(mgr_det),
    "mgr_passes": [r for r in mgr_det if r["ok"]],
}
(OUT / "phase5a_benchmark_results.json").write_text(
    json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
)
print(
    json.dumps(
        {
            "mgr_det_accuracy": report["after_mgr_deterministic"]["accuracy"],
            "mgr_hybrid_accuracy": report["after_mgr_hybrid"]["accuracy"],
            "mgr_det_by_workflow": report["after_mgr_deterministic"]["by_workflow"],
            "regression_det_accuracy": report["after_regression_deterministic"]["accuracy"],
            "mgr_failures_det": len(report["mgr_failures_det"]),
        },
        indent=2,
    )
)
