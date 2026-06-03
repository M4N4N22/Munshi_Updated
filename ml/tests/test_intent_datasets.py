from pathlib import Path
import json

from eval.workflow_intent_eval import load_datasets


def test_intent_datasets_exist_with_minimum_examples():
    rows = load_datasets()
    assert len(rows) >= 400
    by_dataset = {}
    for row in rows:
        by_dataset.setdefault(row["dataset"], 0)
        by_dataset[row["dataset"]] += 1
    for key in (
        "onboard_vendor",
        "onboard_worker",
        "inventory_create",
        "inventory_status",
    ):
        assert by_dataset.get(key, 0) >= 100


def test_intent_dataset_files_on_disk():
    root = Path(__file__).resolve().parents[1] / "data" / "eval" / "intents"
    for name in (
        "onboard_vendor.json",
        "onboard_worker.json",
        "inventory_create.json",
        "inventory_status.json",
    ):
        data = json.loads((root / name).read_text(encoding="utf-8"))
        assert len(data) >= 100
