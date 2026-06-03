import re
from typing import List, Optional

from contracts.python.models import StockRegisterExtraction
from parsers.base import DocumentParserAdapter, ParserInput, ParserResult
from parsers.common import DATE_COLUMNS, dataframe_to_items, read_tabular

DOCUMENT_TYPE = "STOCK_REGISTER"
DATE_PATTERN = re.compile(r"(\d{4}-\d{2}-\d{2}|\d{2}[/-]\d{2}[/-]\d{4})")


class StockRegisterParser(DocumentParserAdapter):
    @property
    def supported_document_types(self) -> List[str]:
        return [DOCUMENT_TYPE]

    def can_parse(self, input_data: ParserInput) -> bool:
        return input_data.document_type == DOCUMENT_TYPE

    def parse(self, input_data: ParserInput) -> ParserResult:
        warnings: List[str] = []
        df = read_tabular(input_data.content, input_data.file_name, input_data.mime_type)
        items = dataframe_to_items(df, warnings)

        if not items:
            raise ValueError("No stock register items could be extracted from the file")

        as_of_date = self._detect_as_of_date(input_data, df, warnings)
        extraction = StockRegisterExtraction(as_of_date=as_of_date, items=items)
        return ParserResult(
            document_type=DOCUMENT_TYPE,
            payload=extraction.model_dump(),
            warnings=warnings or None,
        )

    def _detect_as_of_date(
        self,
        input_data: ParserInput,
        df,
        warnings: List[str],
    ) -> Optional[str]:
        normalized_cols = {
            str(c).strip().lower().replace(" ", "_"): c for c in df.columns
        }
        for key in DATE_COLUMNS:
            key_norm = key.replace(" ", "_")
            if key_norm in normalized_cols:
                series = df[normalized_cols[key_norm]].dropna()
                if len(series):
                    return str(series.iloc[0]).strip()

        match = DATE_PATTERN.search(input_data.file_name)
        if match:
            return match.group(1)

        warnings.append("as_of_date not found — left empty")
        return None
