"""Evaluation harness for Munshi LLM contract and parser quality."""

from eval.contract_drift_eval import evaluate as evaluate_contract_drift
from eval.contract_eval import evaluate_contract_compliance
from eval.document_eval import evaluate_document_extraction
from eval.document_quality_eval import evaluate as evaluate_document_quality
from eval.e2e_validation import evaluate as evaluate_e2e
from eval.intent_eval import evaluate_intent_classification
from eval.workflow_intent_eval import evaluate as evaluate_workflow_intents


def run_all(use_llm: bool = False) -> dict:
    intent = evaluate_intent_classification()
    workflow_intent = evaluate_workflow_intents(use_llm=use_llm)
    extraction = evaluate_document_extraction()
    document_quality = evaluate_document_quality()
    contract = evaluate_contract_compliance()
    contract_drift = evaluate_contract_drift()
    e2e = evaluate_e2e()

    return {
        "intent": intent,
        "workflow_intent": {
            "accuracy": workflow_intent["accuracy"],
            "macro_precision": workflow_intent["macro_precision"],
            "macro_recall": workflow_intent["macro_recall"],
            "failure_count": workflow_intent["failure_count"],
            "mode": workflow_intent["mode"],
        },
        "extraction": extraction,
        "document_quality": {
            "overall_pass_rate": document_quality["overall_pass_rate"],
            "inventory_import": document_quality["inventory_import"]["parser_pass_rate"],
            "stock_register": document_quality["stock_register"]["parser_pass_rate"],
        },
        "contract": contract,
        "contract_drift": contract_drift,
        "e2e": {
            "success_rate": e2e["success_rate"],
            "passed": e2e["passed"],
            "total_scenarios": e2e["total_scenarios"],
        },
        "summary": {
            "workflow_intent_accuracy": workflow_intent["accuracy"],
            "document_overall_pass_rate": document_quality["overall_pass_rate"],
            "contract_compliance_rate": contract["compliance_rate"],
            "contract_drift_passed": contract_drift["passed"],
            "e2e_success_rate": e2e["success_rate"],
        },
    }


if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true")
    args = parser.parse_args()
    print(json.dumps(run_all(use_llm=args.live), indent=2))
