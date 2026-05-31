from typing import List, Literal, Optional, Union

from pydantic import BaseModel, Field


class ClassifyResponse(BaseModel):
    intent: str
    id: Optional[Union[int, str]] = None
    worker_slug: Optional[str] = None
    depart_slug: Optional[str] = None
    deadline: Optional[str] = None
    reject_reason: Optional[str] = None
    message: Optional[str] = None


class ExtractionItem(BaseModel):
    name: str = Field(min_length=1)
    quantity: Optional[float] = Field(default=None, ge=0)
    sku: Optional[str] = None
    unit: Optional[str] = None
    category_name: Optional[str] = None
    location_name: Optional[str] = None


class InventoryImportExtraction(BaseModel):
    document_type: Literal["INVENTORY_IMPORT"] = "INVENTORY_IMPORT"
    items: List[ExtractionItem] = Field(min_length=1)


class StockRegisterExtraction(BaseModel):
    document_type: Literal["STOCK_REGISTER"] = "STOCK_REGISTER"
    as_of_date: Optional[str] = None
    items: List[ExtractionItem] = Field(min_length=1)


class ParseResponse(BaseModel):
    document_type: str
    extraction_version: str = "v1"
    payload: Union[InventoryImportExtraction, StockRegisterExtraction, dict]
    warnings: Optional[List[str]] = None
