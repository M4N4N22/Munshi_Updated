import json
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]

CONTRACT_VERSION = "v1"


def _load(name: str):
    with open(_ROOT / name, encoding="utf-8") as f:
        return json.load(f)


_doc = _load("document-types.json")
_sug = _load("suggestion-types.json")
_wf = _load("workflow-types.json")
_int = _load("intent-types.json")
_task_kinds = _load("task-kinds.json")

DOCUMENT_TYPES = _doc["types"]
SUGGESTION_TYPES = _sug["types"]
WORKFLOW_TYPES = _wf["types"]
INTENT_TYPES = _int["intents"]
DEPARTMENT_SLUGS = _int["departments"]
TASK_KINDS = _task_kinds["task_kinds"]
