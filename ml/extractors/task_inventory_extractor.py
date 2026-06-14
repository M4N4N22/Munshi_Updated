"""
Phase 4.1 — deterministic NL extraction for inventory-linked tasks.

Returns null for any field when confidence is insufficient (no hallucination).
"""

from __future__ import annotations

import re
from typing import Any, Dict, Optional

from contracts.python.models import TaskInventoryExtraction

_ASSIGNEE_KO_RE = re.compile(
    r"\b([A-Za-z][A-Za-z]{1,19})\s+ko\b",
    re.IGNORECASE,
)

_MENTION_RE = re.compile(r"@([A-Za-z][A-Za-z0-9_]*)")

_NAME_BEFORE_SKU_RE = re.compile(
    r"^(?:@\s*)?(?P<name>[A-Za-z]+(?:\s+[A-Za-z]+){0,2})\s+(?=[A-Z][A-Z0-9_]*_[A-Z0-9_]+\b)",
    re.IGNORECASE,
)

_ITEM_NUMBER_RE = re.compile(r"\bitem\s+(\d+)\b", re.IGNORECASE)

_ITEM_LABEL_RE = re.compile(r"\b((?:test\s+)?item\s+\d+)\b", re.IGNORECASE)

_NAME_LEADING_RE = re.compile(
    r"^(?:@\s*)?(?P<name>[A-Za-z]+)\s+(?P<rest>.+)$",
    re.IGNORECASE,
)

_ASSIGNEE_EXCLUDE = frozenset(
    {
        "aaj",
        "kal",
        "main",
        "mujhe",
        "humko",
        "tumko",
        "isko",
        "usko",
        "customer",
        "client",
        "vendor",
        "supplier",
        "department",
        "team",
    }
)

_SKU_RE = re.compile(r"\b([A-Z][A-Z0-9_]*_[A-Z0-9_]+)\b")

_QTY_RE = re.compile(r"\b(\d+(?:\.\d+)?)\b")

_HINDI_FILLER_RE = re.compile(r"\s+ki\s+\w+.*$", re.IGNORECASE)

_INVENTORY_COUNT_RE = re.compile(
    r"(inventory\s+count|stock\s+count|stock\s+check|ginati|ginwana|"
    r"counting|count\s+karwa|count\s+kara|count\s+karo|maal\s+gin)",
    re.IGNORECASE,
)

_DELIVERY_RE = re.compile(
    r"\b(deliver|delivery|bhej|bhejo|bhejdo|dispatch|pahuncha|supply|"
    r"jana\s+hai|jaana\s+hai|jan[ae]\s+hai|"
    r"maal\s+jana|maal\s+jaana|maal\s+jaye)\b",
    re.IGNORECASE,
)

_ISSUE_RE = re.compile(
    r"\b(issue|issue\s+karo|issue\s+kar|de\s+do|dedo|dena|dijiye)\b",
    re.IGNORECASE,
)

_UNIT_SUFFIX_RE = re.compile(
    r"\s+(bags?|pipes?|units?|pieces?|pcs?|kg|kgs|ton|tons|boxes?|cartons?)$",
    re.IGNORECASE,
)

_ITEM_STOP_RE = re.compile(
    r"\b(deliver|delivery|bhej|bhejo|dispatch|issue|karo|kar\s+do|dedo|de\s+do|"
    r"dena|dijiye|please|abhi|aaj|kal|ko|jana|jaana|"
    r"jana\s+hai|jaana\s+hai|jan[ae]\s+hai|hai)\b",
    re.IGNORECASE,
)


def _title_name(raw: str) -> str:
    cleaned = raw.strip()
    if not cleaned:
        return cleaned
    return " ".join(part.capitalize() for part in cleaned.split())


def _normalize_item(raw: str) -> Optional[str]:
    text = raw.strip()
    if not text:
        return None
    parts = text.split()
    is_acronym_item = (
        len(parts) >= 2 and parts[0].isupper() and len(parts[0]) <= 6
    )
    if not is_acronym_item:
        text = _UNIT_SUFFIX_RE.sub("", text).strip()
    if not text:
        return None
    if _SKU_RE.fullmatch(text):
        return text
    parts = text.split()
    if not parts:
        return None
    if len(parts) == 1:
        word = parts[0].lower()
        return _singularize_unit_word(word)
    head = parts[0]
    if head.isupper() and len(head) <= 6:
        tail = " ".join(parts[1:]).lower()
        singular = _singularize_unit_word(tail)
        return f"{head} {singular}".strip()
    normalized = " ".join(p.lower() for p in parts)
    return _singularize_unit_word(normalized)


def _singularize_unit_word(text: str) -> str:
    words = text.split()
    if not words:
        return text
    last = words[-1]
    if last.endswith("s") and len(last) > 3 and last not in {"glass", "ss"}:
        words[-1] = last[:-1]
    return " ".join(words)


class TaskInventoryExtractor:
    """Rule-based extractor for Hindi/Hinglish inventory task messages."""

    def extract(self, message: str) -> TaskInventoryExtraction:
        text = (message or "").strip()
        if not text:
            return TaskInventoryExtraction()

        if self._is_inventory_count_only(text):
            return TaskInventoryExtraction(task_kind="inventory_count")

        task_kind = self._detect_task_kind(text)
        sku = self._extract_sku(text)
        assignee = self._extract_assignee(text, sku)
        quantity = self._extract_quantity(text, sku)
        item = self._extract_item_name(text, sku, quantity, assignee)

        item_or_sku = sku if sku else item

        return TaskInventoryExtraction(
            item_name_or_sku=item_or_sku,
            quantity=quantity,
            assignee_hint=assignee,
            task_kind=task_kind,
        )

    def _is_inventory_count_only(self, text: str) -> bool:
        if not _INVENTORY_COUNT_RE.search(text):
            return False
        if _DELIVERY_RE.search(text) or _ISSUE_RE.search(text):
            return False
        if _SKU_RE.search(text):
            return False
        if _QTY_RE.search(text):
            return False
        assignee = self._extract_assignee(text, self._extract_sku(text))
        if assignee and _ASSIGNEE_KO_RE.search(text):
            ko_match = _ASSIGNEE_KO_RE.search(text)
            after_ko = text[ko_match.end() :] if ko_match else ""
            if _QTY_RE.search(after_ko) or self._extract_item_name(text, None, None, assignee):
                return False
        return True

    def _detect_task_kind(self, text: str) -> Optional[str]:
        has_count = bool(_INVENTORY_COUNT_RE.search(text))
        has_delivery = bool(_DELIVERY_RE.search(text))
        has_issue = bool(_ISSUE_RE.search(text))

        if has_delivery:
            return "delivery"
        if has_issue:
            return "issue"
        if has_count:
            return "inventory_count"
        return None

    def _extract_assignee(self, text: str, sku: Optional[str]) -> Optional[str]:
        mention = _MENTION_RE.search(text)
        if mention:
            name = mention.group(1).strip().lower()
            if name not in _ASSIGNEE_EXCLUDE:
                return _title_name(name)

        ko = _ASSIGNEE_KO_RE.search(text)
        if ko:
            name = ko.group(1).strip().lower()
            if name not in _ASSIGNEE_EXCLUDE:
                return _title_name(name)

        if sku:
            before = _NAME_BEFORE_SKU_RE.match(text.strip())
            if before:
                name = before.group("name").strip().lower()
                if name not in _ASSIGNEE_EXCLUDE:
                    return _title_name(name)

        leading = _NAME_LEADING_RE.match(text.strip())
        if leading:
            rest = leading.group("rest")
            name = leading.group("name").strip().lower()
            first = name.split()[0]
            if first not in _ASSIGNEE_EXCLUDE and self._rest_has_task_content(rest):
                return _title_name(name)

        return None

    def _rest_has_task_content(self, rest: str) -> bool:
        return bool(
            _DELIVERY_RE.search(rest)
            or _ISSUE_RE.search(rest)
            or _ITEM_LABEL_RE.search(rest)
            or _SKU_RE.search(rest)
        )

    def _extract_sku(self, text: str) -> Optional[str]:
        match = _SKU_RE.search(text)
        return match.group(1) if match else None

    def _extract_quantity(self, text: str, sku: Optional[str]) -> Optional[float]:
        sku_span: Optional[tuple[int, int]] = None
        if sku:
            sku_match = re.search(re.escape(sku), text)
            if sku_match:
                sku_span = (sku_match.start(), sku_match.end())

        item_number = _ITEM_NUMBER_RE.search(text)
        item_number_span = item_number.span() if item_number else None

        for match in _QTY_RE.finditer(text):
            if sku_span and sku_span[0] <= match.start() < sku_span[1]:
                continue
            if item_number_span and item_number_span[0] <= match.start() < item_number_span[1]:
                continue
            raw = match.group(1)
            value = float(raw)
            if value >= 0:
                return value
        return None

    def _extract_item_name(
        self,
        text: str,
        sku: Optional[str],
        quantity: Optional[float],
        assignee: Optional[str],
    ) -> Optional[str]:
        if sku:
            return None

        label = _ITEM_LABEL_RE.search(text)
        if label:
            return _normalize_item(label.group(1))

        working = self._strip_assignee_prefix(text, assignee)

        if quantity is not None:
            qty_pattern = re.compile(
                rf"\b{re.escape(str(int(quantity) if quantity == int(quantity) else quantity))}\b"
            )
            qty_match = qty_pattern.search(working)
            if qty_match:
                after_qty = working[qty_match.end() :].strip()
                candidate = self._item_from_fragment(after_qty)
                if candidate:
                    return candidate

        ko_match = _ASSIGNEE_KO_RE.search(text)
        if ko_match:
            after_ko = text[ko_match.end() :].strip()
            if quantity is None:
                candidate = self._item_from_fragment(after_ko)
                if candidate:
                    return candidate

        if assignee and quantity is None:
            candidate = self._item_from_fragment(working)
            if candidate:
                return candidate

        return None

    def _strip_assignee_prefix(self, text: str, assignee: Optional[str]) -> str:
        working = _MENTION_RE.sub(" ", text)
        if not assignee:
            return working.strip()

        parts = assignee.split()
        if parts:
            full_pattern = r"\b" + r"\s+".join(re.escape(part) for part in parts) + r"\b"
            working = re.sub(full_pattern, " ", working, count=1, flags=re.IGNORECASE)
        if len(parts) == 1:
            working = re.sub(
                rf"^{re.escape(parts[0])}\s+",
                " ",
                working,
                count=1,
                flags=re.IGNORECASE,
            )
        working = _ASSIGNEE_KO_RE.sub(" ", working, count=1)
        return working.strip()

    def _item_from_fragment(self, fragment: str) -> Optional[str]:
        cleaned = fragment.strip(" ,.")
        if not cleaned:
            return None
        cleaned = _HINDI_FILLER_RE.sub("", cleaned).strip(" ,.")
        stop = _ITEM_STOP_RE.search(cleaned)
        if stop:
            cleaned = cleaned[: stop.start()].strip(" ,.")
        if not cleaned:
            return None
        words = cleaned.split()
        if len(words) > 4:
            cleaned = " ".join(words[:4])
        normalized = _normalize_item(cleaned)
        if not normalized:
            return None
        if normalized.lower() in _ASSIGNEE_EXCLUDE:
            return None
        if _INVENTORY_COUNT_RE.search(normalized):
            return None
        return normalized


_default_extractor = TaskInventoryExtractor()


def extract_task_inventory(message: str) -> Dict[str, Any]:
    """Extract contract payload; always returns four keys."""
    return _default_extractor.extract(message).model_dump()
