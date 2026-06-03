"""Generate document parsing evaluation fixtures."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_IMPORT = ROOT / "data" / "eval" / "documents" / "inventory_import"
OUT_STOCK = ROOT / "data" / "eval" / "documents" / "stock_register"


def _write_csv(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")


def inventory_fixtures() -> list[dict]:
    fixtures: list[dict] = []

    def add(fixture_id: str, file_name: str, content: str, expected: dict, tags: list[str], should_fail: bool = False):
        csv_path = OUT_IMPORT / "fixtures" / file_name
        _write_csv(csv_path, content)
        fixtures.append(
            {
                "id": fixture_id,
                "file_name": file_name,
                "mime_type": "text/csv",
                "document_type": "INVENTORY_IMPORT",
                "storage_path": f"fixtures/{file_name}",
                "tags": tags,
                "should_fail": should_fail,
                "expected": expected,
            }
        )

    add("inv-001", "standard_en.csv", "name,quantity,unit\nCement,500,bags\nSteel,120,kg", {"item_count": 2, "first_name": "Cement", "first_qty": 500}, ["english", "standard"])
    add("inv-002", "item_name_alias.csv", "item_name,qty,uom\nSand,200,ton", {"item_count": 1, "first_name": "Sand"}, ["alias"])
    add("inv-003", "product_column.csv", "product,stock\nPaint,40", {"item_count": 1, "first_name": "Paint", "first_qty": 40}, ["alias"])
    add("inv-004", "material_hindi.csv", "samagri,matra,ikayi\nCement,100,bore", {"item_count": 1, "first_name": "Cement"}, ["hindi_headers"])
    add("inv-005", "mixed_headers.csv", "Item Name,Qty,SKU,Unit\nRod,50,ROD-1,pc", {"item_count": 1, "first_name": "Rod", "first_sku": "ROD-1"}, ["mixed"])
    add("inv-006", "category_location.csv", "name,quantity,category,location\nCement,10,Building,Store A", {"item_count": 1, "first_name": "Cement"}, ["optional_columns"])
    add("inv-007", "sku_only.csv", "name,sku\nWire,WR-99", {"item_count": 1, "first_name": "Wire", "first_sku": "WR-99"}, ["optional"])
    add("inv-008", "no_quantity.csv", "name\nBricks\nSand", {"item_count": 2, "first_name": "Bricks"}, ["missing_optional"])
    add("inv-009", "zero_qty.csv", "name,quantity\nEmptyStock,0", {"item_count": 1, "first_qty": 0}, ["edge"])
    add("inv-010", "decimal_qty.csv", "name,quantity\nOil,12.5", {"item_count": 1, "first_qty": 12.5}, ["edge"])
    add("inv-011", "many_rows.csv", "name,quantity\n" + "\n".join(f"Item{i},{i}" for i in range(1, 11)), {"item_count": 10}, ["volume"])
    add("inv-012", "tab_separated.csv", "name\tquantity\tunit\nGlue\t5\tbottle", {"item_count": 1, "first_name": "Glue"}, ["structured_text"])
    add("inv-013", "hinglish_headers.csv", "maal,kitna,unit\nCement,20,bag", {"item_count": 1, "first_name": "Cement"}, ["hinglish"])
    add("inv-014", "closing_balance.csv", "item,closing\nPipe,33", {"item_count": 1, "first_name": "Pipe", "first_qty": 33}, ["alias"])
    add("inv-015", "code_alias.csv", "item_code,name,quantity\nCEM-1,Cement,100", {"item_count": 1, "first_name": "Cement"}, ["alias"])
    add("inv-016", "warehouse_alias.csv", "name,qty,warehouse\nSand,90,Yard", {"item_count": 1, "first_name": "Sand"}, ["alias"])
    add("inv-017", "duplicate_names.csv", "name,quantity\nCement,10\nCement,20", {"item_count": 2, "first_name": "Cement"}, ["edge"])
    add("inv-018", "special_chars.csv", 'name,quantity\n"Pipe 2""",15', {"item_count": 1, "first_name": 'Pipe 2"'}, ["edge"])
    add("inv-019", "spaces.csv", " name , quantity \n Cement , 5 ", {"item_count": 1, "first_name": "Cement", "first_qty": 5}, ["edge"])
    add("inv-020", "single_row.csv", "name,quantity\nNails,1000", {"item_count": 1, "first_name": "Nails"}, ["minimal"])
    add("inv-021", "empty_file.csv", "name,quantity\n", {"item_count": 0}, ["invalid"], should_fail=True)
    add("inv-022", "no_name_column.csv", "foo,bar\n1,2", {"item_count": 0}, ["invalid"], should_fail=True)

    return fixtures


def stock_fixtures() -> list[dict]:
    fixtures: list[dict] = []

    def add(fixture_id: str, file_name: str, content: str, expected: dict, tags: list[str], should_fail: bool = False):
        csv_path = OUT_STOCK / "fixtures" / file_name
        _write_csv(csv_path, content)
        fixtures.append(
            {
                "id": fixture_id,
                "file_name": file_name,
                "mime_type": "text/csv",
                "document_type": "STOCK_REGISTER",
                "storage_path": f"fixtures/{file_name}",
                "tags": tags,
                "should_fail": should_fail,
                "expected": expected,
            }
        )

    add("stk-001", "dated_en.csv", "date,name,quantity\n2026-05-01,Cement,450\n2026-05-01,Sand,200", {"item_count": 2, "first_name": "Cement"}, ["english"])
    add("stk-002", "as_of_date_col.csv", "as_of_date,item,balance\n2026-04-30,Steel,88", {"item_count": 1, "as_of_date": "2026-04-30"}, ["alias"])
    add("stk-003", "register_date.csv", "register_date,name,qty\n2026-03-15,Rod,10", {"item_count": 1}, ["alias"])
    add("stk-004", "filename_date.csv", "name,quantity\nCement,10\nSand,5", {"item_count": 2, "as_of_date_from_filename": "2026-05-15"}, ["filename"], )
    add("stk-005", "no_date.csv", "name,quantity\nCement,10", {"item_count": 1, "as_of_date_missing": True}, ["missing_optional"])
    add("stk-006", "hindi_headers.csv", "tareekh,samagri,matra\n2026-01-01,Cement,5", {"item_count": 1, "first_name": "Cement"}, ["hindi"])
    add("stk-007", "closing_stock.csv", "name,closing\nPaint,12", {"item_count": 1, "first_qty": 12}, ["alias"])
    add("stk-008", "item_name.csv", "date,item_name,stock\n2026-02-02,Bolt,99", {"item_count": 1}, ["alias"])
    add("stk-009", "multi_items.csv", "date,name,qty\n2026-06-01,A,1\n2026-06-01,B,2\n2026-06-01,C,3", {"item_count": 3}, ["volume"])
    add("stk-010", "sku_present.csv", "date,name,quantity,sku\n2026-07-01,Cement,1,CEM-1", {"item_count": 1, "first_sku": "CEM-1"}, ["optional"])
    add("stk-011", "unit_present.csv", "date,name,quantity,unit\n2026-07-02,Sand,2,ton", {"item_count": 1}, ["optional"])
    add("stk-012", "zero_qty.csv", "date,name,quantity\n2026-08-01,Empty,0", {"item_count": 1, "first_qty": 0}, ["edge"])
    add("stk-013", "decimal_qty.csv", "date,name,quantity\n2026-08-02,Oil,3.5", {"item_count": 1, "first_qty": 3.5}, ["edge"])
    add("stk-014", "mixed_lang.csv", "date,maal,kitna\n2026-09-01,Cement,7", {"item_count": 1}, ["hinglish"])
    add("stk-015", "tab_sep.csv", "date\tname\tquantity\n2026-09-02\tWire\t4", {"item_count": 1, "first_name": "Wire"}, ["structured_text"])
    add("stk-016", "long_list.csv", "date,name,quantity\n2026-10-01," + "Item1,1\n2026-10-01,".join(f"Item{i},{i}" for i in range(2, 8)), {"item_count": 7}, ["volume"])
    add("stk-017", "duplicate_items.csv", "date,name,quantity\n2026-11-01,Cement,1\n2026-11-01,Cement,2", {"item_count": 2}, ["edge"])
    add("stk-018", "spaces.csv", " date , name , quantity \n 2026-12-01 , Sand , 9 ", {"item_count": 1, "first_qty": 9}, ["edge"])
    add("stk-019", "single_row.csv", "date,name,quantity\n2026-12-31,Nails,100", {"item_count": 1}, ["minimal"])
    add("stk-020", "standard.csv", "date,name,quantity\n2026-05-29,Cement,450\n2026-05-29,Sand,200", {"item_count": 2}, ["standard"])
    add("stk-021", "empty.csv", "date,name,quantity\n", {"item_count": 0}, ["invalid"], should_fail=True)
    add("stk-022", "bad_headers.csv", "x,y\n1,2", {"item_count": 0}, ["invalid"], should_fail=True)

    return fixtures


def main() -> None:
    inv = inventory_fixtures()
    stk = stock_fixtures()
    if len(inv) < 20 or len(stk) < 20:
        raise SystemExit("Insufficient fixtures generated")

    OUT_IMPORT.mkdir(parents=True, exist_ok=True)
    OUT_STOCK.mkdir(parents=True, exist_ok=True)
    (OUT_IMPORT / "manifest.json").write_text(json.dumps(inv, indent=2), encoding="utf-8")
    (OUT_STOCK / "manifest.json").write_text(json.dumps(stk, indent=2), encoding="utf-8")
    print(f"Inventory fixtures: {len(inv)}")
    print(f"Stock fixtures: {len(stk)}")


if __name__ == "__main__":
    main()
