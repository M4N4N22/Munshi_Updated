import base64
from typing import Dict

from parsers.base import ParserInput
from parsers.inventory_import_parser import InventoryImportParser
from parsers.stock_register_parser import StockRegisterParser


INVENTORY_CSV = b"name,quantity,unit\nCement,500,bags\nSteel,120,kg\n"
STOCK_CSV = b"as_of_date,name,quantity\n2026-05-01,Cement,450\n2026-05-01,Sand,200\n"


def evaluate_document_extraction() -> dict:
    inventory = _evaluate_inventory_parser()
    stock = _evaluate_stock_parser()
    return {
        "inventory_import": inventory,
        "stock_register": stock,
    }


def _evaluate_inventory_parser() -> dict:
    parser = InventoryImportParser()
    result = parser.parse(
        ParserInput(
            factory_id=1,
            file_name="inventory.csv",
            mime_type="text/csv",
            content=INVENTORY_CSV,
            document_type="INVENTORY_IMPORT",
        )
    )
    ok = (
        result.document_type == "INVENTORY_IMPORT"
        and len(result.payload.get("items", [])) == 2
    )
    return {"pass_rate": 1.0 if ok else 0.0, "passed": int(ok), "total": 1}


def _evaluate_stock_parser() -> dict:
    parser = StockRegisterParser()
    result = parser.parse(
        ParserInput(
            factory_id=1,
            file_name="stock-2026-05-01.csv",
            mime_type="text/csv",
            content=STOCK_CSV,
            document_type="STOCK_REGISTER",
        )
    )
    ok = (
        result.document_type == "STOCK_REGISTER"
        and len(result.payload.get("items", [])) == 2
    )
    return {"pass_rate": 1.0 if ok else 0.0, "passed": int(ok), "total": 1}


def encode_fixture(content: bytes) -> str:
    return base64.b64encode(content).decode("ascii")
