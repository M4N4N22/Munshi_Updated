"""V2B — operational intent sink elimination tests."""

from bot_engine import (
    classify_hybrid,
    delegation_anti_sink_pre_classify,
    operational_pre_classify,
)


def _intent(message: str) -> str:
    return classify_hybrid(message, use_llm=False)["intent"]


class TestPersonAssignExpansion:
    def test_generic_verbs(self):
        for msg in (
            "ram ko cleaning karo",
            "meena ko file bhejo",
            "rahul ko bol dena",
            "sonia ko list bhejo",
            "sunita ko email karo",
            "deepak ko sample do",
            "kumar ko training do",
        ):
            result = operational_pre_classify(msg)
            assert result is not None, msg
            assert result["intent"] == "/assign", msg

    def test_third_party_object(self):
        result = operational_pre_classify("priya client ko call kare")
        assert result["intent"] == "/assign"
        assert result["worker_slug"] == "priya"

    def test_se_construction(self):
        assert operational_pre_classify("priya se packing karwao")["intent"] == "/assign"
        assert operational_pre_classify("meeting setup karo ram se")["intent"] == "/assign"

    def test_passive_future_with_person(self):
        result = operational_pre_classify("ajay ko website banani hai")
        assert result["intent"] == "/assign"
        assert result["worker_slug"] == "ajay"


class TestDepartExpansion:
    def test_dept_team_and_actions(self):
        cases = {
            "quotation bhejo": "sales",
            "sales team ko target do": "sales",
            "purchase ko vendor call": "purchase",
            "operations ko load karo": "operations",
            "dispatch team ko bolo": "operations",
        }
        for msg, dept in cases.items():
            result = operational_pre_classify(msg)
            assert result is not None, msg
            assert result["intent"] == "/depart_assign", msg
            assert result["depart_slug"] == dept, msg


class TestReportCollision:
    def test_person_report_not_global_report(self):
        assert _intent("ajay ko report bhejo") == "/assign"
        assert _intent("ram ko report do") == "/assign"
        assert _intent("aaj ka report dikhao") == "/report"


class TestAntiSink:
    def test_sabko_training_clarify(self):
        assert _intent("sabko training do") == "/assign_clarify"

    def test_passive_inventory_clarify(self):
        assert _intent("inventory check karna hai") == "/assign_clarify"

    def test_anti_sink_not_for_greetings(self):
        assert delegation_anti_sink_pre_classify("hello team") is None


class TestStockLinked:
    def test_worker_at_end(self):
        assert _intent("50 bolt bhejo anil ko") == "/assign_delivery"
        assert _intent("bolt dispatch ram ko") == "/assign_delivery"

    def test_english_dispatch(self):
        assert _intent("dispatch sku X12 to ram") == "/assign_delivery"

    def test_nut_dispatch(self):
        assert _intent("priya ko 20 nut dispatch") == "/assign_delivery"
