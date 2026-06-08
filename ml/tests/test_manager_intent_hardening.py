"""Phase 5A — manager workflow intent hardening tests."""

from bot_engine import classify_hybrid, manager_pre_classify


def _intent(message: str) -> str:
    return classify_hybrid(message, use_llm=False)["intent"]


def _pre(message: str) -> str:
    return manager_pre_classify(message)["intent"]


# --- /mgrself ---
class TestMgrSelf:
    def test_hindi_self_assign(self):
        for msg in (
            "task 12 main karunga",
            "12 main sambhal lunga",
            "main kar lunga task 12",
            "task 12 main khud karunga",
            "owner ne diya 12 main karunga",
            "12 mujhe de do",
            "12 main khud karunga",
            "ye main dekh lunga task 12",
        ):
            assert _pre(msg) == "/mgrself", msg

    def test_english_self_assign(self):
        for msg in (
            "I'll do task 12",
            "I will handle task 12",
            "assign to me task 15",
            "i do task 12",
            "12 main",
            "main kar lunga",
            "owner ne diya 12 mujhe khud karna hai",
        ):
            assert _pre(msg) == "/mgrself", msg

    def test_typo_self_command(self):
        assert _pre("mgrse 12") == "/mgrself"


# --- /mgrassign ---
class TestMgrAssign:
    def test_delegation_phrases(self):
        cases = {
            "priya ko task 15 do": "priya",
            "task 15 priya karegi": "priya",
            "15 priya ko": "priya",
            "priya free hai usko 15 de do": "priya",
            "assign task 15 to priya": "priya",
            "15 wala task priya ko": "priya",
            "task 5 rahul ko do": "rahul",
            "priya task 15 do": "priya",
            "priya ko 15 do aur ram ko 16": "priya",
            "owner ne diya tha 15 priya ko transfer karo": "priya",
        }
        for msg, worker in cases.items():
            result = manager_pre_classify(msg)
            assert result["intent"] == "/mgrassign", msg
            assert result.get("worker_slug") == worker, msg

    def test_ram_karega(self):
        assert _pre("ram karega task 9") == "/mgrassign"


# --- /mgrtransfer ---
class TestMgrTransfer:
    def test_transfer_phrases(self):
        for msg in (
            "15 IT ko",
            "transfer task 15 to sales",
            "15 sales ko bhejo",
            "send task 15 to IT",
            "task 5 inventory team ko transfer karo",
            "owner ne diya tha 15 transfer karo sales",
            "15 send to it",
            "15 it",
            "galat dept 15 IT ko",
            "transfer karo",
            "mgrtr 15",
            "mgrtrasfer 15 it",
        ):
            assert _pre(msg) == "/mgrtransfer", msg


# --- /mgrreject ---
class TestMgrReject:
    def test_reject_phrases(self):
        for msg in (
            "reject task 18",
            "18 reject",
            "task 18 reject karo",
            "not our scope",
            "ye hamara kaam nahi",
            "galat assign hua",
            "reject kar do task 18",
            "task galat department me hai",
            "reject karo",
            "mgrre 18",
        ):
            assert _pre(msg) == "/mgrreject", msg


# --- task id extraction ---
class TestTaskIdExtraction:
    def test_variants(self):
        from bot_engine import _extract_mgr_task_id

        assert _extract_mgr_task_id("task 15") == 15
        assert _extract_mgr_task_id("15 wala task") == 15
        assert _extract_mgr_task_id("owner ne diya 15") == 15
        assert _extract_mgr_task_id("task number 15") == 15
        assert _extract_mgr_task_id("15 priya ko") == 15


# --- regression: non-manager intents unchanged ---
class TestRegression:
    def test_attendance(self):
        assert _intent("aaj main present hoon") == "/present"

    def test_tasks(self):
        assert _intent("mere tasks dikhao") == "/tasks"

    def test_members(self):
        assert _intent("team members dikhao") == "/members"

    def test_assign_no_task_id(self):
        result = manager_pre_classify("rahul ko kaam do")
        assert result is None or result["intent"] == "/assign"
