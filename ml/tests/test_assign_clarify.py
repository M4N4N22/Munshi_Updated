from bot_engine import assign_clarify_pre_classify, classify_hybrid


def test_assign_clarify_website_banegi():
    result = assign_clarify_pre_classify("aaj website banegi")
    assert result is not None
    assert result["intent"] == "/assign_clarify"
    assert "website" in result["task_description"].lower()


def test_assign_clarify_hybrid():
    assert classify_hybrid("aaj website banegi", use_llm=False)["intent"] == "/assign_clarify"


def test_assign_clarify_not_when_mention_present():
    assert assign_clarify_pre_classify("@rahul website banao") is None


def test_assign_clarify_not_present():
    assert assign_clarify_pre_classify("aaj mein present hu") is None
