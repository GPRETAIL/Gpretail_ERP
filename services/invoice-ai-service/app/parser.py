import re
from typing import Any


MONEY_RE = r"(?:₹|Rs\.?|INR)?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)"
GSTIN_RE = re.compile(r"\b[0-9]{2}[A-Z0-9]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b", re.I)
DATE_RE = re.compile(r"\b(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b")
INVOICE_NO_RE = re.compile(r"(?:invoice|inv|bill)\s*(?:no|number|#)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9./_-]{2,})", re.I)


def clean_number(value: str) -> float:
    return float(value.replace(",", ""))


def line_text(blocks: list[dict[str, Any]]) -> list[str]:
    return [str(x.get("text", "")).strip() for x in blocks if str(x.get("text", "")).strip()]


def find_near(lines: list[str], pattern: re.Pattern[str]) -> str | None:
    for line in lines:
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
        lower = line.lower()
        if any(label in lower for label in labels):
            matches = re.findall(MONEY_RE, line)
            if matches:
                try:
                    return clean_number(matches[-1])
                except ValueError:
                    pass
    return None


def parse_invoice(blocks: list[dict[str, Any]]) -> dict[str, Any]:
    lines = line_text(blocks)
    supplier_name = None
    for line in lines[:12]:
        lower = line.lower()
        if not any(key in lower for key in ("invoice", "tax invoice", "gstin", "gst no", "bill no", "date")) and len(line) >= 3:
            supplier_name = line
            break

    invoice_number = find_near(lines, INVOICE_NO_RE)
    subtotal = find_amount(lines, ("subtotal", "sub total", "taxable value"))
    cgst = find_amount(lines, ("cgst",))
    sgst = find_amount(lines, ("sgst",))
    igst = find_amount(lines, ("igst",))
    grand_total = find_amount(lines, ("grand total", "invoice total", "net payable", "total amount", "amount payable"))

    return {
        "supplier": {
            "name": supplier_name,
            "gstin": find_gstin(lines),
        },
        "invoice": {
            "number": invoice_number,
            "date": find_date(lines),
        },
        "items": [],
        "tax": {
            "cgst": cgst,
            "sgst": sgst,
            "igst": igst,
        },
        "totals": {
            "subtotal": subtotal,
            "grand_total": grand_total,
        },
    }
