from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class ParserInput:
    factory_id: int
    file_name: str
    mime_type: str
    content: bytes
    document_type: Optional[str] = None


@dataclass
class ParserResult:
    document_type: str
    payload: dict
    warnings: List[str] = field(default_factory=list)


class DocumentParserAdapter(ABC):
    @property
    @abstractmethod
    def supported_document_types(self) -> List[str]:
        pass

    @abstractmethod
    def can_parse(self, input_data: ParserInput) -> bool:
        pass

    @abstractmethod
    def parse(self, input_data: ParserInput) -> ParserResult:
        pass
