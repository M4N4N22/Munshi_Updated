from bot_engine import classify_hybrid, operational_pre_classify


def _intent(message: str) -> str:
    return classify_hybrid(message, use_llm=False)["intent"]


def test_operational_present():
    assert operational_pre_classify("aaj main present hoon")["intent"] == "/present"
    assert _intent("main aa gaya") == "/present"


def test_operational_absent():
    assert operational_pre_classify("chutti chahiye")["intent"] == "/absent"
    assert _intent("aaj nahi aa paunga") == "/absent"


def test_operational_tasks():
    assert _intent("mera kaam dikhao") == "/tasks"
    assert _intent("pending tasks dikhao") == "/tasks"


def test_operational_report():
    assert _intent("aaj ka report dikhao") == "/report"
    assert _intent("issues report dikhao") == "/report"


def test_operational_issue_and_issues():
    assert _intent("machine kharab hai") == "/issue"
    assert _intent("active issues dikhao") == "/issues"


def test_operational_assign():
    result = operational_pre_classify("rahul ko kaam do")
    assert result["intent"] == "/assign"
    assert result["worker_slug"] == "rahul"


def test_operational_mgrassign():
    result = operational_pre_classify("task 5 rahul ko do")
    assert result["intent"] == "/mgrassign"
    assert result["worker_slug"] == "rahul"


def test_operational_depart_assign():
    result = operational_pre_classify("warehouse khali karo")
    assert result["intent"] == "/depart_assign"
    assert result["depart_slug"] == "operations"


def test_operational_mgrtransfer():
    assert operational_pre_classify("task 5 inventory team ko transfer karo")["intent"] == "/mgrtransfer"


def test_operational_mgrreject():
    assert operational_pre_classify("task 8 reject karo")["intent"] == "/mgrreject"


def test_operational_mgrself():
    assert operational_pre_classify("task 20 main khud karunga")["intent"] == "/mgrself"


def test_issue_before_complete():
    assert _intent("power cut ho gaya section mein") == "/issue"
