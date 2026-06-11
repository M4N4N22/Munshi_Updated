"""V2E — inventory status, create, and onboard vendor hardening tests."""

from bot_engine import classify_hybrid, workflow_pre_classify, assign_clarify_pre_classify


def _intent(message: str) -> str:
    return classify_hybrid(message, use_llm=False)["intent"]


class TestInventoryStatus:
    def test_english_queries(self):
        for msg in (
            "check product stock",
            "how many bags in stock",
            "view item inventory",
        ):
            assert _intent(msg) == "/inventory_status", msg

    def test_hindi_queries(self):
        for msg in (
            "maal ka status",
            "kitna cement pada hai",
            "kam pada hua stock",
            "maal status check",
            "kitna maal pada hai",
            "kam stock wale items",
            "inventory check karo",
            "inventory status batao",
        ):
            assert _intent(msg) == "/inventory_status", msg


class TestInventoryCreate:
    def test_create_priority_over_status(self):
        for msg in (
            "item inventory mein darj karo",
            "naya item stock mein",
            "add warehouse stock item",
        ):
            assert workflow_pre_classify(msg)["intent"] == "/inventory_create", msg


class TestOnboardVendor:
    def test_vendor_registration_phrases(self):
        for msg in (
            "register vendor for procurement",
            "add purchase vendor",
            "supplier ka record banao",
            "supplier record banao",
            "add vendor for purchase",
            "naya supplier register karo",
        ):
            assert _intent(msg) == "/onboard_vendor", msg

    def test_no_assign_clarify_bleed(self):
        assert assign_clarify_pre_classify("supplier record banao") is None


class TestRegression:
    def test_assign_family_unchanged(self):
        assert _intent("ram ko cleaning karo") == "/assign"
        assert _intent("quotation bhejo") == "/depart_assign"

    def test_passive_inventory_stays_clarify(self):
        assert _intent("inventory check karna hai") == "/assign_clarify"

    def test_procurement_unchanged(self):
        assert _intent("packaging tape order karo") == "/purchase_request_create"
