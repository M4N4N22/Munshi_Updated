"""Write taxonomy reports 11-20 from taxonomy_analysis.json."""
import json
from pathlib import Path

OUT = Path(__file__).parent
A = json.loads((OUT / "taxonomy_analysis.json").read_text(encoding="utf-8"))
R = json.loads((OUT / "benchmark_results.json").read_text(encoding="utf-8"))["results"]

# 11 failure taxonomy
tax = [
    ("LLM Fallback to general_chat", 129, "Critical", "Users get owner home menu or generic reply instead of action", [
        "Manager NL completely unrouted", "Natural English paraphrases lost", "Help/report/issues unreachable via NL"]),
    ("Manager Routing Gap", 30, "Critical", "Owner→manager→worker chain breaks at manager actions", [
        "/mgrtransfer, /mgrreject, /mgrself → general_chat (10 each)"]),
    ("Department vs Assign Clarify", 8, "High", "Owner cannot route to sales/IT without exact dept keywords", [
        "sales ko figures bhejo → /assign_clarify"]),
    ("Inventory Dual-Path Confusion", 12, "High", "Delivery NL hits /assign before task-inventory extractor", [
        "Ram ko 20 cement deliver → /assign not extract:delivery"]),
    ("Entity Extraction Failure (classify)", 56, "High", "Wrong worker/dept/task id breaks downstream", [
        "depart_slug 0% accuracy on expected cases"]),
    ("Entity Extraction Failure (inventory)", 18, "High", "Stock dispatch/issue workflow cannot bootstrap", [
        "extract:null on short/ambiguous material phrases"]),
    ("Typos & OCR-style Input", 24, "Medium", "Shop-floor typing errors fail", ["presnt, cemnt, reprot, mgrtr"]),
    ("Short Command Fragments", 17, "Medium", "MSME shorthand not mapped", ["present, leave, report, members"]),
    ("Conversational / Context Loss", 38, "Medium", "Long natural messages misrouted", ["customer puch raha kitna cement"]),
    ("Ambiguity Mishandling", 16, "Medium", "Should clarify but guesses or chats", ["ram ko bhej do, figures bhejo"]),
    ("Multi-Intent Limitation", 16, "Medium", "Only first or wrong intent chosen", ["tasks dikhao aur present mark → /present"]),
    ("Instruction vs Completion", 4, "Medium", "Work status confused", ["3 half done → /complete", "issue 5 theek → /complete"]),
    ("Resolve vs Complete Confusion", 11, "Medium", "Issues cannot be closed via NL", ["/resolve → general_chat or /complete"]),
    ("Member Lookup Phrase Gap", 7, "High", "Team visibility requires exact Hindi phrase", ["members → general_chat"]),
    ("Broken English Miss", 20, "Low-Medium", "Non-native phrasing fails LLM", ["today no come sick"]),
]

lines = ["# Failure Taxonomy Report", "", "**Source:** benchmark run 2026-06-08 · 349 cases · analysis only", "",
          "## Summary tiers", "",
          "| Tier | Description | Share of corpus |",
          "|------|-------------|-----------------|",
          "| **Understands well** | Slash commands, deterministic Hindi ops phrases, home menu, workflow keywords | ~41% full PASS |",
          "| **Partially understands** | Hinglish assign, some inventory extract, business discovery | ~20% PARTIAL PASS |",
          "| **Misunderstands** | Manager NL, dept routing, conversational stock/PR | ~35% intent miss |",
          "| **Completely fails** | Typos, bare fragments, ambiguous material, multi-intent | ~14% typos acc |",
          "", "## Failure categories", "",
          "| Category | Est. cases | Severity | Business impact | Examples |",
          "|----------|------------|----------|-----------------|----------|"]
for name, cnt, sev, impact, exs in tax:
    lines.append(f"| {name} | {cnt} | {sev} | {impact} | {'; '.join(exs[:2])} |")
(OUT / "11-failure-taxonomy-report.md").write_text("\n".join(lines), encoding="utf-8")

# 12 confusion matrix report
lines = ["# Confusion Matrix Report (Complete)", "", "## Top 20 intent confusions", ""]
for i, c in enumerate(A["conf_top20"], 1):
    lines += [f"### {i}. `{c['expected']}` → `{c['predicted']}`", "",
              f"- **Failure count:** {c['count']}", f"- **% of expected intent failures:** {c['pct_of_expected']}%", "",
              "**Example inputs:**"]
    for ex in c["examples"]:
        lines.append(f"- `{ex}`")
    lines.append("")
lines += ["## Full matrix by expected intent", ""]
for exp, preds in sorted(A["by_exp_conf"].items()):
    total_exp = sum(1 for x in R if x["expected_intent"] == exp)
    lines.append(f"### `{exp}` (n={total_exp})")
    lines.append("")
    lines.append("| Predicted | Count | Failure % of expected |")
    lines.append("|-----------|-------|----------------------|")
    for p, n in sorted(preds.items(), key=lambda x: -x[1]):
        lines.append(f"| `{p}` | {n} | {round(n/total_exp*100,1)}% |")
    lines.append("")
(OUT / "12-confusion-matrix-report.md").write_text("\n".join(lines), encoding="utf-8")

# 13 language analysis (expanded)
lines = ["# Language Analysis Report (Expanded)", "", "| Style | N | Accuracy | Fail rate | Top failure pattern | Root cause |",
         "|-------|---|----------|-----------|---------------------|------------|"]
roots = {
    "English": "LLM misses non-slash paraphrases; deterministic covers only keyword-rich forms",
    "Hindi": "Strong operational regex; fails when phrasing outside _RE patterns",
    "Hinglish": "Mixed token order; dept/mgr intents weak",
    "Mixed": "Low-stock ambiguous between /inventory_status and /purchase_request_create",
    "Broken English": "LLM training alignment poor; no typo tolerance",
    "MSME": "Short verb-first phrases hit wrong layer or general_chat",
    "Typos": "No fuzzy match; LLM does not correct OCR-style input",
    "Short": "Insufficient tokens for LLM; regex needs anchors",
    "Conversational": "Long context not in few-shot; defaults to general_chat",
    "Contextual": "Temporal references not linked to intent",
    "Ambiguous": "System guesses instead of clarify workflow",
    "Multi-intent": "Single-intent architecture takes first match",
}
for name, d in A["language"].items():
    tf = f"`{d['top_failure'][0][0]}` → `{d['top_failure'][0][1]}`" if d.get("top_failure") else "—"
    lines.append(f"| {name} | {d['n']} | {d['accuracy']:.1%} | {d['fail_rate']:.1%} | {tf} | {roots.get(name,'')} |")
(OUT / "13-language-analysis-report.md").write_text("\n".join(lines), encoding="utf-8")

# 14 entity extraction audit
ef = A["entity_fields"]
lines = ["# Entity Extraction Audit", "", "## Classify path entities", "",
         "| Field | Accuracy | N | Common failure modes |",
         "|-------|----------|---|----------------------|"]
labels = {
    "worker_slug": "Worker names", "depart_slug": "Departments", "id": "Task IDs",
    "reject_reason": "Reject reasons", "task_description": "Task descriptions",
    "extract_assignee_hint": "Worker names (extract)", "extract_quantity": "Quantities",
    "extract_item_name_or_sku": "Inventory items/SKU", "extract_task_kind": "Task kind",
}
for k, label in labels.items():
    v = ef.get(k)
    if not v or v[0] is None:
        continue
    acc, n, fails = v
    fm = "; ".join(f"`{f['message'][:30]}`" for f in fails[:2]) if fails else "—"
    lines.append(f"| {label} | {acc:.1%} | {n} | {fm} |")
lines += ["", "## Root causes", "",
          "1. **LLM entity fields often null** when intent wrong — entity acc tied to intent acc",
          "2. **depart_slug 0%** — slug only set when dept keyword regex fires; LLM slug not validated",
          "3. **worker_slug 21%** — mention extraction works on `@` but not bare names in LLM path",
          "4. **task id 30%** — regex `_HAS_TASK_ID_RE` misses informal Hindi task references",
          "5. **Inventory extractor** — requires `ko` pattern + qty + item; breaks on reorder, typos, bare material",
          "6. **issue vs delivery** — `issue karo` verb triggers wrong task_kind on delivery phrases"]
(OUT / "14-entity-extraction-audit.md").write_text("\n".join(lines), encoding="utf-8")

# 15 MSME language
lines = ["# MSME Language Analysis", "", f"**Cases:** {len(A['msme'])} · **Accuracy:** {A['language']['MSME']['accuracy']:.1%}", ""]
by_wf = {}
for x in A["msme"]:
    by_wf.setdefault(x["workflow"], []).append(x)
for wf in sorted(by_wf):
    lines.append(f"## {wf}")
    lines.append("")
    lines.append("| Input | Expected | Predicted | Failure reason |")
    lines.append("|-------|----------|-----------|----------------|")
    for x in by_wf[wf]:
        reason = "—" if x["ok"] else ("LLM general_chat" if x["predicted"] == "general_chat" else "Wrong intent/route")
        lines.append(f"| `{x['message']}` | `{x['expected']}` | `{x['predicted']}` | {reason} |")
    lines.append("")
lines += ["## Unsupported MSME patterns today", "",
          "- Verb-only commands without slash (`present`, `leave`, `report`)",
          "- Material shorthand without assignee (`cement stock`, `ginati karo` without count keywords)",
          "- Manager routing shorthand (`18 reject`, `15 it ko`)",
          "- Bare team word (`members`) without `dikhao/batao`"]
(OUT / "15-msme-language-analysis.md").write_text("\n".join(lines), encoding="utf-8")

# 16 ambiguity
lines = ["# Ambiguity Analysis", "", f"**Level 11 cases:** {len(A['ambiguous'])} · **Accuracy:** {A['levels']['11']['accuracy']:.1%}", ""]
clarify_ok = sum(1 for x in A["ambiguous"] if x["predicted"] in ("/assign_clarify", "extract:null") and "ambiguous" in x["workflow"].lower() or x["predicted"] == "/assign_clarify")
lines += ["| Input | Expected | Predicted | Classification |", "|-------|----------|-----------|----------------|"]
for x in A["ambiguous"]:
    if x["predicted"] == x["expected"]:
        cls = "Correctly classified"
    elif x["predicted"] == "/assign_clarify":
        cls = "Correctly clarified (assign)"
    elif x["predicted"] == "general_chat":
        cls = "Incorrectly → general_chat"
    elif x["predicted"] == "extract:null":
        cls = "Correctly null (inventory)"
    else:
        cls = "Incorrectly classified"
    lines.append(f"| `{x['message']}` | `{x['expected']}` | `{x['predicted']}` | {cls} |")
lines += ["", "## Recommended clarification categories (analysis only)", "",
          "1. **Assignee missing** — material/task without @name or `ko`",
          "2. **Department missing** — action without dept slug",
          "3. **SKU/qty missing** — delivery without quantity or item",
          "4. **Task ID missing** — mgr action without task number",
          "5. **Intent pair** — complete vs assign vs resolve",
          "6. **Team vs home** — bare `members` vs greeting"]
(OUT / "16-ambiguity-analysis.md").write_text("\n".join(lines), encoding="utf-8")

# 17 multi-intent
lines = ["# Multi-Intent Analysis", "", f"**Level 12 cases:** {len(A['multi'])} · **Accuracy:** {A['levels']['12']['accuracy']:.1%}", "",
         "## Per-case analysis", "",
         "| Message | Expected | Predicted | Expected behavior | Current behavior | Risk |",
         "|---------|----------|-----------|-------------------|------------------|------|"]
risks = {"task_listing": "Medium", "attendance_present": "Low", "inventory_delivery": "High", "task_completion": "Medium"}
for x in A["multi"]:
    exp_beh = "Process both intents sequentially or confirm"
    cur = f"Single intent `{x['predicted']}` only"
    risk = risks.get(x["workflow"], "Medium")
    lines.append(f"| `{x['message'][:50]}` | `{x['expected']}` | `{x['predicted']}` | {exp_beh} | {cur} | {risk} |")
lines += ["", "## Architecture support for multi-intent", "",
          "### Can current architecture support multi-intent workflows?", "",
          "## **NO**", "",
          "**Reasoning:**",
          "- `classify_hybrid` returns exactly one intent per message",
          "- No intent segmentation or compound command parser",
          "- Backend `whatsapp.service` processes one command per inbound message",
          "- Multi-intent benchmark shows wrong-first-intent wins (e.g. `tasks dikhao aur present` → `/present`)",
          "- Task-inventory extractor is single extraction object",
          "",
          "Supporting multi-intent would require message splitting, priority rules, or confirmation — **out of current scope**."]
(OUT / "17-multi-intent-analysis.md").write_text("\n".join(lines), encoding="utf-8")

# 18 production risk
lines = ["# Production Risk Analysis", "", "Ranked by likelihood × business impact.", "",
         "| Rank | Workflow | Intent acc | Likelihood | Impact | Priority |",
         "|------|----------|------------|------------|--------|----------|"]
ranked = [
    ("task_self_assign", "Critical", "High", "Critical"),
    ("task_transfer", "Critical", "High", "Critical"),
    ("task_rejection", "Critical", "High", "Critical"),
    ("issue_resolve", "Critical", "Medium", "High"),
    ("department_assignment", "High", "High", "High"),
    ("member_lookup", "High", "Medium", "High"),
    ("inventory_delivery", "High", "High", "High"),
    ("task_delegation", "High", "Medium", "High"),
    ("task_assignment", "Medium", "Medium", "Critical"),
    ("attendance_present", "Low", "Low", "Medium"),
    ("home_menu", "Low", "Low", "Low"),
    ("onboard_vendor", "Low", "Low", "Medium"),
]
for i, (w, pri, like, imp) in enumerate(ranked, 1):
    wa = A["workflows"].get(w, {})
    lines.append(f"| {i} | {w} | {wa.get('intent_acc',0):.1%} | {like} | {imp} | **{pri}** |")
(OUT / "18-production-risk-analysis.md").write_text("\n".join(lines), encoding="utf-8")

# 19 hardening priority
opps = [
    (1, "Manager NL regex/LLM few-shot for mgrtransfer/mgrreject/mgrself", "+25-30% on manager workflows", "Medium", "Critical", "30 mgr failures → ~0"),
    (2, "Bare members + English team phrases → /members", "+5-8% member_lookup", "Low", "High", "Known staging gap"),
    (3, "Department slug detection in Hinglish (sales ko, IT team)", "+15% dept_assignment", "Medium", "High", "8 dept failures"),
    (4, "Route delivery NL to task-inventory extractor before /assign", "+20% inventory_delivery", "Medium", "High", "Dual-path fix"),
    (5, "LLM few-shot expansion for resolve vs complete", "+10% issue_resolve", "Low", "Medium", "11 resolve confusions"),
    (6, "Typo-tolerant fuzzy layer for top 20 commands", "+15% L7 accuracy", "High", "Medium", "Typos 14% acc"),
    (7, "inventory_status + purchase_request NL patterns", "+15% stock/PR", "Medium", "Medium", "15 LLM fails"),
    (8, "Short-command dictionary (present, leave, help, report)", "+10% MSME/short", "Low", "Medium", "Fragment input"),
    (9, "Assign_clarify trigger refinement (reduce false positives)", "+5% overall", "Medium", "Medium", "tasks→clarify"),
    (10, "Inventory extractor: broken English + ambiguous material", "+10% extract", "Medium", "Medium", "extract:null cases"),
]
lines = ["# Hardening Priority Report", "", "## TOP 10 opportunities (ranked)", "",
         "| Rank | Opportunity | Est. accuracy gain | Effort | Business impact | Evidence |",
         "|------|-------------|-------------------|--------|-----------------|----------|"]
for r, name, gain, eff, imp, ev in opps:
    lines.append(f"| {r} | {name} | {gain} | {eff} | {imp} | {ev} |")
(OUT / "19-hardening-priority-report.md").write_text("\n".join(lines), encoding="utf-8")

# 20 final recommendations
lines = ["# Final Hardening Recommendations", "",
         "**Analysis only — no implementation in this phase.**", "",
         "## Baseline scores", "",
         f"| Metric | Value |",
         f"|--------|-------|",
         f"| Overall intent accuracy | **{A['overall_intent']:.1%}** |",
         f"| Overall entity accuracy | **{A['overall_entity']:.1%}** |",
         f"| Full PASS rate | **{A['full_pass']:.1%}** |",
         "", "## What Munshi understands well", "",
         "1. Slash commands (`/present`, `/tasks`, `/complete`, workflows) — 100% via command_parser",
         "2. Home/greeting → `general_chat` — 100%",
         "3. Hindi operational regex — present, tasks, complete, issue with clear keywords",
         "4. `team members dikhao` → `/members`",
         "5. Worker/vendor/inventory_create workflow keyword starts",
         "6. Business discovery phrase list",
         "7. Structured `X ko N item deliver` extraction (subset)",
         "8. Assign with `@mention` deterministic path",
         "9. Task completion confirmation Hindi patterns",
         "10. Onboard vendor NL (83% — LLM + keywords)",
         "", "## Top 10 failure clusters", ""]
for i, c in enumerate(A["conf_top20"][:10], 1):
    lines.append(f"{i}. `{c['expected']}` → `{c['predicted']}` ({c['count']} cases)")
lines += ["", "## Top 10 hardening opportunities", ""]
for r, name, gain, eff, imp, ev in opps:
    lines.append(f"{r}. **{name}** — {gain}")
lines += ["", "## Phased hardening recommendation (analysis)", "",
          "### Phase A — Critical path (manager + dept + members)", "Opportunities 1, 2, 3 — unblocks owner/manager daily ops",
          "", "### Phase B — Inventory NL", "Opportunities 4, 10 — unblocks stock dispatch",
          "", "### Phase C — LLM coverage", "Opportunities 5, 7, 8 — improves conversational UX",
          "", "### Phase D — Robustness", "Opportunity 6, 9 — typos and false clarify reduction",
          "", "## Preserve during hardening", "",
          "- Command parser first — never regress slash path",
          "- Deterministic pre-classify for high-traffic Hindi ops",
          "- Task-inventory extractor determinism (no hallucination policy)",
          "- `general_chat` → owner home for OWNER/MANAGER",
          "", "## Production verdict", "",
          "**ML is NOT production-ready for free-text WhatsApp.** Harden Phase A before expanding NLP marketing.",
          "", "## Artifacts consumed", "",
          "- `benchmark_corpus.json`, `benchmark_results.json`",
          "- Reports `01`–`10`, `taxonomy_analysis.json`"]
(OUT / "20-final-hardening-recommendations.md").write_text("\n".join(lines), encoding="utf-8")

# 11 needs workflow section - add phase 3 to 11 via append
wf_lines = ["", "## Phase 3 — Workflow analysis", ""]
wf_map = {
    "attendance_present": "Attendance", "attendance_absent": "Attendance",
    "task_assignment": "Task Assignment", "task_delegation": "Task Delegation",
    "task_transfer": "Task Transfer", "task_rejection": "Task Rejection",
    "task_self_assign": "Manager Self-Assign", "task_completion": "Task Completion",
    "department_assignment": "Department Assignment", "issue_reporting": "Issue Reporting",
    "inventory_delivery": "Inventory Delivery", "inventory_issue": "Inventory Issue",
    "inventory_count": "Inventory Count", "purchase_request": "Purchase Requests",
    "low_stock_workflow": "Low Stock", "member_lookup": "Members", "general_help": "Help",
    "inventory_status": "Status Queries", "report": "Reports",
}
wf_lines.append("| Workflow | Accuracy | Pass | Fail | Entity | Rank | Strong | Weak |")
wf_lines.append("|----------|----------|------|------|--------|------|--------|------|")
for key, label in wf_map.items():
    w = A["workflows"].get(key, {})
    if not w:
        continue
    strong = w.get("strong", [""])[0][:25] if w.get("strong") else ""
    weak = w.get("weak", [""])[0][:25] if w.get("weak") else ""
    wf_lines.append(f"| {label} | {w['intent_acc']:.1%} | {w['pass_rate']:.1%} | {w['fail_rate']:.1%} | {w['entity_acc']:.1%} | {w['rank']} | `{strong}` | `{weak}` |")

# LLM + det sections append to 11
llm_sec = ["", "## Phase 5 — LLM routing", "",
           f"| Metric | Value |", f"| Total LLM cases | {A['llm']['total']} |",
           f"| Pass rate | {A['llm']['pass_rate']:.1%} |", f"| Fail rate | {A['llm']['fail_rate']:.1%} |",
           "", "LLM is the **weakest layer** (9.2% acc). 129 failures are `general_chat` fallback.",
           "", "### Should have been deterministic (sample)", ""]
for s in A["llm"]["should_be_deterministic_sample"][:10]:
    llm_sec.append(f"- `{s['message']}` expected `{s['expected']}` got `{s['got']}`")

det_sec = ["", "## Phase 6 — Deterministic routing", "",
           f"| Total deterministic_pre | {A['det']['total']} |",
           f"| Pass rate | {A['det']['pass_rate']:.1%} |",
           f"| False routes | {len(A['det']['failures'])} |",
           "", "### Incorrect deterministic routes", ""]
for f in A["det"]["failures"][:15]:
    det_sec.append(f"- `{f['message']}` — expected `{f['expected']}`, got `{f['got']}` ({f['workflow']})")

p11 = (OUT / "11-failure-taxonomy-report.md").read_text(encoding="utf-8")
(OUT / "11-failure-taxonomy-report.md").write_text(p11 + "\n".join(wf_lines + llm_sec + det_sec), encoding="utf-8")

print("Reports 11-20 written")
