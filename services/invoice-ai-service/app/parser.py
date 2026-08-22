import re
from typing import Any

MONEY_RE = r"(?:₹|Rs\.?|INR)?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)"
GSTIN_RE = re.compile(r"\b[0-9]{2}[A-Z0-9]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b", re.I)
DATE_RE = re.compile(r"\b(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b")
INVOICE_NO_RE = re.compile(r"\b(?:invoice|bill)\b\s*(?:no|number|#)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9./_-]{2,})", re.I)
INV_SHORT_RE = re.compile(r"\binv\.?\b\s*(?:no|number|#)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9./_-]{2,})", re.I)
ITEM_HEADER_RE = re.compile(r"\b(?:description|item|product|particular|details)\b.*\b(?:qty|quantity)\b.*\b(?:rate|price)\b", re.I)
TOTAL_LABELS = ("grand total", "invoice total", "net payable", "total amount", "amount payable", "net amount")


def clean_number(value: str) -> float:
    return float(value.replace(",", ""))


def line_text(blocks: list[dict[str, Any]]) -> list[str]:
    return [str(x.get("text", "")).strip() for x in blocks if str(x.get("text", "")).strip()]


def find_near(lines: list[str], patterns: tuple[re.Pattern[str], ...]) -> str | None:
    for line in lines:
        for pattern in patterns:
            match = pattern.search(line)
            if match:
                return match.group(1)
    return None


def find_gstin(lines: list[str]) -> str | None:
    for line in lines:
        match = GSTIN_RE.search(line)
        if match:
            return match.group(0).upper()
    return None


def find_date(lines: list[str]) -> str | None:
    for line in lines:
        match = DATE_RE.search(line)
        if match:
            return match.group(0)
    return None


def find_amount(lines: list[str], labels: tuple[str, ...]) -> float | None:
    for line in lines:
        if any(label in line.lower() for label in labels):
            matches = re.findall(MONEY_RE, line)
            if matches:
                try:
                    return clean_number(matches[-1])
                except ValueError:
                    pass
    return None


def parse_number_tokens(line: str) -> list[float]:
    values = re.findall(r"(?<![A-Za-z])\d+(?:,\d{3})*(?:\.\d+)?", line)
    return [clean_number(v) for v in values]


def parse_items(lines: list[str]) -> list[dict[str, Any]]:
    start = None
    for i, line in enumerate(lines):
        if ITEM_HEADER_RE.search(line):
            start = i + 1
            break
    if start is None:
        return []

    items: list[dict[str, Any]] = []
    stop_words = ("subtotal", "sub total", "cgst", "sgst", "igst", "grand total", "invoice total", "amount payable", "net payable")
    for line in lines[start:]:
        lower = line.lower()
        if any(word in lower for word in stop_words):
            break
        nums = parse_number_tokens(line)
        if len(nums) < 2 or len(line) < 3:
            continue
        amount = nums[-1]
        rate = nums[-2]
        quantity = nums[-3] if len(nums) >= 3 else 1
        description = line
        for token in re.findall(r"\d+(?:,\d{3})*(?:\.\d+)?", line):
            description = re.sub(rf"(?<![A-Za-z]){re.escape(token)}(?![A-Za-z])", "", description, count=1)
        description = re.sub(r"\s+", " ", description).strip(" -|:")
        if not description:
            continue
        items.append({
            "description": description,
            "hsn": None,
            "quantity": quantity,
            "unit": None,
            "rate": rate,
            "discount": None,
            "tax_percent": None,
            "amount": amount,
            "confidence": None,
        })
    return items


def parse_invoice(blocks: list[dict[str, Any]]) -> dict[str, Any]:
    lines = line_text(blocks)
    supplier_name = None
    for line in lines[:12]:
        lower = line.lower()
        if not any(key in lower for key in ("invoice", "tax invoice", "gstin", "gst no", "bill no", "date")) and len(line) >= 3:
            supplier_name = line
            break

    return {
        "supplier": {"name": supplier_name, "gstin": find_gstin(lines)},
        "invoice": {
            "number": find_near(lines, (INVOICE_NO_RE, INV_SHORT_RE)),
            "date": find_date(lines),
        },
        "items": parse_items(lines),
        "tax": {
            "cgst": find_amount(lines, ("cgst",)),
            "sgst": find_amount(lines, ("sgst",)),
            "igst": find_amount(lines, ("igst",)),
        },
        "totals": {
            "subtotal": find_amount(lines, ("subtotal", "sub total", "taxable value")),
            "grand_total": find_amount(lines, TOTAL_LABELS),
        },
    }
