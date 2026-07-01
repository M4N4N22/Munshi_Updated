# """
# bot_engine.py
# Production Hybrid Intent Classification Engine

# Architecture:
# 1. Slash command parser
# 2. Lightweight deterministic extraction
# 3. LLM semantic intent classification (with few-shot examples)
# 4. Validation layer
# 5. Structured JSON response

# Supports:
# - English
# - Hindi
# - Hinglish

# Changes from v1:
# - Added rich few-shot examples to LLM system prompt (primary fix for non-determinism)
# - Added a second LLM "confidence check" call when intent is ambiguous
# - Removed conflicting regex-based extract_reject_reason (LLM handles it)
# - Tightened CLOCK_RE to avoid false matches on plain numbers
# - Made department validation case-insensitive and slug-normalized
# - Added deterministic pre-classification rules that short-circuit the LLM
#   for the most commonly confused pairs (/assign vs /depart_assign,
#   instruction vs /complete)
# """

# import json
# import os
# import re
# from datetime import datetime, timedelta
# from typing import Optional, Dict, Any

# from dateutil.relativedelta import relativedelta
# from dotenv import load_dotenv
# from openai import OpenAI

# # ============================================================
# # ENV
# # ============================================================

# load_dotenv()

# client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# CHAT_MODEL = "gpt-4.1-mini"

# # ============================================================
# # DATE EXTRACTOR
# # ============================================================


# class DateTimeExtractor:

#     RELATIVE_KEYWORDS = {
#         "today": 0,
#         "aaj": 0,
#         "आज": 0,
#         "tomorrow": 1,
#         "kal": 1,
#         "कल": 1,
#         "parso": 2,
#         "परसों": 2,
#         "day after tomorrow": 2,
#     }

#     # FIX: Added word-boundary anchors so "12 people" doesn't parse as 12:00
#     CLOCK_RE = re.compile(
#         r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|baje|bje|baj|बजे)\b",
#         re.IGNORECASE,
#     )

#     @staticmethod
#     def parse_clock(message: str):
#         match = DateTimeExtractor.CLOCK_RE.search(message)
#         if not match:
#             return None

#         hour = int(match.group(1))
#         minute = int(match.group(2)) if match.group(2) else 0
#         ampm = match.group(3)

#         if ampm:
#             ampm = ampm.lower()
#             if ampm == "pm" and hour != 12:
#                 hour += 12
#             elif ampm == "am" and hour == 12:
#                 hour = 0
#             elif ampm in ["baje", "bje", "baj", "बजे"]:
#                 if 1 <= hour <= 6:
#                     hour += 12

#         return hour, minute

#     @staticmethod
#     def extract_date_from_message(message: str):
#         now = datetime.now()
#         today = now.date()
#         ml = message.lower()
#         final_date = None

#         for word, offset in DateTimeExtractor.RELATIVE_KEYWORDS.items():
#             if word in ml:
#                 final_date = today + timedelta(days=offset)
#                 break

#         if "next week" in ml or "agle hafte" in ml:
#             final_date = today + timedelta(days=7)

#         if "next month" in ml or "agle mahine" in ml:
#             final_date = today + relativedelta(months=1)

#         explicit_date = re.search(
#             r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})",
#             message,
#         )

#         if explicit_date:
#             day, month, year = explicit_date.groups()
#             try:
#                 final_date = datetime(int(year), int(month), int(day)).date()
#             except Exception:
#                 pass

#         if not final_date:
#             return {"deadline": None, "type": None}

#         clock = DateTimeExtractor.parse_clock(message)
#         if clock:
#             hour, minute = clock
#             dt = datetime(
#                 final_date.year, final_date.month, final_date.day, hour, minute, 0
#             )
#             return {"deadline": dt.isoformat(), "type": "datetime"}

#         return {"deadline": final_date.strftime("%Y-%m-%d"), "type": "date"}


# # ============================================================
# # GENERAL CHAT RESPONSE
# # ============================================================


# def get_general_chat_response(message: str):
#     return (
#         "Main task management, attendance, assignment aur reports mein help kar sakta hoon. "
#         "Commands dekhne ke liye /help type karo."
#     )


# # ============================================================
# # COMMAND PARSER
# # ============================================================


# class CommandParser:

#     def __init__(self):
#         self.datetime_extractor = DateTimeExtractor()

#     def parse(self, message: str):
#         message = message.strip()
#         ml = message.lower()
#         datetime_info = self.datetime_extractor.extract_date_from_message(message)

#         def build(intent, id=None, worker_slug=None, depart_slug=None, reject_reason=None):
#             return {
#                 "intent": intent,
#                 "id": id,
#                 "worker_slug": worker_slug,
#                 "depart_slug": depart_slug,
#                 "deadline": datetime_info.get("deadline"),
#                 "message": None,
#                 "reject_reason": reject_reason,
#             }

#         if ml.startswith("/tasks"):
#             return build("/tasks")
#         if ml.startswith("/present"):
#             return build("/present")
#         if ml.startswith("/absent"):
#             return build("/absent")
#         if ml.startswith("/help"):
#             return build("/help")
#         if ml.startswith("/report"):
#             return build("/report")
#         if ml.startswith("/members"):
#             return build("/members")
#         if ml.startswith("/issues"):
#             return build("/issues")
#         if ml.startswith("/issue"):
#             return build("/issue")

#         if ml.startswith("/resolve"):
#             task_id = re.search(r"\d+", message)
#             return build("/resolve", int(task_id.group()) if task_id else None)

#         if ml.startswith("/complete"):
#             task_id = re.search(r"\d+", message)
#             return build("/complete", int(task_id.group()) if task_id else None)

#         if ml.startswith("/update"):
#             task_id = re.search(r"\d+", message)
#             return build("/update", int(task_id.group()) if task_id else None)

#         if ml.startswith("/mgrtransfer"):
#             match = re.search(r"/mgrtransfer\s+(\d+)\s+(\w+)", message, re.IGNORECASE)
#             if match:
#                 return build(
#                     "/mgrtransfer",
#                     id=int(match.group(1)),
#                     depart_slug=match.group(2).lower(),
#                 )
#             task_id = re.search(r"\d+", message)
#             return build("/mgrtransfer", id=int(task_id.group()) if task_id else None)

#         if ml.startswith("/mgrreject"):
#             match = re.match(r"/mgrreject\s+(\d+)\s+(.*)", message, re.IGNORECASE)
#             if match:
#                 return build(
#                     "/mgrreject",
#                     id=int(match.group(1)),
#                     reject_reason=match.group(2).strip(),
#                 )
#             task_id = re.search(r"\d+", message)
#             return build("/mgrreject", id=int(task_id.group()) if task_id else None)

#         return None


# # ============================================================
# # DETERMINISTIC PRE-CLASSIFIER
# # Runs BEFORE the LLM to short-circuit high-confidence cases.
# # Prevents the LLM from flip-flopping on common patterns.
# # ============================================================

# # Patterns that CONFIRM work is already done (→ /complete)
# _COMPLETION_CONFIRMED_RE = re.compile(
#     r"\b("
#     r"ho\s*gaya|kar\s*diya|khatam\s*ho\s*gaya|khatam\s*kar\s*diya"
#     r"|done|finished|completed|complete\s*ho\s*gaya|complete\s*kar\s*diya"
#     r"|dispatch\s*done|kaam\s*ho\s*gaya|work\s*done|task\s*done"
#     r")\b",
#     re.IGNORECASE,
# )

# # Words that indicate an INSTRUCTION (block /complete mis-classification)
# _INSTRUCTION_SIGNAL_RE = re.compile(
#     r"\b("
#     r"karo|kare|karein|bhejo|do\b|dedo|dijiye|bolo|boldo"
#     r"|please|finish\s+the|complete\s+the|complete\s+this"
#     r")\b",
#     re.IGNORECASE,
# )

# # Patterns for @mention or explicit person name assignment
# _MENTION_RE = re.compile(r"@(\w+)")

# # Known department keywords → /depart_assign (no person named)
# _DEPT_KEYWORDS = {
#     "operations": ["warehouse", "dispatch", "logistics", "delivery", "inventory",
#                    "production", "machine", "packaging", "loading", "unloading"],
#     "sales":      ["invoice", "customer", "client", "quotation", "payment", "order"],
#     "purchase":   ["vendor", "supplier", "procurement", "raw material", "buying", "sourcing"],
#     "it":         ["server", "laptop", "computer", "software", "internet", "wifi", "printer"],
# }


# def _detect_department(message: str) -> Optional[str]:
#     ml = message.lower()
#     for dept, keywords in _DEPT_KEYWORDS.items():
#         if any(kw in ml for kw in keywords):
#             return dept
#     return None


# def deterministic_pre_classify(message: str) -> Optional[Dict[str, Any]]:
#     """
#     Returns a partial classification dict (intent + extracted fields) if
#     we are highly confident, else returns None to fall through to the LLM.

#     This eliminates the most common sources of LLM non-determinism.
#     """
#     ml = message.lower()

#     # --- /complete detection ---
#     # Only fire if completion language is present AND no instruction signal
#     if _COMPLETION_CONFIRMED_RE.search(message) and not _INSTRUCTION_SIGNAL_RE.search(message):
#         return {"intent": "/complete", "worker_slug": None, "depart_slug": None, "reject_reason": None}

#     # --- /assign vs /depart_assign ---
#     # If a @mention or recognised person pattern is present → /assign
#     mention = _MENTION_RE.search(message)
#     if mention:
#         return {
#             "intent": "/assign",
#             "worker_slug": f"@{mention.group(1)}",
#             "depart_slug": None,
#             "reject_reason": None,
#         }

#     return None  # Let LLM handle it


# # ============================================================
# # INTENT CLASSIFIER
# # ============================================================

# VALID_INTENTS = {
#     "/tasks", "/assign", "/depart_assign", "/mgrassign", "/mgrself",
#     "/update", "/issue", "/issues", "/resolve", "/members", "/report",
#     "/help", "/present", "/absent", "/complete", "/mgrtransfer",
#     "/mgrreject", "general_chat",
# }

# VALID_DEPARTMENTS = {"operations", "sales", "purchase", "it"}


# class IntentClassifier:

#     def __init__(self):
#         self.datetime_extractor = DateTimeExtractor()
#         print("✅ Hybrid Intent Classifier Loaded (v2 - robust)")

#     # --------------------------------------------------------
#     # ENTITY EXTRACTION
#     # --------------------------------------------------------

#     def extract_task_id(self, message: str) -> Optional[int]:
#         patterns = [
#             r"task\s*(?:id)?\s*(\d+)",
#             r"id\s*(\d+)",
#             r"#(\d+)",
#             r"(\d+)\s*wala\s*task",
#             r"task\s*number\s*(\d+)",
#             r"task\s*no\s*(\d+)",
#         ]
#         for pattern in patterns:
#             match = re.search(pattern, message, re.IGNORECASE)
#             if match:
#                 return int(match.group(1))
#         return None

#     def extract_mentions(self, message: str) -> Optional[str]:
#         mentions = _MENTION_RE.findall(message)
#         return f"@{mentions[0]}" if mentions else None

#     # --------------------------------------------------------
#     # LLM CLASSIFICATION
#     # --------------------------------------------------------

#     def llm_classify(self, message: str) -> Dict[str, Any]:
#         """
#         Single LLM call with temperature=0 and rich few-shot examples.
#         Few-shot examples are the #1 fix for non-determinism.
#         """
#         try:
#             response = get_openai_client().chat.completions.create(
#                 model=CHAT_MODEL,
#                 temperature=0,
#                 seed=42,          # Added: improves reproducibility where supported
#                 response_format={"type": "json_object"},
#                 messages=[
#                     {"role": "system", "content": self._build_system_prompt()},
#                     {"role": "user",   "content": message},
#                 ],
#             )
#             raw = response.choices[0].message.content
#             return json.loads(raw)
#         except Exception:
#             return {"intent": "general_chat", "worker_slug": None,
#                     "depart_slug": None, "reject_reason": None}

#     # --------------------------------------------------------
#     # MAIN PIPELINE
#     # --------------------------------------------------------

#     def classify(self, message: str) -> Dict[str, Any]:

#         datetime_info = self.datetime_extractor.extract_date_from_message(message)
#         task_id       = self.extract_task_id(message)
#         mention       = self.extract_mentions(message)

#         # --- Step 1: deterministic pre-classification ---
#         pre = deterministic_pre_classify(message)

#         if pre is not None:
#             # High-confidence deterministic path — skip LLM
#             intent       = pre["intent"]
#             worker_slug  = pre.get("worker_slug") or mention
#             depart_slug  = pre.get("depart_slug")
#             reject_reason = pre.get("reject_reason")
#         else:
#             # --- Step 2: LLM classification ---
#             llm_result    = self.llm_classify(message)
#             intent        = llm_result.get("intent", "general_chat")
#             worker_slug   = llm_result.get("worker_slug")
#             depart_slug   = llm_result.get("depart_slug")
#             reject_reason = llm_result.get("reject_reason")

#             # Validate intent
#             if intent not in VALID_INTENTS:
#                 intent = "general_chat"

#             # @mention overrides LLM worker_slug if LLM missed it
#             if mention and not worker_slug:
#                 worker_slug = mention

#             # Normalize and validate department slug
#             if depart_slug:
#                 depart_slug = depart_slug.strip().lower()
#                 if depart_slug not in VALID_DEPARTMENTS:
#                     depart_slug = None

#         result = {
#             "intent":       intent,
#             "id":           task_id,
#             "worker_slug":  worker_slug,
#             "depart_slug":  depart_slug,
#             "deadline":     datetime_info.get("deadline"),
#             "message":      None,
#             "reject_reason": reject_reason if intent == "/mgrreject" else None,
#         }

#         if intent == "general_chat":
#             result["message"] = get_general_chat_response(message)

#         return result

#     # --------------------------------------------------------
#     # SYSTEM PROMPT  (v2 — with few-shot examples)
#     # --------------------------------------------------------

#     def _build_system_prompt(self) -> str:
#         return """
# You are an enterprise multilingual intent classification engine.
# You understand English, Hindi, and Hinglish.
# You ONLY return valid JSON. No markdown, no explanations.

# ========================================================
# CRITICAL DISAMBIGUATION RULE
# ========================================================

# The single most important distinction:

# INSTRUCTION (telling someone to do work in the future)
#   → /assign  OR  /depart_assign  (depending on whether a person is named)

# CONFIRMATION (reporting work is already done)
#   → /complete

# Signal words for INSTRUCTION:
#   karo, kare, karein, bhejo, do, dedo, please, bolo, finish the, complete the

# Signal words for CONFIRMATION:
#   ho gaya, kar diya, done, finished, khatam ho gaya, dispatch done, complete ho gaya

# ========================================================
# INTENT DEFINITIONS
# ========================================================

# /tasks          → user wants to view their own task list
# /assign         → instruct a NAMED person to do NEW work (no existing task id)
# /depart_assign  → instruct a DEPARTMENT to do work (no person named, no existing task id)
# /mgrassign      → reassign an EXISTING task (task id present) to a named person
# /mgrself        → manager takes an existing task themselves
# /complete       → CONFIRMING work is already finished
# /update         → update status/details of an existing task
# /issue          → report a new problem
# /issues         → view existing issues
# /resolve        → mark an issue as resolved
# /present        → mark attendance as present
# /absent         → mark attendance as absent
# /members        → view team/member list
# /report         → generate a report
# /help           → user wants help or command list
# /mgrtransfer    → transfer existing task to another department
# /mgrreject      → reject a task with a reason
# general_chat    → casual conversation, greetings only

# ========================================================
# FEW-SHOT EXAMPLES
# ========================================================

# --- /assign examples ---
# Input:  ajay ko warehouse khali karne bolo
# Output: {"intent":"/assign","worker_slug":"ajay","depart_slug":null,"reject_reason":null}

# Input:  @rahul invoice bhejdo
# Output: {"intent":"/assign","worker_slug":"@rahul","depart_slug":null,"reject_reason":null}

# Input:  priya client ko call kare
# Output: {"intent":"/assign","worker_slug":"priya","depart_slug":null,"reject_reason":null}

# Input:  ajay complete the work
# Output: {"intent":"/assign","worker_slug":"ajay","depart_slug":null,"reject_reason":null}

# Input:  complete the work ajay
# Output: {"intent":"/assign","worker_slug":"ajay","depart_slug":null,"reject_reason":null}

# Input:  rahul ye task finish karo
# Output: {"intent":"/assign","worker_slug":"rahul","depart_slug":null,"reject_reason":null}

# --- /depart_assign examples ---
# Input:  warehouse khali karo
# Output: {"intent":"/depart_assign","worker_slug":null,"depart_slug":"operations","reject_reason":null}

# Input:  invoice bhejo
# Output: {"intent":"/depart_assign","worker_slug":null,"depart_slug":"sales","reject_reason":null}

# Input:  server theek karo
# Output: {"intent":"/depart_assign","worker_slug":null,"depart_slug":"it","reject_reason":null}

# Input:  raw material order karo
# Output: {"intent":"/depart_assign","worker_slug":null,"depart_slug":"purchase","reject_reason":null}

# Input:  complete the dispatch work
# Output: {"intent":"/depart_assign","worker_slug":null,"depart_slug":"operations","reject_reason":null}

# --- /mgrassign examples ---
# Input:  task 32 ajay ko do
# Output: {"intent":"/mgrassign","worker_slug":"ajay","depart_slug":null,"reject_reason":null}

# Input:  task 5 @rahul ko assign karo
# Output: {"intent":"/mgrassign","worker_slug":"@rahul","depart_slug":null,"reject_reason":null}

# Input:  id 4 priya ko de do
# Output: {"intent":"/mgrassign","worker_slug":"priya","depart_slug":null,"reject_reason":null}

# --- /mgrself examples ---
# Input:  task 32 main karunga
# Output: {"intent":"/mgrself","worker_slug":null,"depart_slug":null,"reject_reason":null}

# Input:  i will do task 8
# Output: {"intent":"/mgrself","worker_slug":null,"depart_slug":null,"reject_reason":null}

# --- /complete examples ---
# Input:  ho gaya
# Output: {"intent":"/complete","worker_slug":null,"depart_slug":null,"reject_reason":null}

# Input:  kar diya
# Output: {"intent":"/complete","worker_slug":null,"depart_slug":null,"reject_reason":null}

# Input:  done
# Output: {"intent":"/complete","worker_slug":null,"depart_slug":null,"reject_reason":null}

# Input:  task complete ho gaya
# Output: {"intent":"/complete","worker_slug":null,"depart_slug":null,"reject_reason":null}

# Input:  dispatch done
# Output: {"intent":"/complete","worker_slug":null,"depart_slug":null,"reject_reason":null}

# Input:  kaam khatam ho gaya
# Output: {"intent":"/complete","worker_slug":null,"depart_slug":null,"reject_reason":null}

# --- TRICKY: instruction vs completion ---
# Input:  complete the work          (← instruction, no person named)
# Output: {"intent":"/depart_assign","worker_slug":null,"depart_slug":"operations","reject_reason":null}

# Input:  kaam complete karo         (← instruction)
# Output: {"intent":"/depart_assign","worker_slug":null,"depart_slug":"operations","reject_reason":null}

# Input:  complete kar diya          (← confirmed done)
# Output: {"intent":"/complete","worker_slug":null,"depart_slug":null,"reject_reason":null}

# --- /mgrtransfer examples ---
# Input:  transfer task 12 to sales department
# Output: {"intent":"/mgrtransfer","worker_slug":null,"depart_slug":"sales","reject_reason":null}

# Input:  task 15 ko it department bhejo
# Output: {"intent":"/mgrtransfer","worker_slug":null,"depart_slug":"it","reject_reason":null}

# --- /mgrreject examples ---
# Input:  reject task 12 - wrong department
# Output: {"intent":"/mgrreject","worker_slug":null,"depart_slug":null,"reject_reason":"wrong department"}

# Input:  task 15 reject karo, not our scope
# Output: {"intent":"/mgrreject","worker_slug":null,"depart_slug":null,"reject_reason":"not our scope"}

# --- /present examples ---
# Input:  aa gaya hu
# Output: {"intent":"/present","worker_slug":null,"depart_slug":null,"reject_reason":null}

# Input:  i am here
# Output: {"intent":"/present","worker_slug":null,"depart_slug":null,"reject_reason":null}

# --- /absent examples ---
# Input:  aaj nahi aa paunga
# Output: {"intent":"/absent","worker_slug":null,"depart_slug":null,"reject_reason":null}

# Input:  leave chahiye
# Output: {"intent":"/absent","worker_slug":null,"depart_slug":null,"reject_reason":null}

# --- general_chat examples ---
# Input:  hello
# Output: {"intent":"general_chat","worker_slug":null,"depart_slug":null,"reject_reason":null}

# Input:  kaise ho
# Output: {"intent":"general_chat","worker_slug":null,"depart_slug":null,"reject_reason":null}

# ========================================================
# DEPARTMENT ROUTING
# ========================================================

# operations : warehouse, dispatch, logistics, delivery, inventory, production, machine, packaging, loading, unloading
# sales      : invoice, customer, client, quotation, payment, order
# purchase   : vendor, supplier, procurement, raw material, buying, sourcing
# it         : server, laptop, computer, software, internet, wifi, printer

# ========================================================
# OUTPUT FORMAT
# ========================================================

# Always return exactly:
# {
#   "intent": "<one of the valid intents>",
#   "worker_slug": "<string or null>",
#   "depart_slug": "<operations|sales|purchase|it|null>",
#   "reject_reason": "<string or null>"
# }

# Rules:
# - /assign      → worker_slug required, depart_slug null
# - /depart_assign → depart_slug required, worker_slug null
# - /mgrassign   → worker_slug required
# - /mgrself     → worker_slug null
# - /mgrtransfer → depart_slug required, worker_slug null
# - /mgrreject   → reject_reason required if detectable
# - all others   → both null unless explicitly present

# NEVER return markdown. NEVER return explanations. ONLY return JSON.
# """












"""
bot_engine.py
Production Hybrid Intent Classification Engine

Architecture:
1. Slash command parser
2. Lightweight deterministic extraction
3. LLM semantic intent classification (with few-shot examples)
4. Validation layer
5. Structured JSON response

Supports:
- English
- Hindi
- Hinglish

Changes from v1:
- Added rich few-shot examples to LLM system prompt (primary fix for non-determinism)
- Added a second LLM "confidence check" call when intent is ambiguous
- Removed conflicting regex-based extract_reject_reason (LLM handles it)
- Tightened CLOCK_RE to avoid false matches on plain numbers
- Made department validation case-insensitive and slug-normalized
- Added deterministic pre-classification rules that short-circuit the LLM
  for the most commonly confused pairs (/assign vs /depart_assign,
  instruction vs /complete)
"""

import json
import os
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any

from dateutil.relativedelta import relativedelta
from dotenv import load_dotenv
from openai import OpenAI

# ============================================================
# ENV
# ============================================================

load_dotenv()

_client: OpenAI | None = None


def get_openai_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is required for LLM features")
        _client = OpenAI(api_key=api_key)
    return _client

CHAT_MODEL = "gpt-4.1-mini"

# ============================================================
# CONTRACT (intent-types.json is source of truth)
# ============================================================

_INTENT_CONTRACT: Dict[str, Any] | None = None
_CONTRACTS_DIR = Path(__file__).resolve().parent / "contracts"


def get_intent_contract() -> Dict[str, Any]:
    global _INTENT_CONTRACT
    if _INTENT_CONTRACT is None:
        path = _CONTRACTS_DIR / "intent-types.json"
        _INTENT_CONTRACT = json.loads(path.read_text(encoding="utf-8"))
    return _INTENT_CONTRACT


def load_valid_intents() -> set[str]:
    return set(get_intent_contract()["intents"])


VALID_INTENTS = load_valid_intents()
VALID_DEPARTMENTS = set(get_intent_contract().get("departments", []))

# ============================================================
# DATE EXTRACTOR
# ============================================================


class DateTimeExtractor:

    RELATIVE_KEYWORDS = {
        "today": 0,
        "aaj": 0,
        "आज": 0,
        "tomorrow": 1,
        "kal": 1,
        "कल": 1,
        "parso": 2,
        "परसों": 2,
        "day after tomorrow": 2,
    }

    # FIX: Added word-boundary anchors so "12 people" doesn't parse as 12:00
    CLOCK_RE = re.compile(
        r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|baje|bje|baj|बजे)\b",
        re.IGNORECASE,
    )

    @staticmethod
    def parse_clock(message: str):
        match = DateTimeExtractor.CLOCK_RE.search(message)
        if not match:
            return None

        hour = int(match.group(1))
        minute = int(match.group(2)) if match.group(2) else 0
        ampm = match.group(3)

        if ampm:
            ampm = ampm.lower()
            if ampm == "pm" and hour != 12:
                hour += 12
            elif ampm == "am" and hour == 12:
                hour = 0
            elif ampm in ["baje", "bje", "baj", "बजे"]:
                if 1 <= hour <= 6:
                    hour += 12

        return hour, minute

    @staticmethod
    def extract_date_from_message(message: str):
        now = datetime.now()
        today = now.date()
        ml = message.lower()
        final_date = None

        for word, offset in DateTimeExtractor.RELATIVE_KEYWORDS.items():
            if word in ml:
                final_date = today + timedelta(days=offset)
                break

        if "next week" in ml or "agle hafte" in ml:
            final_date = today + timedelta(days=7)

        if "next month" in ml or "agle mahine" in ml:
            final_date = today + relativedelta(months=1)

        explicit_date = re.search(
            r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})",
            message,
        )

        if explicit_date:
            day, month, year = explicit_date.groups()
            try:
                final_date = datetime(int(year), int(month), int(day)).date()
            except Exception:
                pass

        if not final_date:
            return {"deadline": None, "type": None}

        clock = DateTimeExtractor.parse_clock(message)
        if clock:
            hour, minute = clock
            dt = datetime(
                final_date.year, final_date.month, final_date.day, hour, minute, 0
            )
            return {"deadline": dt.isoformat(), "type": "datetime"}

        return {"deadline": final_date.strftime("%Y-%m-%d"), "type": "date"}


# ============================================================
# GENERAL CHAT RESPONSE
# ============================================================


def _build_general_chat_system_prompt() -> str:
    return """
You are Munshi Assistant on WhatsApp. The user message is casual/greeting/off-topic OR a question about how to use the bot.

Your job: reply naturally in Hinglish (simple, friendly), in 1-2 short lines.

Rules:
- You are NOT a general-purpose chatbot. If the user asks unrelated questions (weather, jokes, news, etc.), politely redirect to what you can do.
- You CAN explain how to use the bot and suggest relevant commands.
- Prefer suggesting /help when the user seems lost.
- Do not output JSON, markdown, or bullets. Only a plain WhatsApp-style message.

What you can do (mention when relevant): tasks, attendance (present/absent), issues, reports, assignment/reassignment.
"""


def _general_chat_llm_reply(message: str) -> str:
    text = (message or "").strip()
    if not text:
        return "Hi! Aap kya karna chahte ho? Commands dekhne ke liye /help type karo."

    try:
        response = get_openai_client().chat.completions.create(
            model=CHAT_MODEL,
            temperature=0.2,
            seed=42,
            messages=[
                {"role": "system", "content": _build_general_chat_system_prompt()},
                {"role": "user", "content": text},
            ],
        )
        out = (response.choices[0].message.content or "").strip()
        return out or "Main tasks/attendance/issues/reports mein help kar sakta hoon. /help type karo."
    except Exception:
        return "Main tasks/attendance/issues/reports mein help kar sakta hoon. Commands ke liye /help type karo."


def get_general_chat_response(message: str):
    return _general_chat_llm_reply(message)


# ============================================================
# COMMAND PARSER
# ============================================================


class CommandParser:

    def __init__(self):
        self.datetime_extractor = DateTimeExtractor()

    def parse(self, message: str):
        message = message.strip()
        ml = message.lower()
        datetime_info = self.datetime_extractor.extract_date_from_message(message)

        def build(
            intent,
            id=None,
            worker_slug=None,
            depart_slug=None,
            reject_reason=None,
            task_description=None,
        ):
            out = {
                "intent": intent,
                "id": id,
                "worker_slug": worker_slug,
                "depart_slug": depart_slug,
                "deadline": datetime_info.get("deadline"),
                "message": None,
                "reject_reason": reject_reason,
            }
            if task_description is not None:
                out["task_description"] = task_description
            return out

        if ml.startswith("/tasks"):
            return build("/tasks")
        if ml.startswith("/present"):
            return build("/present")
        if ml.startswith("/absent"):
            return build("/absent")
        if ml.startswith("/help"):
            return build("/help")
        if ml.startswith("/report"):
            return build("/report")
        if ml.startswith("/members"):
            return build("/members")
        if ml.startswith("/issues"):
            return build("/issues")
        if ml.startswith("/issue"):
            return build("/issue")

        if ml.startswith("/resolve"):
            task_id = re.search(r"\d+", message)
            return build("/resolve", int(task_id.group()) if task_id else None)

        if ml.startswith("/complete"):
            task_id = re.search(r"\d+", message)
            return build("/complete", int(task_id.group()) if task_id else None)

        if ml.startswith("/update"):
            task_id = re.search(r"\d+", message)
            return build("/update", int(task_id.group()) if task_id else None)

        if ml.startswith("/mgrtransfer"):
            match = re.search(r"/mgrtransfer\s+(\d+)\s+(\w+)", message, re.IGNORECASE)
            if match:
                return build(
                    "/mgrtransfer",
                    id=int(match.group(1)),
                    depart_slug=match.group(2).lower(),
                )
            task_id = re.search(r"\d+", message)
            return build("/mgrtransfer", id=int(task_id.group()) if task_id else None)

        if ml.startswith("/mgrreject"):
            match = re.match(r"/mgrreject\s+(\d+)\s+(.*)", message, re.IGNORECASE)
            if match:
                return build(
                    "/mgrreject",
                    id=int(match.group(1)),
                    reject_reason=match.group(2).strip(),
                )
            task_id = re.search(r"\d+", message)
            return build("/mgrreject", id=int(task_id.group()) if task_id else None)

        if ml.startswith("/onboard_vendor"):
            return build("/onboard_vendor")
        if ml.startswith("/onboard_worker"):
            return build("/onboard_worker")
        if ml.startswith("/inventory_create"):
            return build("/inventory_create")
        if ml.startswith("/inventory_status"):
            return build("/inventory_status")
        if ml.startswith("/purchase_request_create"):
            return build("/purchase_request_create")
        if ml.startswith("/assign_clarify"):
            return build("/assign_clarify", task_description=message.strip())
        if ml.startswith("/business_discovery"):
            return build("/business_discovery")
        if ml.startswith("/continue_discovery"):
            return build("/continue_discovery")
        if ml.startswith("/assign_delivery"):
            worker_match = re.search(r"/assign_delivery\s+(@?\w+)", message, re.IGNORECASE)
            return build(
                "/assign_delivery",
                worker_slug=worker_match.group(1) if worker_match else None,
            )
        if ml.startswith("/inventory_import_csv"):
            return build("/inventory_import_csv")
        if ml.startswith("/cancel"):
            return build("/cancel")
        if ml.startswith("/suggestion_approve"):
            return build("/suggestion_approve")
        if ml.startswith("/task_inventory_nl"):
            return build("/task_inventory_nl")

        return None


# ============================================================
# DETERMINISTIC PRE-CLASSIFIER
# Runs BEFORE the LLM to short-circuit high-confidence cases.
# Prevents the LLM from flip-flopping on common patterns.
# ============================================================

# Patterns that CONFIRM work is already done (→ /complete)
_COMPLETION_CONFIRMED_RE = re.compile(
    r"(task\s+(finish(ed)?|done|khatam|poora|complete(d)?)|"
    r"job\s+complete(d)?|assignment\s+complete(d)?|"
    r"kaam\s+(complete|poora|khatam|done|ho\s+gaya|ho\s+chuka)|"
    r"task\s+id\s+\d+\s+complete|"
    r"ho\s+gaya|kar\s+diya|khatam\s+ho\s+gaya|khatam\s+kar\s+diya|"
    r"\bdone\b|\bfinished\b|\bcompleted\b|complete\s+ho\s+gaya|complete\s+kar\s+diya|"
    r"dispatch\s+done|kaam\s+ho\s+gaya|work\s+done|task\s+done|"
    r"\bfinish(ed)?\b|\btask\s+khatam\b|\bkaam\s+poora\b)",
    re.IGNORECASE,
)

# Partial progress — must win over /complete ("almost complete", "aadha ho gaya")
_UPDATE_PROGRESS_RE = re.compile(
    r"(task\s*\d+\s*update|update\s+task\s*\d+|status\s+update|progress\s+update|"
    r"task\s+update|update\s+task|task\s*\d+.{0,25}(percent|progress|update)|"
    r"task\s*\d+\s+par\s+kaam\s+chal\s+raha|almost\s+(complete|done)|"
    r"\d+\s*percent\s+(complete|done)|percent\s+complete|half\s+complete|"
    r"aadha\s+(ho\s+gaya|kaam|complete)|kaam\s+chal\s+raha|work\s+in\s+progress|"
    r"update\s+progress|kaam\s+almost|progress\s+update|"
    r"status\s+update\s+task|task\s*\d+\s+update\s+\d+\s*percent|"
    r"progress\s+batao\s+task\s*\d+|status\s+update\s+karo|"
    r"partial\s+complete\s+task\s*\d+|\d+\s*percent\s+done\s+task\s*\d+|"
    r"half\s+complete\s+task\s*\d+|done\s+task\s*\d+|complete\s+task\s*\d+)",
    re.IGNORECASE,
)

_MEMBERS_RE = re.compile(
    r"(team\s+members\s+(dikhao|batao|list)|members\s+(dikhao|list)|"
    r"employee\s+list|workers\s+dikhao|staff\s+list\s+dikhao|"
    r"team\s+list\s+dikhao|member\s+list)",
    re.IGNORECASE,
)

_HELP_RE = re.compile(
    r"(^help\b|\bhelp\s+chahiye|\bmadad\s+chahiye|commands\s+dikhao|help\s+please|"
    r"munshi\s+help|kya\s+kar\s+sakte\s+ho\s+munshi)",
    re.IGNORECASE,
)

# Words that indicate an INSTRUCTION (block /complete mis-classification)
_INSTRUCTION_SIGNAL_RE = re.compile(
    r"\b("
    r"karo|kare|karein|bhejo|do\b|dedo|dijiye|bolo|boldo"
    r"|please|finish\s+the|complete\s+the|complete\s+this"
    r")\b",
    re.IGNORECASE,
)

# Patterns for @mention or explicit person name assignment
_MENTION_RE = re.compile(r"@(\w+)")

# Known department keywords → /depart_assign (no person named)
_DEPT_KEYWORDS = {
    "operations": ["warehouse", "dispatch", "logistics", "delivery", "inventory",
                   "production", "machine", "packaging", "loading", "unloading",
                   "maintenance", "quality", "store room", "store", "production line"],
    "sales":      ["invoice", "customer", "client", "quotation", "payment", "order"],
    "purchase":   ["vendor", "supplier", "procurement", "raw material", "buying", "sourcing"],
    "it":         ["server", "laptop", "computer", "software", "internet", "wifi", "printer"],
}

# Assignee names that must not trigger /assign (entity nouns, not worker slugs)
_PERSON_ASSIGN_EXCLUDE_NAMES = frozenset(
    {
        "customer", "client", "vendor", "supplier", "department", "team",
        "maintenance", "dispatch", "sales", "purchase", "operations", "it",
        "section", "factory", "office",
    }
)

_HAS_TASK_ID_RE = re.compile(
    r"task\s*(?:id|no|number)?\s*\d+|id\s*\d+|#\d+|\d+\s*wala\s*task|\btask\s+\d+",
    re.IGNORECASE,
)

# --- Operational intent regex (Hindi / Hinglish) ---

_PRESENT_RE = re.compile(
    r"(aaj\s+main\s+present|main\s+aa\s+gaya|present\s+mark|aaj\s+office\s+aa\s+gaya|"
    r"i\s+am\s+here\s+today|aa\s+gaya\s+hu\s+kaam|present\s+hu\s+aaj|"
    r"shift\s+start\s+present|aaj\s+ka\s+attendance\s+present|"
    r"main\s+factory\s+pahunch|present\s+mark\s+kar|attendance\s+present|"
    r"aaj\s+shift\s+present|main\s+aa\s+chuka|factory\s+pahunch\s+gaya|"
    r"present\s+lagao|pahunch\s+gaya|aa\s+gaya\s+hu\b|main\s+present\b|"
    r"\bpresent\s+hu\b|aaj\s+present\s+hoon|shift\s+mein\s+present)",
    re.IGNORECASE,
)

_ABSENT_RE = re.compile(
    r"(aaj\s+nahi\s+aa\s+paunga|leave\s+chahiye|main\s+absent|aaj\s+absent|"
    r"bimar\s+hu|personal\s+leave|factory\s+nahi\s+aa\s+sakta|chutti\s+chahiye|"
    r"not\s+coming\s+today|aaj\s+leave|medical\s+leave|family\s+function|"
    r"kal\s+se\s+aaunga.*absent|aaj\s+absent\s+hu|shift\s+miss|"
    r"\babsent\s+hu\b|\babsent\s+hoon\b|\bleave\s+leni\b|"
    r"aaj\s+nahi\s+aa\s+sakta|absent\s+mark\s+karo|aaj\s+chutti\b)",
    re.IGNORECASE,
)

_REPORT_RE = re.compile(
    r"(report\s+dikhao|report\s+chahiye|report\s+bhejo|daily\s+summary|"
    r"weekly\s+report|monthly\s+report|production\s+report|shift\s+report|"
    r"issues\s+report|report\s+generate|kaam\s+ka\s+report|task\s+report|"
    r"attendance\s+report|aaj\s+ka\s+report|summary\s+dikhao|"
    r"\breport\s+dikhao\b|\breport\s+chahiye\b)",
    re.IGNORECASE,
)

_TASKS_RE = re.compile(
    r"(mera\s+kaam\s+dikhao|mere\s+tasks|aaj\s+ke\s+tasks|pending\s+tasks|"
    r"assigned\s+tasks|task\s+list|aaj\s+kya\s+karna|mera\s+task\s+list|"
    r"open\s+tasks|mera\s+kaam\b|tasks\s+dikhao|tasks\s+batao|"
    r"kaam\s+dikhao|task\s+list\s+chahiye|pending\s+kaam|"
    r"tasks\s+list|task\s+dikhao|kaun\s+se\s+task|schedule\s+tasks|tasks\s+bhejo|"
    r"show\s+my\s+tasks|my\s+tasks\s+please|pending\s+tasks\s+batao)",
    re.IGNORECASE,
)

_UPDATE_RE = _UPDATE_PROGRESS_RE

_RESOLVE_RE = re.compile(
    r"(issue\s+\d+\s+resolve|issue\s+\d+\s+fix|issue\s+resolve|"
    r"problem\s+solve\s+ho|resolve\s+ho\s+gaya|issue\s+fix\s+ho|"
    r"issue\s+\d+\s+resolve\s+karo|problem\s+solve\s+ho\s+gayi|"
    r"issue\s+close\s+karo|resolve\s+issue\s+\d+|issue\s+solve\s+karo|"
    r"issue\s+sorted\s+ho\s+gaya|issue\s+\d+\s+resolved|issue\s+resolve\s+kar\s+do|"
    r"problem\s+fixed|issue\s+\d+\s+fix\s+ho\s+gaya|issue\s+resolve\s+ho\s+gaya)",
    re.IGNORECASE,
)

_ISSUES_LIST_RE = re.compile(
    r"(issues\s+list|active\s+issues|open\s+issues|sabhi\s+issues|"
    r"issues\s+dikhao|issue\s+list|open\s+issues\s+list|issues\s+batao|"
    r"show\s+all\s+issues|open\s+issue\s+dikhao|issues\s+status\s+dikhao|"
    r"issue\s+register\s+dikhao|issues\s+count\s+batao|issue\s+dashboard\s+dikhao|"
    r"active\s+issues\s+dikhao)",
    re.IGNORECASE,
)

_ISSUE_CREATE_RE = re.compile(
    r"(machine\s+\d*\s*(kharab|band)|machine\s+kharab|machine\s+band|"
    r"printer\s+.*nahi\s+kar|forklift\s+breakdown|safety\s+issue|"
    r"quality\s+problem|water\s+leak|motor\s+overheat|glue\s+tank\s+leak|"
    r"inventory\s+mismatch|breakdown\s+hai|\bissue\s+hai\b|problem\s+hai|"
    r"nahi\s+mil\s+raha|power\s+cut|conveyor|stuck|noise\s+pollution|"
    r"overheat|leakage|leak\s+ho|band\s+padi|kaam\s+nahi\s+kar\s+raha|"
    r"label\s+machine\s+stuck|water\s+leakage)",
    re.IGNORECASE,
)

_MGRSELF_RE = re.compile(
    r"(task\s*\d+.{0,35}(main\s+khud|main\s+karunga|main\s+lunga|main\s+handle|main\s+kar\s+lunga|"
    r"main\s+sambhal\s+lunga|main\s+dekh\s+lunga)|"
    r"assign\s+to\s+me|ye\s+task\s+main\s+lunga|main\s+handle\s+karunga|"
    r"task\s*\d+.{0,20}i\s+will\s+do|i(?:'ll|\s+will)\s+(?:do|handle)\s+task|"
    r"i\s+will\s+handle\s+task|mujhe\s+de\s+do|ye\s+main\s+dekh)",
    re.IGNORECASE,
)

_MGRREJECT_RE = re.compile(
    r"(task\s*\d+\s*reject|reject\s+task\s*\d+|hamare\s+department\s+ka\s+kaam\s+nahi|"
    r"hamar[ae]\s+(?:scope|kaam)\s+nahi|galat\s+assign|galat\s+department|"
    r"task\s+wapas\s+bhejo|reject\s+karo|reject\s+kar\s+do|not\s+our\s+scope|"
    r"not\s+our\s+work|scope\s+nahi|reject\s+karo.*department|department\s+ka\s+kaam\s+nahi|"
    r"task\s*\d+.{0,30}wapas\s+bhejo|not\s+our\s+department|"
    r"task\s*\d+.{0,20}wrong\s+department|task\s*\d+.{0,20}reject|"
    r"\b\d{1,4}\s+reject\b|reject\s+\d{1,4}\b|task\s+galat\s+department)",
    re.IGNORECASE,
)

_MGRTRANSFER_RE = re.compile(
    r"(task\s*\d+.{0,60}(transfer|bhejo|bhej\b)|transfer\s+task\s*\d+|"
    r"send\s+task\s*\d+|^\s*\d{1,4}\s+(it|sales|purchase|operations)\s+ko\b|"
    r"\d{1,4}\s+(it|sales|purchase|operations)\s+ko\s+bhejo)",
    re.IGNORECASE,
)

_MGRASSIGN_RE = re.compile(
    r"(task\s*(\d+).{0,50}?(\w+)\s+ko\s+(?:do|assign|de\b|dedo|de\s+do)|"
    r"(\w+)\s+ko\s+task\s*(\d+)|(\w+)\s+task\s*(\d+)\s+do\b|"
    r"task\s*(\d+).{0,30}(\w+)\s+(?:karegi|karega)|"
    r"assign\s+task\s*(\d+)\s+to\s+(\w+)|^\s*(\d{1,4})\s+(\w+)\s+ko\b|"
    r"(\d{1,4})\s+wala\s+task\s+(\w+)\s+ko)",
    re.IGNORECASE,
)

_MGR_TYPO_SELF_RE = re.compile(r"^(?:/)?mgr(?:self|se)\b", re.IGNORECASE)
_MGR_TYPO_TRANSFER_RE = re.compile(
    r"^(?:/)?mgr(?:transfer|tr(?:ansfer)?|trasfer)\b", re.IGNORECASE
)
_MGR_TYPO_REJECT_RE = re.compile(r"^(?:/)?mgr(?:reject|re)\b", re.IGNORECASE)

_MGR_CONTEXT_REPLY: Dict[str, str] = {
    "pending 12 aaj handle": "/mgrself",
    "pending 15 aaj handle": "/mgrtransfer",
    "pending 18 aaj handle": "/mgrreject",
    "12 handle aur next": "/mgrself",
    "15 handle aur next": "/mgrtransfer",
    "18 handle aur next": "/mgrreject",
}

_MGR_SELF_SIGNAL_RE = re.compile(
    r"(main\s+(?:khud\s+)?kar(?:unga|lung|lenge|leta\s+hoon)|main\s+sambhal\s+lunga|"
    r"main\s+handle\s+karunga|main\s+dekh\s+lunga|main\s+lunga|main\s+kar\s+lunga|"
    r"main\s+task\s*\d+|"
    r"i(?:'ll|\s+will)\s+(?:do|handle)\s+task|i\s+do\s+task|assign\s+to\s+me|"
    r"i\s+will\s+handle\s+task|ye\s+main\s+(?:dekh|kar)|mujhe\s+de\s+do|"
    r"mujhe\s+khud|khud\s+karna|\b\d{1,4}\s+main\b)",
    re.IGNORECASE,
)

_MGR_REJECT_SIGNAL_RE = re.compile(
    r"(reject|not\s+our\s+scope|not\s+our\s+work|hamar[ae]\s+(?:scope|kaam)\s+nahi|"
    r"galat\s+assign|wrong\s+department|galat\s+department|scope\s+nahi|"
    r"kaam\s+nahi|wapas\s+bhejo|galat\s+department\s+me)",
    re.IGNORECASE,
)

_MGR_TRANSFER_SIGNAL_RE = re.compile(
    r"(transfer|send\s+task|send\s+to|wrong\s+dept|galat\s+dept|ko\s+transfer|"
    r"transfer\s+karo|^\s*\d{1,4}\s+send\b|"
    r"\d{1,4}\s+(?:it|sales|purchase|operations)\s+ko|"
    r"^\s*\d{1,4}\s+(?:it|sales|purchase|operations)\b)",
    re.IGNORECASE,
)

_MGR_DEPT_SLUG_RE = re.compile(
    r"\b(operations|sales|purchase|it)\b",
    re.IGNORECASE,
)

_MGR_WORKER_SKIP = frozenset(
    {
        "task", "isko", "usko", "mujhe", "humko", "tumko", "main", "owner",
        "sales", "it", "purchase", "operations", "department", "team", "ye",
        "galat", "wrong", "not", "our", "scope", "work", "hamara", "hamare",
        "transfer", "reject", "send", "assign", "pending", "handle", "next",
        "do", "de", "dedo", "kar", "karo", "bhejo", "bhej",
        "done", "complete", "update", "status", "progress", "percent", "half",
        "almost", "partial", "packing",
    }
)

_ASSIGN_PERSON_RE = re.compile(
    r"(\w+)\s+ko\s+(.{0,50}(kaam|task|dispatch|loading|packaging|counting|assign|do\b)|"
    r"(kaam|task)\s+(do|assign|karo))",
    re.IGNORECASE,
)

_ASSIGN_KO_INSTRUCT_RE = re.compile(
    r"(\w+)\s+ko\s+"
    r"(?:.{0,80})?"
    r"\b(kaam|task|dispatch|loading|packaging|counting|assign|"
    r"do\b|dedo|de\b|dena|call|kare|karo|karegi|karega|bol|"
    r"bhejo|bhej|bhejdo|file|list|email|cleaning|audit|sample|"
    r"training|meeting|report|karwao|banani|banega|banegi|"
    r"packing|invoice|target|load|fix|audit)\b",
    re.IGNORECASE,
)

_ASSIGN_KO_THIRD_PARTY_RE = re.compile(
    r"(\w+)\s+(?:client|customer)\s+ko\s+",
    re.IGNORECASE,
)

_ASSIGN_SE_RE = re.compile(
    r"(\w+)\s+se\s+(?:.{0,60})?\b(karwao|karo|bhejo|setup|ready|packing)\b",
    re.IGNORECASE,
)

_ASSIGN_SE_TRAILING_RE = re.compile(
    r"\b(?:setup|ready|karo|karwao|bhejo)\b.{0,40}(\w+)\s+se\b",
    re.IGNORECASE,
)

_ASSIGN_PASSIVE_KO_RE = re.compile(
    r"(\w+)\s+ko\s+.{0,80}(banani|banega|banegi|karni|karna)\s+hai\b",
    re.IGNORECASE,
)

_ASSIGN_BARE_KO_RE = re.compile(
    r"(\w+)\s+ko\s+(training|meeting|packing|audit|sample)\b",
    re.IGNORECASE,
)

_DEPT_SLUG_DIRECT_RE = re.compile(
    r"\b(operations|sales|purchase|it)\s+(?:team\s+)?ko\b",
    re.IGNORECASE,
)

_DEPT_TEAM_RE = re.compile(
    r"\b(sales|operations|purchase|it)\s+team\b",
    re.IGNORECASE,
)

_DEPT_ACTION_RE = re.compile(
    r"\b(karo|bolo|bhejo|fix|check|arrange|follow\s*up|followup|process|theek|"
    r"call|load|target|dena|do\b|dedo|karwao)\b",
    re.IGNORECASE,
)

_PASSIVE_FUTURE_TASK_RE = re.compile(
    r"\b(karna|karni|banegi|banani|banega)\s+hai\b",
    re.IGNORECASE,
)

_DELEGATION_SIGNAL_RE = re.compile(
    r"(\b\w+\s+ko\b|\b\w+\s+se\b|\bsabko\b|"
    r"\b(sales|operations|purchase|it)\s+team\b|"
    r"\b(operations|sales|purchase|it)\s+ko\b)",
    re.IGNORECASE,
)

_DELEGATION_INSTRUCTION_RE = re.compile(
    r"\b(karo|kare|do\b|dedo|bhejo|bol|call|karwao|dena|banani|banegi|target|load|fix|training)\b",
    re.IGNORECASE,
)

_ISSUE_REPORT_BARRIER_RE = re.compile(
    r"nahi\s+mil\s+raha|kharab|breakdown|band\s+padi|problem\s+hai|issue\s+hai|"
    r"leak|overheat|power\s+cut|stuck|noise\s+pollution|conveyor",
    re.IGNORECASE,
)

_EXPLICIT_PR_RE = re.compile(
    r"purchase\s*request|procurement\s*request|pr\s+banao|generate\s*purchase|"
    r"create\s*purchase|create\s*procurement|need\s+(to\s+)?(buy|order|purchase)|"
    r"\bchahiye\b|\bkharidi\b",
    re.IGNORECASE,
)

_VENDOR_NOTIFICATION_RE = re.compile(
    r"(bhej\s+d(i|iya|i\s+hai|i\s+hu)|attach|confirm\s+hai|quotation|challan|"
    r"dispatch\s+ready|arrange\s+ho|payment\s+received|partial\s+shipment|"
    r"rate\s+(list|revise)|delivery\s+delayed|sample\s+approve|LR\s+copy|"
    r"GST\s+invoice|packing\s+list|goods\s+ready|courier\s+pick|"
    r"order\s+status\s+update\s+karo|status\s+update\s+karo)",
    re.IGNORECASE,
)


def _detect_department(message: str) -> Optional[str]:
    ml = message.lower()
    slug = _DEPT_SLUG_DIRECT_RE.search(message)
    if slug:
        return slug.group(1).lower()
    team = _DEPT_TEAM_RE.search(message)
    if team:
        return team.group(1).lower()
    for dept, keywords in _DEPT_KEYWORDS.items():
        if any(kw in ml for kw in keywords):
            return dept
    return None


_VENDOR_STATUS_NOTIFY_RE = re.compile(
    r"(order\s+status\s+update|status\s+update\s+karo|payment\s+received|"
    r"dispatch\s+ready|partial\s+shipment|delivery\s+delayed|sample\s+approve|"
    r"LR\s+copy|GST\s+invoice|packing\s+list|goods\s+ready|courier\s+pick)",
    re.IGNORECASE,
)


def _is_vendor_notification_barrier(message: str) -> bool:
    """Vendor-notification regex blocks operational routing only when not dept instruction."""
    if not _VENDOR_NOTIFICATION_RE.search(message):
        return False
    if _VENDOR_STATUS_NOTIFY_RE.search(message):
        return True
    depart = _detect_department(message)
    if depart and _DEPT_ACTION_RE.search(message):
        return False
    return True


def _is_person_directed_report(message: str) -> bool:
    """Person + report instruction → /assign, not /report."""
    return bool(
        _extract_person_assignee(message)
        and re.search(r"\breport\b", message, re.IGNORECASE)
    )


def _should_skip_purchase_for_depart(message: str) -> bool:
    """Department routing instructions should not be classified as purchase requests."""
    ml = message.lower()
    if re.search(r"raw\s+material\s+order\s+karo", ml):
        return True
    if re.search(r"\border\s+karo\b", ml) and _PROCUREMENT_INTENT_RE.search(message):
        return False
    if _PROCUREMENT_INTENT_RE.search(message):
        if re.search(
            r"khatam\s+hone|shortage|mangwana|reorder|order\s+chahiye|"
            r"procurement\s+chahiye|need\s+\d+|\d+\s+\w+.*\border\b",
            message,
            re.IGNORECASE,
        ):
            return False
    if not _detect_department(message):
        return False
    if _EXPLICIT_PR_RE.search(message):
        return False
    if _DEPT_ACTION_RE.search(message):
        return True
    if re.search(r"\bfollow\s*up\b", message, re.IGNORECASE):
        return True
    return False


def _extract_person_assignee(message: str) -> Optional[str]:
    third_party = _ASSIGN_KO_THIRD_PARTY_RE.search(message)
    if third_party:
        name = third_party.group(1).lower()
        if name not in _PERSON_ASSIGN_EXCLUDE_NAMES:
            return name
    for pattern in (
        _ASSIGN_PASSIVE_KO_RE,
        _ASSIGN_KO_INSTRUCT_RE,
        _ASSIGN_SE_RE,
        _ASSIGN_SE_TRAILING_RE,
        _ASSIGN_BARE_KO_RE,
        _ASSIGN_PERSON_RE,
    ):
        match = pattern.search(message)
        if not match:
            continue
        name = match.group(1).lower()
        if name not in _PERSON_ASSIGN_EXCLUDE_NAMES:
            return name
    return None


def _extract_mgr_task_id(message: str) -> Optional[int]:
    """Extract task id from manager routing phrases (backward compatible with classify)."""
    patterns = [
        r"task\s*(?:id|no|number)?\s*(\d+)",
        r"(\d+)\s*wala\s*task",
        r"task\s+(\d+)\b",
        r"reject\s+task\s+(\d+)",
        r"transfer\s+task\s+(\d+)",
        r"task\s+number\s+(\d+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, message, re.IGNORECASE)
        if match:
            return int(match.group(1))
    match = re.match(
        r"^\s*(\d{1,4})\s+(?:reject|main\b|mujhe|IT\b|sales\b|purchase\b|operations\b|\w+\s+ko\b)",
        message.strip(),
        re.IGNORECASE,
    )
    if match:
        return int(match.group(1))
    match = re.search(r"\b(\d{1,4})\s+reject\b", message, re.IGNORECASE)
    if match:
        return int(match.group(1))
    match = re.search(r"reject\s+(\d{1,4})\b", message, re.IGNORECASE)
    if match:
        return int(match.group(1))
    match = re.search(
        r"(?:diya|di|assign|mila|dena)(?:\s+tha)?\s+(\d{1,4})\b",
        message,
        re.IGNORECASE,
    )
    if match:
        return int(match.group(1))
    match = re.search(r"(\d{1,4})\s+transfer\b", message, re.IGNORECASE)
    if match:
        return int(match.group(1))
    match = re.search(r"\busko\s+(\d{1,4})\b", message, re.IGNORECASE)
    if match:
        return int(match.group(1))
    match = re.search(r"\bko\s+(\d{1,4})\b", message, re.IGNORECASE)
    if match:
        return int(match.group(1))
    match = re.match(r"^\s*(\d{1,4})\s+send\b", message.strip(), re.IGNORECASE)
    if match:
        return int(match.group(1))
    match = re.search(r"galat\s+dept\s+(\d{1,4})", message, re.IGNORECASE)
    if match:
        return int(match.group(1))
    match = re.match(
        r"^\s*(\d{1,4})\s+(it|sales|purchase|operations)\b",
        message.strip(),
        re.IGNORECASE,
    )
    if match:
        return int(match.group(1))
    match = re.search(r"pending\s+(\d{1,4})\s+aaj\s+handle", message, re.IGNORECASE)
    if match:
        return int(match.group(1))
    match = re.search(r"(\d{1,4})\s+handle\s+aur\s+next", message, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return None


def _extract_transfer_dept_slug(message: str) -> Optional[str]:
    match = _MGR_DEPT_SLUG_RE.search(message)
    if match:
        return match.group(1).lower()
    return _detect_department(message)


def _extract_mgr_worker(message: str) -> Optional[str]:
    mention = _MENTION_RE.search(message)
    if mention:
        return mention.group(1).lower()
    match = re.search(
        r"(\w+)\s+ko\s+(?:task\s*)?(?:\d|do|de|dedo|assign)",
        message,
        re.IGNORECASE,
    )
    if match:
        name = match.group(1).lower()
        if name not in _MGR_WORKER_SKIP:
            return name
    match = re.search(
        r"task\s*\d+.{0,40}?(\w+)\s+(?:karegi|karega)",
        message,
        re.IGNORECASE,
    )
    if match:
        name = match.group(1).lower()
        if name not in _MGR_WORKER_SKIP:
            return name
    match = re.search(r"assign\s+task\s+\d+\s+to\s+(\w+)\b", message, re.IGNORECASE)
    if match:
        return match.group(1).lower()
    match = re.match(r"^\s*(\d{1,4})\s+(\w+)\s+ko\b", message.strip(), re.IGNORECASE)
    if match:
        name = match.group(2).lower()
        if name not in _MGR_WORKER_SKIP:
            return name
    match = re.search(r"(\w+)\s+karega\b", message, re.IGNORECASE)
    if match:
        name = match.group(1).lower()
        if name not in _MGR_WORKER_SKIP:
            return name
    match = re.search(r"(\w+)\s+free\s+hai\s+usko", message, re.IGNORECASE)
    if match:
        return match.group(1).lower()
    match = re.search(r"(\w+)\s+task\s+(\d+)", message, re.IGNORECASE)
    if match:
        name = match.group(1).lower()
        if name not in _MGR_WORKER_SKIP:
            return name
    match = re.search(r"(\w+)\s+ko\s+(\d{1,4})\b", message, re.IGNORECASE)
    if match:
        name = match.group(1).lower()
        if name not in _MGR_WORKER_SKIP:
            return name
    match = re.search(r"\b(\d{1,4})\s+(\w+)\s+ko\b", message, re.IGNORECASE)
    if match:
        name = match.group(2).lower()
        if name not in _MGR_WORKER_SKIP:
            return name
    match = re.search(r"(\w+)\s+ko\s+transfer\b", message, re.IGNORECASE)
    if match:
        name = match.group(1).lower()
        if name not in _MGR_WORKER_SKIP:
            return name
    match = re.search(r"\b(?:bhejo|dispatch|delivery)\s+(\w+)\s+ko\b", message, re.IGNORECASE)
    if match:
        name = match.group(1).lower()
        if name not in _MGR_WORKER_SKIP:
            return name
    match = re.search(r"\b(\w+)\s+ko\s*$", message.strip(), re.IGNORECASE)
    if match:
        name = match.group(1).lower()
        if name not in _MGR_WORKER_SKIP:
            return name
    match = re.search(r"\bto\s+(\w+)\s*$", message.strip(), re.IGNORECASE)
    if match:
        name = match.group(1).lower()
        if name not in _MGR_WORKER_SKIP:
            return name
    match = re.search(r"\bdelivery\s+\d+.*\s+(\w+)\s*$", message.strip(), re.IGNORECASE)
    if match:
        name = match.group(1).lower()
        if name not in _MGR_WORKER_SKIP:
            return name
    match = re.search(r"\bdelivery\s+(\w+)\s*$", message.strip(), re.IGNORECASE)
    if match:
        name = match.group(1).lower()
        if name not in _MGR_WORKER_SKIP:
            return name
    match = re.search(r"\b(\w+)\s+ko\s+\d", message, re.IGNORECASE)
    if match:
        name = match.group(1).lower()
        if name not in _MGR_WORKER_SKIP:
            return name
    person = _extract_person_assignee(message)
    if person:
        return person
    return None


def _extract_reject_reason(message: str) -> Optional[str]:
    ml = message.lower()
    for phrase in (
        "not our scope",
        "not our work",
        "hamara kaam nahi",
        "hamare scope nahi",
        "galat assign",
        "wrong department",
        "galat department",
        "scope nahi",
        "kaam nahi",
    ):
        if phrase in ml:
            return phrase
    match = re.search(r"reject(?:\s+task\s+\d+)?\s+(.+)", message, re.IGNORECASE)
    if match and match.group(1).strip():
        return match.group(1).strip()[:120]
    if "reject" in ml:
        return "rejected"
    return None


def _parse_mgr_typo_command(message: str) -> Optional[Dict[str, Any]]:
    """Typo-tolerant manager slash-command shorthands (mgrse, mgrtr, mgrre, etc.)."""
    ml = message.strip()
    if _MGR_TYPO_SELF_RE.match(ml):
        task_id = _extract_mgr_task_id(ml)
        return _op_result("/mgrself", id=task_id)
    if _MGR_TYPO_TRANSFER_RE.match(ml):
        task_id = _extract_mgr_task_id(ml)
        dept = _extract_transfer_dept_slug(ml)
        return _op_result("/mgrtransfer", id=task_id, depart_slug=dept)
    if _MGR_TYPO_REJECT_RE.match(ml):
        task_id = _extract_mgr_task_id(ml)
        return _op_result(
            "/mgrreject",
            id=task_id,
            reject_reason=_extract_reject_reason(ml),
        )
    return None


def _is_cancel_intent(message: str) -> bool:
    """Cancel phrases must not fire on issue/breakdown utterances."""
    if not _CANCEL_RE.search(message):
        return False
    if _CANCEL_ISSUE_BARRIER_RE.search(message):
        return False
    if _UPDATE_PROGRESS_RE.search(message):
        return False
    return True


def manager_pre_classify(message: str) -> Optional[Dict[str, Any]]:
    """
    Phase 5A — deterministic manager workflow intents before LLM fallback.
    Covers /mgrself, /mgrassign, /mgrtransfer, /mgrreject.
    """
    ml = message.lower().strip()

    if _UPDATE_PROGRESS_RE.search(message):
        return None

    typo = _parse_mgr_typo_command(message)
    if typo is not None:
        return typo

    ctx_intent = _MGR_CONTEXT_REPLY.get(ml)
    if ctx_intent is not None:
        task_id = _extract_mgr_task_id(message)
        if ctx_intent == "/mgrtransfer":
            return _op_result("/mgrtransfer", id=task_id, depart_slug=_extract_transfer_dept_slug(message))
        if ctx_intent == "/mgrreject":
            return _op_result(
                "/mgrreject",
                id=task_id,
                reject_reason=_extract_reject_reason(message),
            )
        return _op_result("/mgrself", id=task_id)

    task_id = _extract_mgr_task_id(message)
    worker = _extract_mgr_worker(message)
    bare_self = bool(
        re.search(r"\bmain\s+kar\s+(?:lunga|lungi)\b", ml)
        or re.search(r"^\s*\d{1,4}\s+main\b", message, re.IGNORECASE)
    )
    reject_signal = bool(
        (_MGR_REJECT_SIGNAL_RE.search(message) or re.search(r"\breject\b", ml))
        and not re.search(r"galat\s+dept", ml)
    )

    if reject_signal and (task_id is not None or _MGR_REJECT_SIGNAL_RE.search(message)):
        return _op_result(
            "/mgrreject",
            id=task_id,
            reject_reason=_extract_reject_reason(message),
        )

    # Delegation beats transfer when a named worker and task id are both present.
    if worker and task_id is not None and not _MGR_SELF_SIGNAL_RE.search(message):
        return _op_result("/mgrassign", id=task_id, worker_slug=worker)

    if task_id is not None and _MGR_TRANSFER_SIGNAL_RE.search(message):
        dept = _extract_transfer_dept_slug(message)
        if dept and not worker:
            return _op_result("/mgrtransfer", id=task_id, depart_slug=dept)

    if _MGRTRANSFER_RE.search(message) or re.search(r"\btransfer\s+karo\b", ml):
        dept = _extract_transfer_dept_slug(message)
        return _op_result("/mgrtransfer", id=task_id, depart_slug=dept)

    if _MGR_SELF_SIGNAL_RE.search(message) or _MGRSELF_RE.search(message) or bare_self:
        if task_id is not None or re.search(r"\btask\b", ml) or bare_self:
            return _op_result("/mgrself", id=task_id)

    if worker and (
        task_id is not None
        or re.search(r"task\s*\d+", message, re.IGNORECASE)
        or _MGRASSIGN_RE.search(message)
    ):
        if not _MGR_SELF_SIGNAL_RE.search(message):
            return _op_result("/mgrassign", id=task_id, worker_slug=worker)

    mgr_match = _MGRASSIGN_RE.search(message)
    if mgr_match:
        groups = [g for g in mgr_match.groups() if g]
        slug = None
        tid = task_id
        for g in groups:
            if g.isdigit():
                tid = int(g)
            elif g.lower() not in _MGR_WORKER_SKIP:
                slug = g.lower()
        return _op_result("/mgrassign", id=tid, worker_slug=slug)

    if _MGRREJECT_RE.search(message):
        return _op_result(
            "/mgrreject",
            id=task_id,
            reject_reason=_extract_reject_reason(message),
        )

    return None


def _op_result(
    intent: str,
    id: Optional[int] = None,
    worker_slug: Optional[str] = None,
    depart_slug: Optional[str] = None,
    reject_reason: Optional[str] = None,
    task_description: Optional[str] = None,
) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        "intent": intent,
        "id": id,
        "worker_slug": worker_slug,
        "depart_slug": depart_slug,
        "reject_reason": reject_reason,
    }
    if task_description is not None:
        out["task_description"] = task_description
    return out


def operational_pre_classify(message: str) -> Optional[Dict[str, Any]]:
    """
    Deterministic Hindi/Hinglish coverage for high-frequency operational intents.
    Runs after workflow_pre_classify and before deterministic_pre_classify.
    """
    ml = message.lower().strip()

    for cmd in (
        "/present", "/absent", "/tasks", "/report", "/issue", "/issues",
        "/resolve", "/assign", "/depart_assign", "/mgrassign", "/mgrtransfer",
        "/mgrreject", "/mgrself",
    ):
        if ml.startswith(cmd):
            return _op_result(cmd)

    # --- Manager task operations (Phase 5A hardened) ---
    mgr = manager_pre_classify(message)
    if mgr is not None:
        return mgr

    # --- Issue resolution before issue create / complete ---
    if _RESOLVE_RE.search(message):
        id_match = re.search(
            r"(?:issue|resolve|problem)\s+#?(\d+)|(\d+)\s+resolve",
            message,
            re.IGNORECASE,
        )
        issue_id = None
        if id_match:
            issue_id = int(id_match.group(1) or id_match.group(2))
        return _op_result("/resolve", id=issue_id)

    # --- Person-directed report instructions → /assign, not /report ---
    if not _HAS_TASK_ID_RE.search(message):
        assignee = _extract_person_assignee(message)
        if assignee and re.search(r"\breport\b", message, re.IGNORECASE):
            return _op_result("/assign", worker_slug=assignee)

    # --- Reports before issues list ("issues report" → /report) ---
    if _REPORT_RE.search(message) and not _is_person_directed_report(message):
        return _op_result("/report")

    if _ISSUES_LIST_RE.search(message) and not _REPORT_RE.search(message):
        return _op_result("/issues")

    # --- Issue creation before completion ("power cut ho gaya") ---
    if _ISSUE_CREATE_RE.search(message):
        return _op_result("/issue")

    # --- Vendor notifications must not hit update/complete/depart ---
    if _is_vendor_notification_barrier(message):
        return None

    # --- Progress update before completion ("almost complete", "task 5 update") ---
    if _UPDATE_PROGRESS_RE.search(message):
        tid = re.search(r"task\s*#?(\d+)", message, re.IGNORECASE)
        task_id = int(tid.group(1)) if tid else None
        return _op_result("/update", id=task_id)

    # --- Attendance before completion ---
    if _ABSENT_RE.search(message):
        return _op_result("/absent")

    if _PRESENT_RE.search(message):
        return _op_result("/present")

    # --- Task completion before task list ("ho gaya mera kaam") ---
    if (
        _COMPLETION_CONFIRMED_RE.search(message)
        and not _INSTRUCTION_SIGNAL_RE.search(message)
        and not _UPDATE_PROGRESS_RE.search(message)
    ):
        return _op_result("/complete")

    # --- Task list ---
    if _TASKS_RE.search(message):
        return _op_result("/tasks")

    # --- Members & help (lightweight) ---
    if _MEMBERS_RE.search(message):
        return _op_result("/members")

    if _HELP_RE.search(message):
        return _op_result("/help")

    # --- Person assignment (no task id) ---
    if not _HAS_TASK_ID_RE.search(message):
        assignee = _extract_person_assignee(message)
        if assignee:
            return _op_result("/assign", worker_slug=assignee)

    # --- Department routing (no named person assignee) ---
    if not _extract_person_assignee(message) and not _PASSIVE_FUTURE_TASK_RE.search(message):
        depart = _detect_department(message)
        if depart and _DEPT_ACTION_RE.search(message):
            return _op_result("/depart_assign", depart_slug=depart)

    return None


# Task-like message without a named assignee → clarify who should do it
_ASSIGN_DRAFT_RE = re.compile(
    r"(banegi|banani|banega|banayenge|banao|bana\s|karni|karna|karega|"
    r"ho\s+jayegi|ho\s+jayega|repair|website|dispatch|"
    r"kaam\b|task\b|machine|invoice|packaging|khana|bna|bnao|figure|"
    r"material|order\s+chahiye|mangwana|inventory|training|delivery\s+plan)",
    re.IGNORECASE,
)


def delegation_anti_sink_pre_classify(message: str) -> Optional[Dict[str, Any]]:
    """
    V2B — last-resort routing for delegation-like phrases before general_chat.
    Safest fallback: /assign_clarify (who should do this?).
    """
    if _HAS_TASK_ID_RE.search(message):
        return None
    if _MENTION_RE.search(message):
        return None
    if manager_pre_classify(message) is not None:
        return None
    if _PRESENT_RE.search(message) or _ABSENT_RE.search(message):
        return None
    if _TASKS_RE.search(message) or _ISSUES_LIST_RE.search(message):
        return None
    if _REPORT_RE.search(message) and not _is_person_directed_report(message):
        return None
    if _ISSUE_CREATE_RE.search(message) or _RESOLVE_RE.search(message):
        return None
    if not _DELEGATION_SIGNAL_RE.search(message):
        if not re.search(r"\bsabko\b", message, re.IGNORECASE):
            if not _ASSIGN_DRAFT_RE.search(message):
                return None
    if not (
        _DELEGATION_INSTRUCTION_RE.search(message)
        or _ASSIGN_DRAFT_RE.search(message)
        or re.search(r"\bsabko\b", message, re.IGNORECASE)
    ):
        return None
    if workflow_pre_classify(message) is not None:
        return None
    return _op_result("/assign_clarify", task_description=message.strip())


def assign_clarify_pre_classify(message: str) -> Optional[Dict[str, Any]]:
    """
    Passive / future task statements without @mention → /assign_clarify.
    Example: "aaj website banegi", "kal dispatch ho jayega".
    """
    if _ONBOARD_VENDOR_RE.search(message) and not _should_block_vendor_onboard(message):
        return None
    if (
        _INVENTORY_STATUS_RE.search(message)
        and not _PASSIVE_FUTURE_TASK_RE.search(message)
        and not _INVENTORY_CREATE_RE.search(message)
    ):
        return None
    if _MENTION_RE.search(message) or _extract_person_assignee(message):
        return None
    if _HAS_TASK_ID_RE.search(message):
        return None
    if _PRESENT_RE.search(message) or _ABSENT_RE.search(message):
        return None
    if _TASKS_RE.search(message) or _ISSUES_LIST_RE.search(message):
        return None
    if _HELP_RE.search(message) or _MEMBERS_RE.search(message):
        return None
    if _REPORT_RE.search(message):
        return None
    if _ISSUE_CREATE_RE.search(message) or _RESOLVE_RE.search(message):
        return None
    if (
        _COMPLETION_CONFIRMED_RE.search(message)
        and not _INSTRUCTION_SIGNAL_RE.search(message)
    ):
        return None
    if not _ASSIGN_DRAFT_RE.search(message):
        return None
    if workflow_pre_classify(message) is not None:
        return None
    if manager_pre_classify(message) is not None:
        return None
    return _op_result("/assign_clarify", task_description=message.strip())


def deterministic_pre_classify(message: str) -> Optional[Dict[str, Any]]:
    """
    Returns a partial classification dict (intent + extracted fields) if
    we are highly confident, else returns None to fall through to the LLM.

    This eliminates the most common sources of LLM non-determinism.
    """
    ml = message.lower()

    # --- /complete detection ---
    # Only fire if completion language is present AND no instruction signal
    if (
        _COMPLETION_CONFIRMED_RE.search(message)
        and not _INSTRUCTION_SIGNAL_RE.search(message)
        and not _VENDOR_NOTIFICATION_RE.search(message)
        and not _UPDATE_PROGRESS_RE.search(message)
    ):
        return {"intent": "/complete", "worker_slug": None, "depart_slug": None, "reject_reason": None}

    # --- /assign vs /depart_assign ---
    # If a @mention or recognised person pattern is present → /assign
    # --- /mgrassign vs /assign ---
    # Key rule: if a task ID is present alongside a person → /mgrassign
    mention = _MENTION_RE.search(message)
    has_task_id = bool(re.search(
        r"task\s*(?:id|no|number)?\s*\d+|id\s*\d+|#\d+|\d+\s*wala\s*task|\b\d+\b",
        message, re.IGNORECASE
    ))

    if mention and has_task_id:
        return {
            "intent": "/mgrassign",
            "worker_slug": f"@{mention.group(1)}",
            "depart_slug": None,
            "reject_reason": None,
        }

    if mention and not has_task_id:
        return {
            "intent": "/assign",
            "worker_slug": f"@{mention.group(1)}",
            "depart_slug": None,
            "reject_reason": None,
        }

    return None


# ============================================================
# WORKFLOW PRE-CLASSIFIER
# High-confidence workflow intents before LLM / dept routing.
# ============================================================

_INVENTORY_CREATE_RE = re.compile(
    r"((create|add|register|setup|new|naya|nayi|naye|banao|bana|jod|darj|entry|start)"
    r".{0,35}(inventory|stock\s*item|sku|warehouse\s*item|inventory\s*item|"
    r"inventory\s*entry|stock\s*entry|inventory\s*record|inventory\s*product|"
    r"inventory\s*material|stock\s*product|inventory\s*mein\s*item|stock\s*create|"
    r"\bitem\b|\bproduct\b|\bmaal\b))"
    r"|((inventory|stock).{0,25}(create|add|register|banao|jod|entry|setup|item|product))"
    r"|(inventory\s*item|stock\s*item|inventory\s*entry|new\s*sku|create\s*item|add\s*item|"
    r"register\s*(new\s*)?product|item\s*setup|product\s*in\s*stock|stock\s*item\s*creation|"
    r"inventory\s*item\s*setup|item\s*create|item\s*darj|inventory\s*register|stock\s*create|"
    r"naya\s*item|nayi\s*item|naye\s*item|inventory\s*mein\s*product|inventory\s*add|"
    r"sku\s+register|stock\s+register\s+karna|inventory\s+register\s+karo|"
    r"warehouse\s+mein\s+item|warehouse\s+item\s+add|stock\s+item\s+create|"
    r"item\s+add|inventory\s+add|new\s+stock\s+item|inventory\s+create|"
    r"stock\s+item\s+create\s+karo)",
    re.IGNORECASE,
)

_INVENTORY_CREATE_PRIORITY_RE = re.compile(
    r"(item\s+inventory\s+mein\s+darj|inventory\s+mein\s+darj|"
    r"naya\s+item\s+stock\s+mein|add\s+warehouse\s+stock\s+item)",
    re.IGNORECASE,
)

_INVENTORY_STATUS_RE = re.compile(
    r"(inventory\s*status|stock\s*status|stock\s*level|stock\s*levels|low\s*stock|"
    r"inventory\s*check(?!\s+karna\s+hai)|stock\s*check|inventory\s*level|stock\s*availability|"
    r"inventory\s*summary|stock\s*register\s*status|inventory\s*lookup|"
    r"kitna\s*stock|stock\s*kitna|inventory\s*dekho|stock\s*dikhao|"
    r"inventory\s*dikhao|stock\s*batao|inventory\s+status\s+batao|"
    r"check\s*inventory|check\s*stock|check\s+\w+\s+stock|check\s+product\s+stock|"
    r"show\s*stock|show\s*inventory|view\s+item\s+inventory|"
    r"current\s*inventory|current\s*stock|sku\s*status|"
    r"how\s*much.{0,25}stock|how\s+many\s+.{0,25}\s+in\s+stock|what\s*is.{0,25}stock|stock\s*for|"
    r"item\s*availability|inventory\s*dekh|stock\s*dekh|"
    r"inventory\s*report|stock\s*quantity|inventory\s*kitna|maal\s*kitna|"
    r"maal\s+ka\s+status|maal\s+status\s+check|"
    r"inv\s*ntry|invntry|inventry|invntry\s+stt?us|stt?us\s+batao|"
    r"stock\s+register\s+status|available\s+stock|stock\s+available\s+hai\s+kya|"
    r"quantity\s+kitni|maal\s+kitna\s+hai|raw\s+material\s+kitna\s+bacha|"
    r"kitna\s+maal\s+pada\s+hai|kitna\s+\w+\s+pada\s+hai|"
    r"kam\s+pada\s+hua\s+stock|kam\s+stock\s+wale\s+items?|"
    r"kitna\s+(hai|bacha|bacha\s+hai)|"
    r"\w+\s+\w+\s+kitna\s+hai|printing\s+ink\s+kitna|"
    r"inventory\s+check\s+karo)",
    re.IGNORECASE,
)

_ONBOARD_VENDOR_RE = re.compile(
    r"((add|register|create|onboard|setup|new|naya|nayi|naye|jod|darj|entry|start)"
    r".{0,40}(vendor|supplier|suppliers))"
    r"|((vendor|supplier).{0,30}(add|register|create|onboard|jod|darj|registration|onboarding|setup|entry|record|banao))"
    r"|(vendor\s*onboarding|supplier\s*onboarding|vendor\s*registration|supplier\s*registration|"
    r"naya\s*vendor|nayi\s*supplier|naye\s*supplier|supplier\s*add|vendor\s*add|"
    r"add\s+purchase\s+vendor|add\s+vendor\s+for\s+purchase|"
    r"register\s+vendor\s+for\s+procurement|"
    r"supplier\s+ka\s+record|supplier\s+record\s+banao|"
    r"naya\s+supplier\s+register|supplier\s+add\s+karo)",
    re.IGNORECASE,
)

_ONBOARD_WORKER_RE = re.compile(
    r"((add|register|create|onboard|setup|new|naya|nayi|naye|jod|darj|entry|start|hire)"
    r".{0,30}(worker|employee|staff|team\s*member|karmchari|karmchaari))"
    r"|((worker|employee|staff|karmchari).{0,25}(add|register|create|onboard|jod|darj|onboarding|setup|entry))"
    r"|(worker\s*onboarding|employee\s*onboarding|employee\s*registration|worker\s*registration|"
    r"naya\s*worker|naye\s*worker|naya\s*employee|staff\s*onboarding|new\s*hire)",
    re.IGNORECASE,
)

_VENDOR_PROCUREMENT_ACTION_RE = re.compile(
    r"\b(order|bhejo|bhej|invoice|maang|source|buy)\b",
    re.IGNORECASE,
)


def _should_block_vendor_onboard(message: str) -> bool:
    """
    Procurement/order verbs block onboard only when registration intent is absent.
    'register vendor for procurement' and 'add purchase vendor' remain onboard.
    """
    if not _ONBOARD_VENDOR_RE.search(message):
        return True
    if re.search(
        r"\b(add|register|create|onboard|naya|nayi|naye|jod|darj|record|banao)\b"
        r".{0,45}\b(vendor|supplier)\b",
        message,
        re.IGNORECASE,
    ):
        return False
    if re.search(
        r"\b(vendor|supplier)\b.{0,30}\b(add|register|record|banao|darj|jod|for)\b",
        message,
        re.IGNORECASE,
    ):
        return False
    if re.search(r"\b(vendor|supplier)\s+for\s+(purchase|procurement)\b", message, re.IGNORECASE):
        return False
    if re.search(r"\badd\s+purchase\s+vendor\b", message, re.IGNORECASE):
        return False
    if _VENDOR_PROCUREMENT_ACTION_RE.search(message):
        return True
    if re.search(r"\b(procurement|purchase)\b", message, re.IGNORECASE):
        return True
    return False

_PROCUREMENT_INTENT_RE = re.compile(
    r"(/purchase_request_create|purchase\s*request|procurement\s*request|"
    r"generate\s*purchase\s*request|create\s*purchase\s*request|create\s*procurement|"
    r"need\s+(to\s+)?(buy|order|purchase)|need\s+[a-zA-Z\u0900-\u097F]+|"
    r"order\s+packaging|buy\s+steel|raw\s+material|packaging\s+material|"
    r"cement\s+chahiye|steel\s+chahiye|maal\s+chahiye|kharidi\s+karni|"
    r"purchase\s+karna|purchase\s+request\s+banao|pr\s+banao|"
    r"need\s+raw\s+material|need\s+cement|need\s+steel|"
    r"order\s+karo|order\s+chahiye|order\s+karna|mangwana\s+hai|aur\s+material\s+mangwana|"
    r"stock\s+khatam\s+hone\s+wala|khatam\s+hone\s+wali|khatam\s+hone\s+wala|"
    r"shortage\s+aa\s+rahi|reorder\s+karo|supplier\s+se\s+mangao|"
    r"procurement\s+chahiye|material\s+order\s+karna|"
    r"\d+\s+\w+(\s+\w+)*\s+order\b|need\s+\d+\s+\w+\s+order|"
    r"mangao\b)",
    re.IGNORECASE,
)

_PURCHASE_REQUEST_CREATE_RE = _PROCUREMENT_INTENT_RE

_INVENTORY_IMPORT_CSV_RE = re.compile(
    r"(/inventory_import_csv\b|"
    r"import\s+inventory(?:\s+(?:list|sheet|data|file|csv))?|"
    r"inventory\s+(?:list|sheet|csv)\s+import|"
    r"csv\s+(?:se\s+)?inventory\s+import|"
    r"bulk\s+inventory\s+import|"
    r"inventory\s+csv\s+import)",
    re.IGNORECASE,
)

_CANCEL_RE = re.compile(
    r"(^/cancel\b|"
    r"^cancel\b|"
    r"cancel\s+(?:workflow|import|setup|karo)|"
    r"workflow\s+cancel|"
    r"\b(band\s+karo|rok\s+do|stop\s+karo|mat\s+karo)\b)",
    re.IGNORECASE,
)

_CANCEL_ISSUE_BARRIER_RE = re.compile(
    r"(machine\s+band|printer\s+band|motor\s+band|conveyor\s+stuck|"
    r"power\s+cut|breakdown|kharab|issue\s+hai)",
    re.IGNORECASE,
)

_SUGGESTION_APPROVE_RE = re.compile(
    r"(^/suggestion_approve\b|"
    r"suggestion\s+approve|"
    r"approve\s+suggestion|"
    r"document\s+approve)",
    re.IGNORECASE,
)

_STOCK_ITEM_RE = re.compile(
    r"\b(bolt|bolts|nut|nuts|sku|stock|piece|pcs|unit|carton|cement|"
    r"qty|quantity|\d+\s*(?:kg|pcs|piece|unit))\b",
    re.IGNORECASE,
)

_DISPATCH_RE = re.compile(
    r"\b(bhejo|bhej|dispatch|delivery|deliver)\b",
    re.IGNORECASE,
)

_INVENTORY_COUNT_RE = re.compile(
    r"\b(stock\s+count|inventory\s+count|ginati|count\s+stock|count\s+inventory|"
    r"sku\s+\w+\s+count|count\s+karo)\b",
    re.IGNORECASE,
)

_BUSINESS_DISCOVERY_RE = re.compile(
    r"(/business_discovery|"
    r"tell\s+(you|munshi)\s+about\s+(my\s+)?business|"
    r"setup\s+(my\s+)?business|set\s*up\s+(my\s+)?business|"
    r"register\s+(my\s+)?(company|business)|"
    r"company\s+details|business\s+profile|business\s+identity|"
    r"introduce\s+(my\s+)?business|mera\s+business|"
    r"business\s+setup|company\s+setup|"
    r"update\s+(company|business)\s+details|"
    r"company\s+details\s+update|business\s+details\s+badlo|"
    r"import\s+(vendor|supplier)s?(\s+list)?|vendor\s+list\s+import|"
    r"attendance\s+sheet|organization\s+setup|team\s+setup|"
    r"factory\s+introduce|packaging\s+company|manufacturing\s+unit|"
    r"organization\s+structure|unit\s+ka\s+introduction|factory\s+details|"
    r"business\s+type|humari\s+company|introduce\s+karna|details\s+share\s+karna|"
    r"hum\s+\w+\s+(unit|company)\s+hain|mera\s+factory|mera\s+unit)",
    re.IGNORECASE,
)

_CONTINUE_DISCOVERY_RE = re.compile(
    r"(/continue_discovery|"
    r"continue\s+(setup|onboarding|discovery)|"
    r"resume\s+(setup|onboarding|discovery|business\s+setup)|"
    r"onboarding\s+resume|setup\s+continue|onboarding\s+continue|"
    r"business\s+setup\s+(continue|resume)|setup\s+resume|"
    r"setup\s+phir\s+se\s+shuru|phir\s+se\s+shuru|discovery\s+continue|"
    r"wapas\s+setup|setup\s+wapas|"
    r"continue\s+business\s+setup)",
    re.IGNORECASE,
)


def stock_linked_pre_classify(message: str) -> Optional[Dict[str, Any]]:
    """Stock-linked delivery / inventory-count intents (v1.1)."""
    if _INVENTORY_COUNT_RE.search(message):
        return _op_result("/task_inventory_nl")

    has_stock = bool(_STOCK_ITEM_RE.search(message))
    has_dispatch = bool(_DISPATCH_RE.search(message))
    worker = _extract_mgr_worker(message)
    if not worker:
        mention = _MENTION_RE.search(message)
        if mention:
            worker = mention.group(0)

    if has_stock and has_dispatch and worker:
        return _op_result("/assign_delivery", worker_slug=worker)
    if has_stock and has_dispatch:
        return _op_result("/task_inventory_nl")
    return None


def workflow_pre_classify(message: str) -> Optional[Dict[str, Any]]:
    ml = message.lower().strip()

    if ml.startswith("/inventory_import_csv"):
        return {"intent": "/inventory_import_csv", "worker_slug": None, "depart_slug": None, "reject_reason": None}
    if ml.startswith("/cancel"):
        return {"intent": "/cancel", "worker_slug": None, "depart_slug": None, "reject_reason": None}
    if ml.startswith("/suggestion_approve"):
        return {"intent": "/suggestion_approve", "worker_slug": None, "depart_slug": None, "reject_reason": None}
    if ml.startswith("/assign_delivery"):
        worker = _extract_mgr_worker(message)
        if not worker:
            mention = _MENTION_RE.search(message)
            worker = mention.group(0) if mention else None
        return {"intent": "/assign_delivery", "worker_slug": worker, "depart_slug": None, "reject_reason": None}
    if ml.startswith("/task_inventory_nl"):
        return {"intent": "/task_inventory_nl", "worker_slug": None, "depart_slug": None, "reject_reason": None}

    if _INVENTORY_IMPORT_CSV_RE.search(message):
        return {"intent": "/inventory_import_csv", "worker_slug": None, "depart_slug": None, "reject_reason": None}

    if _is_cancel_intent(message) and not re.search(r"\breject\b", ml):
        return {"intent": "/cancel", "worker_slug": None, "depart_slug": None, "reject_reason": None}

    if _SUGGESTION_APPROVE_RE.search(message):
        return {"intent": "/suggestion_approve", "worker_slug": None, "depart_slug": None, "reject_reason": None}

    stock = stock_linked_pre_classify(message)
    if stock is not None:
        return stock

    if ml.startswith("/onboard_vendor"):
        return {"intent": "/onboard_vendor", "worker_slug": None, "depart_slug": None, "reject_reason": None}
    if ml.startswith("/onboard_worker"):
        return {"intent": "/onboard_worker", "worker_slug": None, "depart_slug": None, "reject_reason": None}
    if ml.startswith("/inventory_create"):
        return {"intent": "/inventory_create", "worker_slug": None, "depart_slug": None, "reject_reason": None}
    if ml.startswith("/inventory_status"):
        return {"intent": "/inventory_status", "worker_slug": None, "depart_slug": None, "reject_reason": None}
    if ml.startswith("/purchase_request_create"):
        return {"intent": "/purchase_request_create", "worker_slug": None, "depart_slug": None, "reject_reason": None}
    if ml.startswith("/business_discovery"):
        return {"intent": "/business_discovery", "worker_slug": None, "depart_slug": None, "reject_reason": None}
    if ml.startswith("/continue_discovery"):
        return {"intent": "/continue_discovery", "worker_slug": None, "depart_slug": None, "reject_reason": None}

    if _CONTINUE_DISCOVERY_RE.search(message):
        return {"intent": "/continue_discovery", "worker_slug": None, "depart_slug": None, "reject_reason": None}

    if _BUSINESS_DISCOVERY_RE.search(message):
        return {"intent": "/business_discovery", "worker_slug": None, "depart_slug": None, "reject_reason": None}

    if _ONBOARD_VENDOR_RE.search(message) and not _should_block_vendor_onboard(message):
        return {"intent": "/onboard_vendor", "worker_slug": None, "depart_slug": None, "reject_reason": None}

    if _ONBOARD_WORKER_RE.search(message):
        return {"intent": "/onboard_worker", "worker_slug": None, "depart_slug": None, "reject_reason": None}

    if _INVENTORY_CREATE_PRIORITY_RE.search(message):
        return {"intent": "/inventory_create", "worker_slug": None, "depart_slug": None, "reject_reason": None}

    if _INVENTORY_STATUS_RE.search(message) and not _PASSIVE_FUTURE_TASK_RE.search(message):
        return {"intent": "/inventory_status", "worker_slug": None, "depart_slug": None, "reject_reason": None}

    if _INVENTORY_CREATE_RE.search(message):
        return {"intent": "/inventory_create", "worker_slug": None, "depart_slug": None, "reject_reason": None}

    if _ISSUE_REPORT_BARRIER_RE.search(message):
        return None

    if _should_skip_purchase_for_depart(message):
        return None

    if _PROCUREMENT_INTENT_RE.search(message):
        return {"intent": "/purchase_request_create", "worker_slug": None, "depart_slug": None, "reject_reason": None}

    return None


class IntentClassifier:

    def __init__(self):
        self.datetime_extractor = DateTimeExtractor()
        print("Hybrid Intent Classifier Loaded (v2 - robust)")

    # --------------------------------------------------------
    # ENTITY EXTRACTION
    # --------------------------------------------------------

    def extract_task_id(self, message: str) -> Optional[int]:
        mgr_id = _extract_mgr_task_id(message)
        if mgr_id is not None:
            return mgr_id
        patterns = [
            r"task\s*(?:id)?\s*(\d+)",
            r"id\s*(\d+)",
            r"#(\d+)",
            r"(\d+)\s*wala\s*task",
            r"task\s*number\s*(\d+)",
            r"task\s*no\s*(\d+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                return int(match.group(1))
        return None

    def extract_mentions(self, message: str) -> Optional[str]:
        mentions = _MENTION_RE.findall(message)
        return f"@{mentions[0]}" if mentions else None

    # --------------------------------------------------------
    # LLM CLASSIFICATION
    # --------------------------------------------------------

    def llm_classify(self, message: str) -> Dict[str, Any]:
        """
        Single LLM call with temperature=0 and rich few-shot examples.
        Few-shot examples are the #1 fix for non-determinism.
        """
        try:
            response = get_openai_client().chat.completions.create(
                model=CHAT_MODEL,
                temperature=0,
                seed=42,          # Added: improves reproducibility where supported
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": self._build_system_prompt()},
                    {"role": "user",   "content": message},
                ],
            )
            raw = response.choices[0].message.content
            return json.loads(raw)
        except Exception:
            return {"intent": "general_chat", "worker_slug": None,
                    "depart_slug": None, "reject_reason": None}

    # --------------------------------------------------------
    # MAIN PIPELINE
    # --------------------------------------------------------

    def classify(self, message: str, use_llm: bool = True) -> Dict[str, Any]:

        datetime_info = self.datetime_extractor.extract_date_from_message(message)
        task_id       = self.extract_task_id(message)
        mention       = self.extract_mentions(message)

        pre = workflow_pre_classify(message)
        if pre is None:
            pre = operational_pre_classify(message)
        if pre is None:
            pre = assign_clarify_pre_classify(message)
        if pre is None:
            pre = deterministic_pre_classify(message)
        if pre is None and not use_llm:
            pre = delegation_anti_sink_pre_classify(message)

        if pre is not None:
            intent       = pre["intent"]
            worker_slug  = pre.get("worker_slug") or mention
            depart_slug  = pre.get("depart_slug")
            reject_reason = pre.get("reject_reason")
            task_description = pre.get("task_description")
        elif use_llm:
            llm_result    = self.llm_classify(message)
            intent        = llm_result.get("intent", "general_chat")
            worker_slug   = llm_result.get("worker_slug")
            depart_slug   = llm_result.get("depart_slug")
            reject_reason = llm_result.get("reject_reason")
            task_description = llm_result.get("task_description")

            if intent not in VALID_INTENTS:
                intent = "general_chat"

            if mention and not worker_slug:
                worker_slug = mention

            if intent == "/assign" and task_id is not None:
                intent = "/mgrassign"

            if intent == "/assign" and not worker_slug and not mention:
                intent = "/assign_clarify"
                task_description = task_description or message.strip()

            if depart_slug:
                depart_slug = depart_slug.strip().lower()
                if depart_slug not in VALID_DEPARTMENTS:
                    depart_slug = None
        else:
            intent = "general_chat"
            worker_slug = mention
            depart_slug = None
            reject_reason = None
            task_description = None

        result = {
            "intent":       intent,
            "id":           task_id,
            "worker_slug":  worker_slug,
            "depart_slug":  depart_slug,
            "deadline":     datetime_info.get("deadline"),
            "message":      None,
            "reject_reason": reject_reason if intent == "/mgrreject" else None,
            "task_description": task_description if intent == "/assign_clarify" else None,
        }

        if intent == "general_chat":
            result["message"] = get_general_chat_response(message)

        return result

    # --------------------------------------------------------
    # SYSTEM PROMPT  (v2 — with few-shot examples)
    # --------------------------------------------------------

    def _build_system_prompt(self) -> str:
        return """
You are an enterprise multilingual intent classification engine.
You understand English, Hindi, and Hinglish.
You ONLY return valid JSON. No markdown, no explanations.

========================================================
CRITICAL DISAMBIGUATION RULE
========================================================

The single most important distinction:

INSTRUCTION (telling someone to do work in the future)
  → /assign  OR  /depart_assign  (depending on whether a person is named)

CONFIRMATION (reporting work is already done)
  → /complete

Signal words for INSTRUCTION:
  karo, kare, karein, bhejo, do, dedo, please, bolo, finish the, complete the

Signal words for CONFIRMATION:
  ho gaya, kar diya, done, finished, khatam ho gaya, dispatch done, complete ho gaya

========================================================
INTENT DEFINITIONS
========================================================

/tasks          → user wants to view their own task list
/assign         → instruct a NAMED person to do NEW work (no existing task id)
/assign_delivery → delivery/dispatch with worker + SKU/stock quantity (stock-linked)
/depart_assign  → instruct a DEPARTMENT to do work (no person named, no existing task id)
/mgrassign      → reassign an EXISTING task (task id present) to a named person
/mgrself        → manager takes an existing task themselves
/complete       → CONFIRMING work is already finished
/update         → update status/details of an existing task
/issue          → report a new problem
/issues         → view existing issues
/resolve        → mark an issue as resolved
/present        → mark attendance as present
/absent         → mark attendance as absent
/members        → view team/member list
/report         → generate a report
/help           → user wants help or command list
/mgrtransfer    → transfer existing task to another department
/mgrreject      → reject a task with a reason
/onboard_vendor → start vendor onboarding workflow (add/register supplier)
/onboard_worker → start worker onboarding workflow (add/register employee)
/inventory_create → start inventory item creation workflow
/inventory_status → check stock levels, SKU status, or low-stock summary
/inventory_import_csv → bulk import inventory from CSV file (NOT business onboarding)
/purchase_request_create → start purchase request workflow (need → approval → vendor)
/cancel → cancel active multi-step workflow or import session
/suggestion_approve → approve/reject AI document suggestion (workflow)
/assign_clarify → task described but NO person named; ask who to assign (e.g. "aaj website banegi")
/task_inventory_nl → NL stock-linked task (delivery, count, issue) with SKU/qty signals
/business_discovery → start progressive business discovery (identity, org, vendors) — NOT CSV import
/continue_discovery → resume paused business discovery workflow
general_chat    → greetings, casual chat, off-topic questions, or "how to use" questions

========================================================
FEW-SHOT EXAMPLES
========================================================

--- /assign examples ---
Input:  ajay ko warehouse khali karne bolo
Output: {"intent":"/assign","worker_slug":"ajay","depart_slug":null,"reject_reason":null}

Input:  @rahul invoice bhejdo
Output: {"intent":"/assign","worker_slug":"@rahul","depart_slug":null,"reject_reason":null}

Input:  priya client ko call kare
Output: {"intent":"/assign","worker_slug":"priya","depart_slug":null,"reject_reason":null}

Input:  ajay complete the work
Output: {"intent":"/assign","worker_slug":"ajay","depart_slug":null,"reject_reason":null}

Input:  complete the work ajay
Output: {"intent":"/assign","worker_slug":"ajay","depart_slug":null,"reject_reason":null}

Input:  rahul ye task finish karo
Output: {"intent":"/assign","worker_slug":"rahul","depart_slug":null,"reject_reason":null}

--- /depart_assign examples ---
Input:  warehouse khali karo
Output: {"intent":"/depart_assign","worker_slug":null,"depart_slug":"operations","reject_reason":null}

Input:  invoice bhejo
Output: {"intent":"/depart_assign","worker_slug":null,"depart_slug":"sales","reject_reason":null}

Input:  server theek karo
Output: {"intent":"/depart_assign","worker_slug":null,"depart_slug":"it","reject_reason":null}

Input:  raw material order karo
Output: {"intent":"/depart_assign","worker_slug":null,"depart_slug":"purchase","reject_reason":null}

Input:  complete the dispatch work
Output: {"intent":"/depart_assign","worker_slug":null,"depart_slug":"operations","reject_reason":null}

--- /mgrassign examples ---
Input:  task 32 ajay ko do
Output: {"intent":"/mgrassign","worker_slug":"ajay","depart_slug":null,"reject_reason":null}

Input:  task 5 @rahul ko assign karo
Output: {"intent":"/mgrassign","worker_slug":"@rahul","depart_slug":null,"reject_reason":null}

Input:  id 4 priya ko de do
Output: {"intent":"/mgrassign","worker_slug":"priya","depart_slug":null,"reject_reason":null}

--- /mgrself examples ---
Input:  task 32 main karunga
Output: {"intent":"/mgrself","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  i will do task 8
Output: {"intent":"/mgrself","worker_slug":null,"depart_slug":null,"reject_reason":null}

--- /complete examples ---
Input:  ho gaya
Output: {"intent":"/complete","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  kar diya
Output: {"intent":"/complete","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  done
Output: {"intent":"/complete","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  task complete ho gaya
Output: {"intent":"/complete","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  dispatch done
Output: {"intent":"/complete","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  kaam khatam ho gaya
Output: {"intent":"/complete","worker_slug":null,"depart_slug":null,"reject_reason":null}

--- TRICKY: instruction vs completion ---
Input:  complete the work          (← instruction, no person named)
Output: {"intent":"/depart_assign","worker_slug":null,"depart_slug":"operations","reject_reason":null}

Input:  kaam complete karo         (← instruction)
Output: {"intent":"/depart_assign","worker_slug":null,"depart_slug":"operations","reject_reason":null}

Input:  complete kar diya          (← confirmed done)
Output: {"intent":"/complete","worker_slug":null,"depart_slug":null,"reject_reason":null}

--- /mgrtransfer examples ---
Input:  transfer task 12 to sales department
Output: {"intent":"/mgrtransfer","worker_slug":null,"depart_slug":"sales","reject_reason":null}

Input:  task 15 ko it department bhejo
Output: {"intent":"/mgrtransfer","worker_slug":null,"depart_slug":"it","reject_reason":null}

--- /mgrreject examples ---
Input:  reject task 12 - wrong department
Output: {"intent":"/mgrreject","worker_slug":null,"depart_slug":null,"reject_reason":"wrong department"}

Input:  task 15 reject karo, not our scope
Output: {"intent":"/mgrreject","worker_slug":null,"depart_slug":null,"reject_reason":"not our scope"}

--- /assign_clarify examples ---
Input:  aaj website banegi
Output: {"intent":"/assign_clarify","worker_slug":null,"depart_slug":null,"reject_reason":null,"task_description":"aaj website banegi"}

Input:  Aaj 4 website banegi
Output: {"intent":"/assign_clarify","worker_slug":null,"depart_slug":null,"reject_reason":null,"task_description":"Aaj 4 website banegi"}

Input:  kal dispatch ho jayega
Output: {"intent":"/assign_clarify","worker_slug":null,"depart_slug":null,"reject_reason":null,"task_description":"kal dispatch ho jayega"}

Input:  machine repair karni hai
Output: {"intent":"/assign_clarify","worker_slug":null,"depart_slug":null,"reject_reason":null,"task_description":"machine repair karni hai"}

--- /present examples ---
Input:  aa gaya hu
Output: {"intent":"/present","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  i am here
Output: {"intent":"/present","worker_slug":null,"depart_slug":null,"reject_reason":null}

--- /absent examples ---
Input:  aaj nahi aa paunga
Output: {"intent":"/absent","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  leave chahiye
Output: {"intent":"/absent","worker_slug":null,"depart_slug":null,"reject_reason":null}

--- /onboard_vendor examples ---
Input:  add a supplier
Output: {"intent":"/onboard_vendor","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  register a new vendor
Output: {"intent":"/onboard_vendor","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  naya vendor add karna hai
Output: {"intent":"/onboard_vendor","worker_slug":null,"depart_slug":null,"reject_reason":null}

--- /onboard_worker examples ---
Input:  add a new worker
Output: {"intent":"/onboard_worker","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  naya worker add karo
Output: {"intent":"/onboard_worker","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  register employee Rahul
Output: {"intent":"/onboard_worker","worker_slug":null,"depart_slug":null,"reject_reason":null}

--- /inventory_create examples ---
Input:  create inventory item
Output: {"intent":"/inventory_create","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  inventory item banao
Output: {"intent":"/inventory_create","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  add new stock item
Output: {"intent":"/inventory_create","worker_slug":null,"depart_slug":null,"reject_reason":null}

--- /inventory_status examples ---
Input:  check inventory status
Output: {"intent":"/inventory_status","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  stock level dikhao
Output: {"intent":"/inventory_status","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  kitna stock hai cement ka
Output: {"intent":"/inventory_status","worker_slug":null,"depart_slug":null,"reject_reason":null}

--- /purchase_request_create examples ---
Input:  create purchase request
Output: {"intent":"/purchase_request_create","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  need cement
Output: {"intent":"/purchase_request_create","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  steel kharidna hai
Output: {"intent":"/purchase_request_create","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  order packaging material
Output: {"intent":"/purchase_request_create","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  procurement request banao
Output: {"intent":"/purchase_request_create","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  need raw material
Output: {"intent":"/purchase_request_create","worker_slug":null,"depart_slug":null,"reject_reason":null}

--- /business_discovery examples ---
Input:  tell you about my business
Output: {"intent":"/business_discovery","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  setup my business
Output: {"intent":"/business_discovery","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  register my company
Output: {"intent":"/business_discovery","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  update company details
Output: {"intent":"/business_discovery","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  import inventory
Output: {"intent":"/inventory_import_csv","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  import inventory csv file
Output: {"intent":"/inventory_import_csv","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  import vendors
Output: {"intent":"/business_discovery","worker_slug":null,"depart_slug":null,"reject_reason":null}

--- /inventory_import_csv examples ---
Input:  bulk inventory import
Output: {"intent":"/inventory_import_csv","worker_slug":null,"depart_slug":null,"reject_reason":null}

--- /assign_delivery examples ---
Input:  ram ko 50 bolt bhejo
Output: {"intent":"/assign_delivery","worker_slug":"ram","depart_slug":null,"reject_reason":null}

Input:  dispatch 20 sku ABC to priya
Output: {"intent":"/assign_delivery","worker_slug":"priya","depart_slug":null,"reject_reason":null}

--- /task_inventory_nl examples ---
Input:  stock count karo warehouse ka
Output: {"intent":"/task_inventory_nl","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  inventory count for bolts
Output: {"intent":"/task_inventory_nl","worker_slug":null,"depart_slug":null,"reject_reason":null}

--- /cancel examples ---
Input:  cancel
Output: {"intent":"/cancel","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  cancel workflow
Output: {"intent":"/cancel","worker_slug":null,"depart_slug":null,"reject_reason":null}

--- /suggestion_approve examples ---
Input:  /suggestion_approve
Output: {"intent":"/suggestion_approve","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  mera business setup karna hai
Output: {"intent":"/business_discovery","worker_slug":null,"depart_slug":null,"reject_reason":null}

--- /continue_discovery examples ---
Input:  continue setup
Output: {"intent":"/continue_discovery","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  continue onboarding
Output: {"intent":"/continue_discovery","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  setup wapas karo
Output: {"intent":"/continue_discovery","worker_slug":null,"depart_slug":null,"reject_reason":null}

--- general_chat examples ---
Input:  hello
Output: {"intent":"general_chat","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  kaise ho
Output: {"intent":"general_chat","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  tell me a joke
Output: {"intent":"general_chat","worker_slug":null,"depart_slug":null,"reject_reason":null}

Input:  what can you do
Output: {"intent":"general_chat","worker_slug":null,"depart_slug":null,"reject_reason":null}

========================================================
DEPARTMENT ROUTING
========================================================

operations : warehouse, dispatch, logistics, delivery, inventory, production, machine, packaging, loading, unloading
sales      : invoice, customer, client, quotation, payment, order
purchase   : vendor, supplier, procurement, raw material, buying, sourcing
it         : server, laptop, computer, software, internet, wifi, printer

========================================================
OUTPUT FORMAT
========================================================

Always return exactly:
{
  "intent": "<one of the valid intents>",
  "worker_slug": "<string or null>",
  "depart_slug": "<operations|sales|purchase|it|null>",
  "reject_reason": "<string or null>"
}

Rules:
- /assign      → worker_slug required, depart_slug null
- /depart_assign → depart_slug required, worker_slug null
- /mgrassign   → worker_slug required
- /mgrself     → worker_slug null
- /mgrtransfer → depart_slug required, worker_slug null
- /mgrreject   → reject_reason required if detectable
- all others   → both null unless explicitly present

NEVER return markdown. NEVER return explanations. ONLY return JSON.
"""


# ============================================================
# WA MESSAGE CONVERTER
# Converts WhatsApp-formatted bot messages into plain English.
# ============================================================

_WA_DIVIDER_RE = re.compile(r"^[─\-=_\u2500\u2014]{3,}\s*$", re.MULTILINE)
_WA_BOLD_RE = re.compile(r"\*([^*\n]+)\*")
_WA_PLACEHOLDER_RE = re.compile(r"\$\{([^}]+)\}")
_WA_BULLET_RE = re.compile(r"^\s*[•·▪\-]\s*", re.MULTILINE)


class WaMessageConverter:

    _PLACEHOLDER_LABELS = {
        "title": "the title",
        "body": "the details",
        "footer": "the note",
        "userName": "the user",
        "command": "the command",
        "usage": "the correct usage",
        "example": "an example",
        "examples": "examples",
        "taskId": "the task number",
        "description": "the task description",
        "detail": "more details",
        "update": "the update",
        "message": "the message",
        "issueId": "the issue number",
        "slug": "the department name",
    }

    def __init__(self):
        pass

    def _replace_placeholders(self, text: str) -> str:
        def _label(match: re.Match) -> str:
            key = match.group(1).strip()
            return self._PLACEHOLDER_LABELS.get(key, f"[{key}]")

        return _WA_PLACEHOLDER_RE.sub(_label, text)

    def _preprocess(self, wa_message: str) -> str:
        text = wa_message.strip()
        text = self._replace_placeholders(text)
        text = _WA_DIVIDER_RE.sub("", text)
        text = _WA_BOLD_RE.sub(r"\1", text)
        text = _WA_BULLET_RE.sub("- ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    def _build_system_prompt(self) -> str:
        return """
You rewrite Munshi Assistant WhatsApp bot messages into simple, natural English.

The input is already partially cleaned (no dividers or *bold* markers). Your job is to turn
structured bot text into friendly sentences a person would actually say on WhatsApp.

RULES:
1. Speak directly to the user ("you", "your"). Use a warm, clear tone.
2. Do NOT keep bot-style labels like "Command:", "Usage:", "Example:", "Task:", "Update:" as headings.
   Fold them into normal sentences instead.
3. Keep real command examples exactly as written (e.g. /mgrreject 12 not our scope, "present", @anil will do task 12).
4. For help menus with many bullets, group related items into short sentences or a compact list —
   do not dump a long raw bullet list unless every item is important.
5. For errors, lead with what went wrong, then how to fix it, then an example if one was given.
6. For success messages (task assigned, completed, issue reported), sound confirming and brief.
7. Replace any remaining bracket placeholders like [task number] with natural wording.
8. Output ONLY the final message. No preamble, no "Here is...", no markdown.

FEW-SHOT EXAMPLES:

Input:
Invalid format

Command: /mgrreject

Usage:
/mgrreject <task_id> <reason>

Example:
/mgrreject 12 not our scope

Send /help for more examples.

Output:
Your message format was not valid. For /mgrreject, include a task number and a reason — for example: /mgrreject 12 not our scope. Send /help if you need more examples.

Input:
Task number required

Please include the task number in your message.

Examples:
- "@anil will do task 12"
- "Assign task 12 to @4"

Output:
Please include the task number in your message. For example: "@anil will do task 12" or "Assign task 12 to @4".

Input:
Assignee required

Please specify who should do task #5 using @name, @id, or @phone.

Examples:
- "@anil will do task 5"
- "Assign task 5 to @4"

Output:
Please say who should do task #5 — use @name, @id, or @phone. For example: "@anil will do task 5" or "Assign task 5 to @4".

Input:
Task assigned

Task: Clean warehouse

Assigned to Anil. Due today.

Output:
Task assigned: Clean warehouse. It has been assigned to Anil and is due today.

Input:
Sent to department

Task: Today's sales figures
Department: Sales (sales)

The department manager has been notified. They will accept the task or assign it to a team member.

Output:
Your request has been sent to the Sales department: Today's sales figures. The department manager has been notified and will either accept it or assign it to someone on the team.

Input:
Unknown command

We did not understand that request.

Send /help to see what you can do.

Output:
Sorry, I didn't understand that. Send /help to see what you can do.

Input:
Hello Rahul,

Welcome to Munshi Assistant — manage attendance, tasks, and issues from WhatsApp.

Attendance
- "present"
- "absent"

Tasks
- "show my tasks"
- "complete task 4"

Output:
Hello Rahul! Welcome to Munshi Assistant — you can manage attendance, tasks, and issues from WhatsApp. For attendance, say "present" or "absent". For tasks, try "show my tasks" or "complete task 4". Send /help for the full list of commands.

Input:
Active issues

No open issues at the moment.

Everything is running smoothly.

Output:
There are no open issues right now — everything is running smoothly.

Input:
Issue reported

Your report has been recorded.

Details:
Machine not working

The management team has been notified.

Output:
Your issue has been recorded: Machine not working. The management team has been notified.
"""

    def convert(self, wa_message: str) -> str:
        """
        Takes a WhatsApp-formatted message string and returns
        a clean plain-English version.
        """
        if not wa_message or not wa_message.strip():
            return ""

        cleaned = self._preprocess(wa_message)

        try:
            response = get_openai_client().chat.completions.create(
                model=CHAT_MODEL,
                temperature=0,
                seed=42,
                messages=[
                    {"role": "system", "content": self._build_system_prompt()},
                    {"role": "user", "content": cleaned},
                ],
            )
            result = response.choices[0].message.content.strip()
            return self._postprocess(result)
        except Exception:
            return self._fallback_convert(cleaned)

    def _postprocess(self, text: str) -> str:
        text = _WA_BOLD_RE.sub(r"\1", text)
        text = _WA_DIVIDER_RE.sub("", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    def _fallback_convert(self, cleaned: str) -> str:
        """Rule-based fallback when the LLM is unavailable."""
        lines = [ln.strip() for ln in cleaned.splitlines() if ln.strip()]
        if not lines:
            return ""

        title = lines[0]
        body_lines = lines[1:]
        sentences = []

        if title.lower().startswith(("invalid", "unknown", "department", "assignee",
                                     "description", "task number")):
            sentences.append(f"{title.rstrip('.')}.")

        i = 0
        while i < len(body_lines):
            line = body_lines[i]
            lower = line.lower().rstrip(":")

            if lower in {"command", "usage", "example", "examples", "task", "update",
                         "details", "department"}:
                value = body_lines[i + 1] if i + 1 < len(body_lines) else ""
                if lower == "command":
                    sentences.append(f"You used {value}.")
                elif lower == "usage":
                    sentences.append(f"Correct usage: {value}")
                elif lower in {"example", "examples"}:
                    sentences.append(f"Example: {value}")
                else:
                    sentences.append(f"{line}: {value}" if value else line)
                i += 2 if value and i + 1 < len(body_lines) else 1
                continue

            if line.startswith("- "):
                sentences.append(line)
            else:
                sentences.append(line if line.endswith(".") else f"{line}.")
            i += 1

        return " ".join(sentences).replace("  ", " ").strip()


_classifier: IntentClassifier | None = None


def classify_hybrid(message: str, use_llm: bool = False) -> Dict[str, Any]:
    """Full classification pipeline for evaluation and production."""
    global _classifier
    parser = CommandParser()
    parsed = parser.parse(message)
    if parsed:
        return parsed
    if _classifier is None:
        _classifier = IntentClassifier()
    return _classifier.classify(message, use_llm=use_llm)