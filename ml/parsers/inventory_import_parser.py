from typing import List

from contracts.python.models import InventoryImportExtraction
from parsers.base import DocumentParserAdapter, ParserInput, ParserResult
from parsers.common import dataframe_to_items, read_tabular

DOCUMENT_TYPE = "INVENTORY_IMPORT"


class InventoryImportParser(DocumentParserAdapter):
    @property
    def supported_document_types(self) -> List[str]:
        return [DOCUMENT_TYPE]

    def can_parse(self, input_data: ParserInput) -> bool:
        if input_data.document_type in (None, "", "UNKNOWN", DOCUMENT_TYPE):
            return True
        return input_data.document_type == DOCUMENT_TYPE

    def parse(self, input_data: ParserInput) -> ParserResult:
        warnings: List[str] = []
        df = read_tabular(input_data.content, input_data.file_name, input_data.mime_type)
        items = dataframe_to_items(df, warnings)

        if not items:
            raise ValueError("No inventory items could be extracted from the file")

        extraction = InventoryImportExtraction(items=items)
        return ParserResult(
            document_type=DOCUMENT_TYPE,
            payload=extraction.model_dump(),
            warnings=warnings or None,
        )
