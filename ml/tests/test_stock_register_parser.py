from parsers.base import ParserInput
from parsers.stock_register_parser import StockRegisterParser


def test_stock_register_parser_csv():
    content = b"date,name,quantity\n2026-05-01,Cement,450\n2026-05-01,Sand,200\n"
    parser = StockRegisterParser()
    result = parser.parse(
        ParserInput(
            factory_id=1,
            file_name="stock.csv",
            mime_type="text/csv",
            content=content,
            document_type="STOCK_REGISTER",
        )
    )

    assert result.document_type == "STOCK_REGISTER"
    assert len(result.payload["items"]) == 2
    assert result.payload["items"][0]["name"] == "Cement"
