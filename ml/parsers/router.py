from typing import List

from parsers.base import DocumentParserAdapter, ParserInput, ParserResult
from parsers.inventory_import_parser import InventoryImportParser
from parsers.stock_register_parser import StockRegisterParser


class ParserRouter:
    def __init__(self, adapters: List[DocumentParserAdapter] | None = None):
        self.adapters = adapters or [
            StockRegisterParser(),
            InventoryImportParser(),
        ]

    def parse(self, input_data: ParserInput) -> ParserResult:
        selected = self._select_adapter(input_data)
        if not selected:
            raise ValueError(
                f"No parser available for document_type={input_data.document_type}"
            )
        return selected.parse(input_data)

    def _select_adapter(self, input_data: ParserInput) -> DocumentParserAdapter | None:
        if input_data.document_type == "STOCK_REGISTER":
            return StockRegisterParser()

        for adapter in self.adapters:
            if adapter.can_parse(input_data):
                return adapter

        return None
