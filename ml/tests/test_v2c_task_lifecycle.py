"""V2C — task lifecycle intent hardening tests."""

from bot_engine import classify_hybrid, manager_pre_classify, operational_pre_classify


def _intent(message: str) -> str:
    return classify_hybrid(message, use_llm=False)["intent"]


class TestUpdateHardening:
    def test_percent_done_not_mgrassign(self):
        for msg in (
            "80 percent done task 5",
            "status update task 7",
            "half complete task 2",
            "task 3 update progress",
            "kaam almost complete hai",
        ):
            assert manager_pre_classify(msg) is None, msg
            assert _intent(msg) == "/update", msg


class TestMgrSelfHardening:
    def test_main_task_shorthand(self):
        assert _intent("main task 3") == "/mgrself"
        assert manager_pre_classify("main task 12")["intent"] == "/mgrself"

    def test_main_kar_patterns(self):
        for msg in (
            "task 8 main dekh lunga",
            "task 9 main sambhal lunga",
            "task 4 main kar leta hoon",
        ):
            assert _intent(msg) == "/mgrself", msg


class TestCancelHardening:
    def test_hindi_cancel_phrases(self):
        for msg in ("band karo", "cancel karo", "rok do", "stop karo", "mat karo"):
            assert _intent(msg) == "/cancel", msg

    def test_cancel_not_issue(self):
        assert _intent("machine kharab hai") == "/issue"
        assert operational_pre_classify("machine band")["intent"] == "/issue"

    def test_cancel_not_update(self):
        assert _intent("progress update karo") == "/update"


class TestAssignFamilyRegression:
    def test_assign_unchanged(self):
        assert _intent("ram ko cleaning karo") == "/assign"
        assert _intent("quotation bhejo") == "/depart_assign"
        assert _intent("50 bolt bhejo anil ko") == "/assign_delivery"
