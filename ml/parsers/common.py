import io
from typing import Dict, List, Optional, Tuple

import pandas as pd

NAME_COLUMNS = ("name", "item", "item_name", "product", "material", "samagri", "maal", "item name")
QTY_COLUMNS = ("quantity", "qty", "stock", "balance", "closing", "matra", "kitna")
SKU_COLUMNS = ("sku", "code", "item_code", "product_code")
UNIT_COLUMNS = ("unit", "uom", "ikayi")
CATEGORY_COLUMNS = ("category_name", "category")
LOCATION_COLUMNS = ("location_name", "location", "warehouse")
DATE_COLUMNS = ("as_of_date", "date", "register_date", "tareekh")


def normalize_column(name: str) -> str:
    return str(name).strip().lower().replace(" ", "_")


def read_tabular(content: bytes, file_name: str, mime_type: str) -> pd.DataFrame:
    lower_name = file_name.lower()
    buffer = io.BytesIO(content)

    if lower_name.endswith(".csv") or "csv" in mime_type:
        text = content.decode("utf-8", errors="replace")
        first_line = text.splitlines()[0] if text.splitlines() else ""
        sep = "\t" if "\t" in first_line and "," not in first_line else ","
        return pd.read_csv(io.StringIO(text), sep=sep)

    if lower_name.endswith((".xlsx", ".xls")) or "spreadsheet" in mime_type or "excel" in mime_type:
        return pd.read_excel(buffer)

    text = content.decode("utf-8", errors="replace")
    first_line = text.splitlines()[0] if text.splitlines() else ""
    sep = "\t" if "\t" in first_line and "," not in first_line else ","
    return pd.read_csv(io.StringIO(text), sep=sep)


def pick_column(columns: List[str], candidates: Tuple[str, ...]) -> Optional[str]:
    normalized = {normalize_column(c): c for c in columns}
    for candidate in candidates:
        if candidate in normalized:
            return normalized[candidate]
    return None


def row_to_item(row: Dict[str, object], warnings: List[str], row_idx: int) -> Optional[dict]:
    name = None
    for key in NAME_COLUMNS:
        if key in row and row[key] not in (None, ""):
            name = str(row[key]).strip()
            break

    if not name:
        warnings.append(f"Row {row_idx}: skipped — missing item name")
        return None

    quantity = None
    for key in QTY_COLUMNS:
        if key in row and row[key] not in (None, ""):
            try:
                quantity = float(row[key])
                if quantity < 0:
                    warnings.append(f"Row {row_idx}: negative quantity clamped to 0")
                    quantity = 0.0
            except (TypeError, ValueError):
                warnings.append(f"Row {row_idx}: invalid quantity ignored")
            break

    item = {"name": name}
    if quantity is not None:
        item["quantity"] = quantity

    for target, candidates in (
        ("sku", SKU_COLUMNS),
        ("unit", UNIT_COLUMNS),
        ("category_name", CATEGORY_COLUMNS),
        ("location_name", LOCATION_COLUMNS),
    ):
        for key in candidates:
            if key in row and row[key] not in (None, ""):
                item[target] = str(row[key]).strip()
                break

    return item


def dataframe_to_items(df: pd.DataFrame, warnings: List[str]) -> List[dict]:
    df = df.copy()
    df.columns = [normalize_column(c) for c in df.columns]
    records = df.to_dict(orient="records")
    items: List[dict] = []

    for idx, record in enumerate(records, start=1):
        item = row_to_item(record, warnings, idx)
        if item:
            items.append(item)

    return items
