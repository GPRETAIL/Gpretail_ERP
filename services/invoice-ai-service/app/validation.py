from typing import Any


def validate_invoice(invoice: dict[str, Any]) -> dict[str, Any]:
    tax = invoice.get("tax", {})
    totals = invoice.get("totals", {})
    subtotal = totals.get("subtotal")
    grand_total = totals.get("grand_total")

    tax_values = [tax.get("cgst"), tax.get("sgst"), tax.get("igst")]
    tax_total = round(sum(v for v in tax_values if isinstance(v, (int, float))), 2)

    warnings: list[str] = []
    if not invoice.get("supplier", {}).get("name"):
        warnings.append("Supplier name was not confidently identified")
    if not invoice.get("invoice", {}).get("number"):
        warnings.append("Invoice number was not confidently identified")
    if not invoice.get("invoice", {}).get("date"):
        warnings.append("Invoice date was not confidently identified")
    if not invoice.get("items"):
        warnings.append("No line items were extracted; manual review required")

    arithmetic_status = "not_checkable"
    if isinstance(subtotal, (int, float)) and isinstance(grand_total, (int, float)):
        expected = round(subtotal + tax_total, 2)
        arithmetic_status = "pass" if abs(expected - grand_total) <= 1 else "warning"
        if arithmetic_status == "warning":
            warnings.append("Subtotal + extracted tax does not reconcile with grand total")

    return {
        "status": "review_required" if warnings else "pass",
        "arithmetic_status": arithmetic_status,
        "tax_total": tax_total,
        "warnings": warnings,
    }
