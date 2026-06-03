import pytest

from parsers.base import ParserInput
from parsers.inventory_import_parser import InventoryImportParser


def test_inventory_import_parser_csv():
    content = b"name,quantity,sku\nCement,500,CEM-01\n"
    parser = InventoryImportParser()
    result = parser.parse(
        ParserInput(
            factory_id=1,
            file_name="inventory.csv",
            mime_type="text/csv",
            content=content,
            document_type="INVENTORY_IMPORT",
        )
    )

    assert result.document_type == "INVENTORY_IMPORT"
    assert result.payload["document_type"] == "INVENTORY_IMPORT"
    assert result.payload["items"][0]["name"] == "Cement"
    assert result.payload["items"][0]["quantity"] == 500.0
