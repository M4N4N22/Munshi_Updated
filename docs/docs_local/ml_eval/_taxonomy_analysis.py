"""Analysis-only taxonomy generator from benchmark_results.json."""
from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path

OUT = Path(__file__).parent
R = json.loads((OUT / "benchmark_results.json").read_text(encoding="utf-8"))["results"]

LEVELS = {
    1: "Canonical", 2: "Natural English", 3: "Hindi", 4: "Hinglish", 5: "Broken English",
    6: "MSME", 7: "Typos", 8: "Short", 9: "Conversational", 10: "Context", 11: "Ambiguous", 12: "Multi-intent",
}


def acc(rows, k="intent_correct"):
    return round(sum(r[k] for r in rows) / len(rows), 4) if rows else 0.0


def rank(a):
    if a >= 0.85:
        return "Excellent"
    if a >= 0.65:
        return "Good"
    if a >= 0.5:
        return "Acceptable"
    if a >= 0.3:
        return "Weak"
    return "Critical"


# Confusion with examples
conf = defaultdict(list)
for x in R:
    if not x["intent_correct"]:
        key = (x["expected_intent"], x["predicted_intent"])
        conf[key].append(x["message"])

conf_stats = []
for (e, p), msgs in conf.items():
    exp_total = sum(1 for x in R if x["expected_intent"] == e)
    conf_stats.append({
        "expected": e, "predicted": p, "count": len(msgs),
        "pct_of_expected": round(len(msgs) / exp_total * 100, 1) if exp_total else 0,
        "examples": msgs[:5],
    })
conf_stats.sort(key=lambda x: -x["count"])

# By expected intent confusion breakdown
by_exp_conf = defaultdict(Counter)
for x in R:
    if not x["intent_correct"]:
        by_exp_conf[x["expected_intent"]][x["predicted_intent"]] += 1

# LLM analysis
llm = [x for x in R if x["inference_path"] == "llm"]
llm_pass = [x for x in llm if x["intent_correct"]]
llm_fail_phrases = Counter(x["message"][:60] for x in llm if not x["intent_correct"])

# LLM cases that could be deterministic (failed but similar patterns exist in det successes)
det_msgs = {x["workflow"] for x in R if x["inference_path"] == "deterministic_pre" and x["intent_correct"]}
llm_should_det = []
for x in llm:
    if not x["intent_correct"] and x["level"] in (3, 4, 6):
        llm_should_det.append(x)

# Deterministic failures
det = [x for x in R if x["inference_path"] == "deterministic_pre"]
det_fail = [x for x in det if not x["intent_correct"]]
det_fp = [x for x in det if not x["intent_correct"]]  # misroute

# Entity audit
def field_acc(cases, field, extract=False):
    src = "entities_extracted"
    subset = []
    for x in cases:
        exp = x.get("expected_entities") or {}
        if field in exp and exp[field] is not None:
            subset.append(x)
    if not subset:
        return None, 0, []
    ok = 0
    fails = []
    for x in subset:
        ev = x["expected_entities"][field]
        pv = (x.get("entities_extracted") or {}).get(field)
        match = (str(ev).lower() == str(pv).lower()) if isinstance(ev, str) and pv else ev == pv
        if match:
            ok += 1
        else:
            fails.append({"message": x["message"], "expected": ev, "got": pv})
    return round(ok / len(subset), 4), len(subset), fails[:5]

entity_fields = {}
for f in ["worker_slug", "depart_slug", "id", "reject_reason", "task_description"]:
    entity_fields[f] = field_acc([x for x in R if x["eval_type"] == "classify"], f)
for f in ["assignee_hint", "quantity", "item_name_or_sku", "task_kind"]:
    entity_fields[f"extract_{f}"] = field_acc([x for x in R if x["eval_type"] == "extract"], f)

# MSME phrases
msme = [x for x in R if x["language"] == "msme"]
msme_by_wf = defaultdict(list)
for x in msme:
    msme_by_wf[x["workflow"]].append(x)

# Ambiguous
amb = [x for x in R if x["level"] == 11]
multi = [x for x in R if x["level"] == 12]

# Production risk
wf = defaultdict(list)
for x in R:
    wf[x["workflow"]].append(x)

risk_map = {
    "task_self_assign": ("Critical", "Manager cannot accept owner tasks via NL"),
    "task_transfer": ("Critical", "Misrouted tasks cannot be transferred"),
    "task_rejection": ("Critical", "Managers cannot reject via NL"),
    "issue_resolve": ("Critical", "Issues stay open"),
    "department_assignment": ("High", "Owner cannot route to departments naturally"),
    "member_lookup": ("High", "Owner cannot see team without exact phrase"),
    "inventory_delivery": ("High", "Stock dispatch conflated with generic assign"),
    "task_delegation": ("High", "Manager delegation fails"),
    "purchase_request": ("Medium", "Procurement blocked on NL"),
    "inventory_status": ("Medium", "Stock queries fail conversationally"),
    "issue_reporting": ("Medium", "Floor issues may not register"),
    "attendance_absent": ("Medium", "Leave marking unreliable"),
    "low_stock_workflow": ("Medium", "Reorder path unclear"),
    "task_assignment": ("Medium", "Core assign partially works"),
    "inventory_issue": ("Medium", "Material issue extraction gaps"),
}

analysis = {
    "overall_intent": acc(R),
    "overall_entity": acc(R, "entity_correct"),
    "full_pass": round(sum(1 for x in R if x["outcome"] == "PASS") / len(R), 4),
    "conf_top20": conf_stats[:20],
    "by_exp_conf": {k: dict(v) for k, v in by_exp_conf.items()},
    "llm": {"total": len(llm), "pass_rate": acc(llm), "fail_rate": round(1 - acc(llm), 4),
            "top_fail_intents": Counter(x["expected_intent"] for x in llm if not x["intent_correct"]).most_common(15),
            "top_fail_phrases": llm_fail_phrases.most_common(15),
            "should_be_deterministic_sample": [{"message": x["message"], "expected": x["expected_intent"], "got": x["predicted_intent"]} for x in llm_should_det[:15]]},
    "det": {"total": len(det), "pass_rate": acc(det), "failures": [{"message": x["message"], "expected": x["expected_intent"], "got": x["predicted_intent"], "workflow": x["workflow"]} for x in det_fail]},
    "entity_fields": entity_fields,
    "msme": [{"message": x["message"], "workflow": x["workflow"], "expected": x["expected_intent"], "predicted": x["predicted_intent"], "ok": x["intent_correct"]} for x in msme],
    "ambiguous": [{"message": x["message"], "workflow": x["workflow"], "expected": x["expected_intent"], "predicted": x["predicted_intent"], "outcome": x["outcome"]} for x in amb],
    "multi": [{"message": x["message"], "workflow": x["workflow"], "expected": x["expected_intent"], "predicted": x["predicted_intent"], "outcome": x["outcome"]} for x in multi],
    "workflows": {},
    "language": {},
    "levels": {},
}

for w, rows in wf.items():
    analysis["workflows"][w] = {
        "n": len(rows), "intent_acc": acc(rows), "pass_rate": round(sum(1 for x in rows if x["outcome"] == "PASS") / len(rows), 4),
        "fail_rate": round(sum(1 for x in rows if x["outcome"] == "FAIL") / len(rows), 4),
        "entity_acc": acc(rows, "entity_correct"), "rank": rank(acc(rows)),
        "strong": [x["message"] for x in rows if x["intent_correct"]][:3],
        "weak": [x["message"] for x in rows if not x["intent_correct"]][:3],
    }

lang_groups = {
    "English": ["english"], "Hindi": ["hindi"], "Hinglish": ["hinglish"], "Mixed": ["mixed"],
    "Broken English": ["broken"], "MSME": ["msme"], "Typos": ["typos"], "Short": ["short"],
    "Conversational": ["conversational"], "Contextual": ["context"], "Ambiguous": ["ambiguous"], "Multi-intent": ["multi"],
}
for name, langs in lang_groups.items():
    rows = [x for x in R if x["language"] in langs]
    if not rows:
        continue
    fails = [x for x in rows if not x["intent_correct"]]
    top_pat = Counter((x["expected_intent"], x["predicted_intent"]) for x in fails).most_common(1)
    analysis["language"][name] = {
        "n": len(rows), "accuracy": acc(rows), "fail_rate": round(1 - acc(rows), 4),
        "top_failure": top_pat[0] if top_pat else None,
    }

for lvl in range(1, 13):
    rows = [x for x in R if x["level"] == lvl]
    analysis["levels"][lvl] = {"name": LEVELS[lvl], "n": len(rows), "accuracy": acc(rows)}

(OUT / "taxonomy_analysis.json").write_text(json.dumps(analysis, indent=2, ensure_ascii=False), encoding="utf-8")
print("written", OUT / "taxonomy_analysis.json")
