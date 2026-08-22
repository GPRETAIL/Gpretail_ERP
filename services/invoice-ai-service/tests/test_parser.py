from app.parser import parse_invoice
from app.validation import validate_invoice


def blocks(*lines):
    return [{"text": line, "confidence": 0.99, "box": None} for line in lines]


def test_parse_indian_invoice_fields_and_items():
    invoice = parse_invoice(blocks(
        "ABC TRADERS",
        "Tax Invoice",
        "Invoice No: INV-10245",
        "Date: 22/08/2026",
        "GSTIN: 33ABCDE1234F1Z5",
        "Description Qty Rate Amount",
        "Product A 10 500 5000",
        "Product B 2 250 500",
        "Subtotal 5500",
        "CGST 495",
        "SGST 495",
        "Grand Total 6490",
    ))

    assert invoice["supplier"]["gstin"] == "33ABCDE1234F1Z5"
    assert invoice["invoice"]["number"] == "INV-10245"
    assert invoice["invoice"]["date"] == "22/08/2026"
    assert len(invoice["items"]) == 2
    assert invoice["items"][0]["quantity"] == 10
    assert invoice["items"][0]["rate"] == 500
    assert invoice["totals"]["grand_total"] == 6490


def test_validation_reconciles_total():
    result = validate_invoice({
        "supplier": {"name": "ABC", "gstin": "33ABCDE1234F1Z5"},
        "invoice": {"number": "INV-1", "date": "22/08/2026"},
        "items": [{"description": "Product A"}],
        "tax": {"cgst": 495, "sgst": 495, "igst": 0},
        "totals": {"subtotal": 5500, "grand_total": 6490},
    })
    assert result["arithmetic_status"] == "pass"
    assert result["status"] == "pass"
