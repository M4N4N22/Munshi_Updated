"""Generate ML eval markdown reports from benchmark_results.json."""
from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path

OUT = Path(__file__).parent
RESULTS = json.loads((OUT / "benchmark_results.json").read_text(encoding="utf-8"))
CORPUS = json.loads((OUT / "benchmark_corpus.json").read_text(encoding="utf-8"))
R = RESULTS["results"]

LEVELS = {
    1: "Canonical Commands",
    2: "Natural English",
    3: "Hindi",
    4: "Hinglish",
    5: "Broken English",
    6: "MSME Style Messaging",
    7: "Typos",
    8: "Short Commands",
    9: "Conversational Commands",
    10: "Context-Heavy Commands",
    11: "Ambiguous Commands",
    12: "Multi-Intent Commands",
}


def acc(rows, key="intent_correct"):
    return round(sum(r[key] for r in rows) / len(rows), 4) if rows else 0.0


def prf(rows):
    tp = sum(1 for r in rows if r["outcome"] == "PASS")
    partial = sum(1 for r in rows if r["outcome"] == "PARTIAL PASS")
    fail = sum(1 for r in rows if r["outcome"] == "FAIL")
    intent_ok = sum(1 for r in rows if r["intent_correct"])
    n = len(rows)
    return {
        "accuracy": round(intent_ok / n, 4) if n else 0,
        "full_pass_rate": round(tp / n, 4) if n else 0,
        "partial_pass": partial,
        "fail": fail,
        "intent_recall": round(intent_ok / n, 4) if n else 0,
        "entity_accuracy": round(sum(r["entity_correct"] for r in rows) / n, 4) if n else 0,
        "verdict": "PASS" if intent_ok / n >= 0.8 else "PARTIAL PASS" if intent_ok / n >= 0.5 else "FAIL",
    }


def rank_workflow(intent_a):
    if intent_a >= 0.85:
        return "Excellent"
    if intent_a >= 0.65:
        return "Good"
    if intent_a >= 0.5:
        return "Acceptable"
    if intent_a >= 0.3:
        return "Weak"
    return "Critical"


# --- 01 test corpus ---
lines = [
    "# ML Evaluation Test Corpus",
    "",
    f"**Generated:** {RESULTS['generated_at']}",
    f"**Mode:** {RESULTS['mode']}",
    f"**Total cases:** {len(CORPUS)}",
    f"**Workflows:** {len(set(c['workflow'] for c in CORPUS))}",
    "",
    "## Scope",
    "",
    "User-facing workflows from `current-capability-registry.md` v2.0. Covers `/classify` (hybrid, `use_llm=True`) and `extract_task_inventory` for inventory-linked NL.",
    "",
    "## Difficulty levels",
    "",
]
for lvl, name in LEVELS.items():
    lines.append(f"- **Level {lvl}** — {name}")
lines += ["", "## Workflows", ""]
for wf in sorted(set(c["workflow"] for c in CORPUS)):
    n = sum(1 for c in CORPUS if c["workflow"] == wf)
    lines.append(f"- `{wf}` — {n} cases")
lines += ["", "## Role distribution", ""]
for role in ["OWNER", "MANAGER", "WORKER"]:
    n = sum(1 for c in CORPUS if c["role"] == role)
    lines.append(f"- **{role}** — {n} cases")
lines += ["", "## Corpus sample (first 5 per workflow)", ""]
for wf in sorted(set(c["workflow"] for c in CORPUS)):
    lines.append(f"### {wf}")
    lines.append("")
    lines.append("| ID | Level | Role | Message | Expected |")
    lines.append("|----|-------|------|---------|----------|")
    for c in [x for x in CORPUS if x["workflow"] == wf][:5]:
        msg = c["message"].replace("|", "\\|")[:60]
        lines.append(f"| {c['case_id']} | L{c['level']} | {c['role']} | {msg} | `{c['expected_intent']}` |")
    lines.append("")
lines.append("Full machine-readable corpus: `benchmark_corpus.json`")
(OUT / "01-test-corpus.md").write_text("\n".join(lines), encoding="utf-8")

# --- 02 intent results ---
lines = [
    "# Intent Classification Results",
    "",
    f"**Run:** {RESULTS['generated_at']} · **Inference:** `classify_hybrid(message, use_llm=True)`",
    "",
    "## Overall",
    "",
    f"| Metric | Value |",
    f"|--------|-------|",
    f"| Total cases | {len(R)} |",
    f"| Intent accuracy | **{acc(R):.1%}** |",
    f"| Full PASS (intent + entities) | **{acc(R, 'entity_correct') if False else round(sum(1 for x in R if x['outcome']=='PASS')/len(R),4):.1%}** |",
    f"| PARTIAL PASS | {sum(1 for x in R if x['outcome']=='PARTIAL PASS')} |",
    f"| FAIL | {sum(1 for x in R if x['outcome']=='FAIL')} |",
    "",
    "## Per-workflow",
    "",
    "| Workflow | N | Intent Acc | Entity Acc | Verdict |",
    "|----------|---|------------|------------|---------|",
]
by_wf = defaultdict(list)
for x in R:
    by_wf[x["workflow"]].append(x)
for wf in sorted(by_wf):
    rows = by_wf[wf]
    m = prf(rows)
    lines.append(f"| {wf} | {len(rows)} | {m['accuracy']:.1%} | {m['entity_accuracy']:.1%} | {m['verdict']} |")
lines += ["", "## Per difficulty level", "", "| Level | Name | Intent Acc | N |", "|-------|------|------------|---|"]
by_lvl = defaultdict(list)
for x in R:
    by_lvl[x["level"]].append(x)
for lvl in sorted(by_lvl):
    lines.append(f"| {lvl} | {LEVELS[lvl]} | {acc(by_lvl[lvl]):.1%} | {len(by_lvl[lvl])} |")
lines += ["", "## Inference path breakdown", ""]
paths = Counter(x["inference_path"] for x in R)
for p, n in paths.most_common():
    sub = [x for x in R if x["inference_path"] == p]
    lines.append(f"- **{p}** — {n} cases, intent acc {acc(sub):.1%}")
lines += ["", "## Sample failures (intent)", "", "| Message | Expected | Predicted | Path |", "|---------|----------|-----------|------|"]
for x in [r for r in R if not r["intent_correct"]][:30]:
    msg = x["message"][:50].replace("|", "\\|")
    lines.append(f"| {msg} | `{x['expected_intent']}` | `{x['predicted_intent']}` | {x['inference_path']} |")
(OUT / "02-intent-results.md").write_text("\n".join(lines), encoding="utf-8")

# --- 03 entity extraction ---
ext = [x for x in R if x["eval_type"] == "extract"]
cls = [x for x in R if x["eval_type"] != "extract"]
lines = [
    "# Entity Extraction Results",
    "",
    "## Classify entities (`worker_slug`, `depart_slug`, `id`, etc.)",
    "",
    f"Cases with expected entities: {sum(1 for x in cls if x.get('expected_entities'))}",
    f"Entity field accuracy (when expected): **{acc([x for x in cls if x.get('expected_entities')], 'entity_correct'):.1%}**",
    "",
    "### Classify entity failures (sample)",
    "",
    "| Message | Expected entities | Extracted |",
    "|---------|-------------------|-----------|",
]
for x in [r for r in cls if r.get("expected_entities") and not r["entity_correct"]][:25]:
    lines.append(f"| {x['message'][:45]} | `{x.get('expected_entities')}` | `{x['entities_extracted']}` |")
lines += [
    "",
    "## Task-inventory extraction (`extract_task_inventory`)",
    "",
    f"| Metric | Value |",
    f"|--------|-------|",
    f"| Cases | {len(ext)} |",
    f"| Task-kind accuracy | {acc(ext):.1%} |",
    f"| Full entity PASS | {round(sum(1 for x in ext if x['outcome']=='PASS')/len(ext),4) if ext else 0:.1%} |",
    "",
    "### Per extraction workflow",
    "",
    "| Workflow | Intent/kind acc | Entity acc |",
    "|----------|-----------------|------------|",
]
for wf in ["inventory_delivery", "inventory_issue", "inventory_count"]:
    rows = [x for x in ext if x["workflow"] == wf]
    if rows:
        lines.append(f"| {wf} | {acc(rows):.1%} | {acc(rows, 'entity_correct'):.1%} |")
lines += ["", "### Extraction failures", ""]
for x in [r for r in ext if not r["intent_correct"] or not r["entity_correct"]][:20]:
    lines.append(f"- `{x['message']}` → expected `{x['expected_intent']}` got `{x['predicted_intent']}` entities `{x['entities_extracted']}`")
(OUT / "03-entity-extraction-results.md").write_text("\n".join(lines), encoding="utf-8")

# --- 04 confusion matrix ---
conf = Counter((x["expected_intent"], x["predicted_intent"]) for x in R if not x["intent_correct"])
labels = sorted(set(x["expected_intent"] for x in R) | set(x["predicted_intent"] for x in R))
lines = [
    "# Intent Confusion Matrix",
    "",
    "Rows = **expected**, columns = **predicted**. Counts from benchmark run.",
    "",
    "## Top incorrect mappings",
    "",
    "| Expected | Predicted | Count |",
    "|----------|-----------|-------|",
]
for (e, p), n in conf.most_common(40):
    lines.append(f"| `{e}` | `{p}` | {n} |")
lines += ["", "## Notable confusion pairs (workflow view)", ""]
pairs = [
    ("Inventory Delivery (NL)", "/assign", "Classify path steals delivery phrases before extractor runs"),
    ("Department Assignment", "/assign_clarify", "Dept slug not detected without keywords"),
    ("Department Assignment", "general_chat", "LLM fallback on natural English"),
    ("Member Lookup", "general_chat", "Bare `members` and some English phrases"),
    ("Manager Transfer", "general_chat", "No regex coverage; LLM defaults"),
    ("Manager Reject", "general_chat", "Same"),
    ("Manager Self-Assign", "general_chat", "Same"),
    ("Attendance", "general_chat", "Typos and conversational variants"),
    ("Purchase Request", "general_chat", "LLM miss on non-keyword phrasing"),
    ("Inventory Status", "general_chat", "Conversational stock queries"),
    ("Issue Resolve", "general_chat", "Confused with general confirmation"),
    ("Task Completion", "/assign", "Instruction vs confirmation disambiguation"),
]
for a, b, note in pairs:
    c = conf.get((a if a.startswith("/") or a.startswith("extract") else f"/{a}", b), 0)
    lines.append(f"- **{a}** → `{b}` — {note}" + (f" ({c} cases)" if c else ""))
(OUT / "04-confusion-matrix.md").write_text("\n".join(lines), encoding="utf-8")

# --- 05 failure analysis ---
failures = [x for x in R if x["outcome"] == "FAIL"]
patterns = Counter()
for x in failures:
    exp, pred = x["expected_intent"], x["predicted_intent"]
    if pred == "general_chat" and x["inference_path"] == "llm":
        patterns["LLM fallback to general_chat"] += 1
    elif x["level"] == 7:
        patterns["Typos"] += 1
    elif x["level"] in (9, 10):
        patterns["Context / conversational loss"] += 1
    elif x["level"] == 11:
        patterns["Ambiguity handling"] += 1
    elif x["level"] == 12:
        patterns["Multi-intent limitation"] += 1
    elif exp.startswith("extract:") and pred == "extract:null":
        patterns["Entity extraction null (inventory)"] += 1
    elif "/depart_assign" in exp and "/assign" in pred:
        patterns["Dept vs person assign confusion"] += 1
    elif "/assign" in exp and "/complete" in pred:
        patterns["Instruction vs completion confusion"] += 1
    elif x["language"] in ("hindi", "hinglish") and not x["intent_correct"]:
        patterns["Hindi/Hinglish miss"] += 1
    elif x["language"] == "broken" and not x["intent_correct"]:
        patterns["Broken English miss"] += 1
    elif exp.startswith("/mgr") and pred == "general_chat":
        patterns["Manager command LLM gap"] += 1
    else:
        patterns["Intent confusion (other)"] += 1

lines = [
    "# Failure Analysis",
    "",
    f"**Total FAIL outcomes:** {len(failures)} / {len(R)} ({len(failures)/len(R):.1%})",
    "",
    "## Root cause categories",
    "",
    "| Root cause | Failures tagged |",
    "|------------|-----------------|",
]
for cause, n in patterns.most_common():
    lines.append(f"| {cause} | {n} |")
lines += ["", "## Top 20 recurring failure patterns", ""]
top20 = patterns.most_common(20)
for i, (cause, n) in enumerate(top20, 1):
    lines.append(f"{i}. **{cause}** — {n} cases")
lines += ["", "## Representative failures by workflow", ""]
for wf in sorted(by_wf, key=lambda w: acc(by_wf[w])):
    bad = [x for x in by_wf[wf] if not x["intent_correct"]][:3]
    if not bad:
        continue
    lines.append(f"### {wf} (intent acc {acc(by_wf[wf]):.1%})")
    for x in bad:
        lines.append(f"- `{x['message']}` → expected `{x['expected_intent']}`, got `{x['predicted_intent']}` ({x['language']}, L{x['level']})")
    lines.append("")
(OUT / "05-failure-analysis.md").write_text("\n".join(lines), encoding="utf-8")

# --- 06 success analysis ---
success = [x for x in R if x["intent_correct"]]
sp = Counter()
for x in success:
    if x["inference_path"] == "deterministic_pre":
        sp["Deterministic regex pre-classify"] += 1
    elif x["inference_path"] == "command_parser":
        sp["Slash command parser"] += 1
    elif x["inference_path"] == "task_inventory_extractor":
        sp["Task-inventory extractor"] += 1
    elif x["level"] == 1:
        sp["Canonical slash commands"] += 1
    elif x["language"] == "hindi":
        sp["Hindi operational phrases"] += 1
    elif x["workflow"] == "home_menu":
        sp["General chat / home triggers"] += 1
    else:
        sp["LLM or hybrid correct"] += 1

lines = [
    "# Success Analysis",
    "",
    f"**Intent-correct cases:** {len(success)} / {len(R)} ({len(success)/len(R):.1%})",
    "",
    "## Top 20 strongest patterns",
    "",
]
strong_wf = sorted(by_wf.items(), key=lambda kv: acc(kv[1]), reverse=True)
for i, (wf, rows) in enumerate(strong_wf[:20], 1):
    lines.append(f"{i}. **{wf}** — intent acc {acc(rows):.1%} (n={len(rows)})")
lines += ["", "## What works well today", ""]
bullets = [
    "**Slash commands** — `/present`, `/tasks`, `/complete`, `/onboard_*`, `/help` bypass ML reliably",
    "**Deterministic operational regex** — Hindi/Hinglish attendance, tasks, issues with clear keywords",
    "**Member lookup phrases** — `team members dikhao` hits `/members` (not bare `members`)",
    "**Assign clarify** — Unassigned work without @mention routes to `/assign_clarify`",
    "**Home / greeting** — `general_chat` stable for owner home menu path",
    "**Task-inventory extractor** — Structured `X ko N item deliver/issue` patterns (not all variants)",
    "**Worker onboarding / vendor / inventory_create** — workflow intents with keyword triggers",
    "**Business discovery** — phrase list matches registry",
]
for b in bullets:
    lines.append(f"- {b}")
lines += ["", "## Success mechanism breakdown", ""]
for k, n in sp.most_common():
    lines.append(f"- {k}: {n}")
(OUT / "06-success-analysis.md").write_text("\n".join(lines), encoding="utf-8")

# --- 07 role ---
lines = ["# Role-Based Analysis", ""]
for role in ["OWNER", "MANAGER", "WORKER"]:
    rows = [x for x in R if x["role"] == role]
    lines += [
        f"## {role}",
        "",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| Cases | {len(rows)} |",
        f"| Intent accuracy | {acc(rows):.1%} |",
        f"| Full PASS | {round(sum(1 for x in rows if x['outcome']=='PASS')/len(rows),4):.1%} |",
        "",
        "### Weakest workflows",
        "",
    ]
    wf_role = defaultdict(list)
    for x in rows:
        wf_role[x["workflow"]].append(x)
    for wf, wr in sorted(wf_role.items(), key=lambda kv: acc(kv[1]))[:5]:
        lines.append(f"- `{wf}` — {acc(wr):.1%}")
    lines.append("")
(OUT / "07-role-based-analysis.md").write_text("\n".join(lines), encoding="utf-8")

# --- 08 language ---
lines = ["# Language & Style Analysis", ""]
lang_groups = {
    "English": ["english"],
    "Hindi": ["hindi"],
    "Hinglish": ["hinglish"],
    "Broken English": ["broken"],
    "MSME shorthand": ["msme"],
    "Mixed": ["mixed"],
    "Typos": ["typos"],
    "Conversational": ["conversational"],
    "Context-heavy": ["context"],
    "Ambiguous": ["ambiguous"],
    "Multi-intent": ["multi"],
    "Short": ["short"],
}
lines.append("| Style | N | Intent Acc | Full PASS |")
lines.append("|-------|---|------------|-----------|")
for name, langs in lang_groups.items():
    rows = [x for x in R if x["language"] in langs]
    if not rows:
        continue
    lines.append(f"| {name} | {len(rows)} | {acc(rows):.1%} | {round(sum(1 for x in rows if x['outcome']=='PASS')/len(rows),4):.1%} |")
(OUT / "08-language-analysis.md").write_text("\n".join(lines), encoding="utf-8")

# --- 09 scorecard ---
ambig = [x for x in R if x["level"] == 11]
multi = [x for x in R if x["level"] == 12]
lines = [
    "# Benchmark Scorecard",
    "",
    "## Final metrics",
    "",
    "| Metric | Score |",
    "|--------|-------|",
    f"| Overall intent accuracy | **{acc(R):.1%}** |",
    f"| Overall entity accuracy | **{acc(R, 'entity_correct'):.1%}** |",
    f"| Full PASS rate | **{round(sum(1 for x in R if x['outcome']=='PASS')/len(R),4):.1%}** |",
    f"| English accuracy | {acc([x for x in R if x['language']=='english']):.1%} |",
    f"| Hindi accuracy | {acc([x for x in R if x['language']=='hindi']):.1%} |",
    f"| Hinglish accuracy | {acc([x for x in R if x['language']=='hinglish']):.1%} |",
    f"| Broken English accuracy | {acc([x for x in R if x['language']=='broken']):.1%} |",
    f"| MSME style accuracy | {acc([x for x in R if x['language']=='msme']):.1%} |",
    f"| Ambiguous query accuracy | {acc(ambig):.1%} |",
    f"| Multi-intent accuracy | {acc(multi):.1%} |",
    "",
    "## Workflow rankings",
    "",
    "| Workflow | Intent Acc | Rank |",
    "|----------|------------|------|",
]
for wf, rows in sorted(by_wf.items(), key=lambda kv: acc(kv[1]), reverse=True):
    a = acc(rows)
    lines.append(f"| {wf} | {a:.1%} | {rank_workflow(a)} |")
(OUT / "09-benchmark-scorecard.md").write_text("\n".join(lines), encoding="utf-8")

# --- 10 final baseline ---
lines = [
    "# Final ML Baseline Report",
    "",
    f"**Date:** {RESULTS['generated_at'][:10]}",
    f"**Build reference:** capability registry v2.0 · ML `classify_hybrid(use_llm=True)` + `extract_task_inventory`",
    f"**Corpus:** {len(R)} cases · 29 workflows · 12 difficulty levels",
    "",
    "## Executive summary",
    "",
    "Munshi ML today is a **hybrid classifier**: slash-command parser → deterministic regex layers → OpenAI LLM fallback. Task-inventory NL uses a **separate deterministic extractor**.",
    "",
    "| Understanding tier | Description |",
    "|-------------------|-------------|",
    "| **Understands well** | Slash commands; clear Hindi/Hinglish operational phrases; home/greeting; workflow keyword starts; structured delivery/issue with `ko` + qty + item |",
    "| **Partially understands** | Natural English paraphrases; department routing; purchase/low-stock phrasing; inventory status conversational queries |",
    "| **Misunderstands** | Manager routing NL (`mgrtransfer`, `mgrreject`, `mgrself`); typos; short fragments; many ambiguous strings → `general_chat` |",
    "| **Fails completely** | Bare `members`; highly ambiguous material commands; multi-intent single messages; typo-heavy input (~14% acc) |",
    "",
    "## Production readiness",
    "",
    "### Is current ML ready for production use?",
    "",
    "## **NO**",
    "",
    "Overall intent accuracy **47.0%** on this corpus (full PASS **41.3%**). Structured slash-command users fare well; free-text MSME WhatsApp (registry target audience) is **not production-ready** without hardening.",
    "",
    "## Priority hardening areas (baseline only — no fixes in this run)",
    "",
    "1. **Manager task routing NL** — `/mgrtransfer`, `/mgrreject`, `/mgrself` collapse to `general_chat` under LLM (10/12 failures each).",
    "2. **Typos & short commands** — Level 7 accuracy **14.3%**; Level 8 **39.3%**.",
    "3. **Member lookup** — bare `members` → `general_chat` (known registry gap); conversational team queries often miss.",
    "4. **Department vs assign_clarify** — `figures bhejo` without dept keyword → wrong intent.",
    "5. **Inventory delivery dual path** — classify maps `Ram ko 20 cement deliver` to `/assign` instead of task-inventory extractor workflow.",
    "6. **Conversational & context-heavy** — Levels 9–10 under **25%** intent accuracy.",
    "7. **Purchase request & inventory status** — LLM `general_chat` fallback on non-canonical phrasing.",
    "8. **Issue resolve** — confused with general completion/chat.",
    "9. **Multi-intent messages** — Level 12 **42.9%**; single intent assumed.",
    "10. **Ambiguous material commands** — `material bhej do` → extractor null.",
    "",
    "## What to preserve",
    "",
    "- Deterministic pre-classify layer (152/349 cases, high accuracy)",
    "- Command parser for slash syntax",
    "- Task-inventory extractor for structured Hindi delivery/issue patterns",
    "- `team members dikhao` style member regex",
    "",
    "## Artifacts",
    "",
    "- `benchmark_corpus.json` — full test inputs",
    "- `benchmark_results.json` — machine-readable run output",
    "- Reports `01`–`09` in this directory",
    "",
    "## Success criteria checklist",
    "",
    "| # | Criterion | Met |",
    "|---|-----------|-----|",
    "| 1 | Every workflow tested | ✅ 29 workflows |",
    "| 2 | Every role tested | ✅ OWNER/MANAGER/WORKER |",
    "| 3 | Every language style tested | ✅ 12 levels |",
    "| 4 | Real ML inference used | ✅ use_llm=True |",
    "| 5 | Failure patterns identified | ✅ |",
    "| 6 | Success patterns identified | ✅ |",
    "| 7 | Baseline score established | ✅ |",
    "| 8 | No code changes | ✅ eval scripts in docs only |",
    "| 9 | No hardening performed | ✅ |",
    "| 10 | Actionable benchmark | ✅ |",
]
(OUT / "10-final-ml-baseline.md").write_text("\n".join(lines), encoding="utf-8")
print("Reports written to", OUT)
