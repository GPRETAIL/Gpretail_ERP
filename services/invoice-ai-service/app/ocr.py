from pathlib import Path
from typing import Any


_ocr = None


def _get_ocr():
    global _ocr
    if _ocr is None:
        from paddleocr import PaddleOCR

        _ocr = PaddleOCR(
            lang="en",
            use_doc_orientation_classify=True,
            use_doc_unwarping=True,
            use_textline_orientation=True,
        )
    return _ocr


def _flatten_ocr_result(result: Any) -> list[dict[str, Any]]:
    """Normalize PaddleOCR output into a stable service response."""
    rows: list[dict[str, Any]] = []
    for page in result:
        payload = getattr(page, "json", None)
        if callable(payload):
            payload = payload()
        if not isinstance(payload, dict):
            continue

        data = payload.get("res", payload)
        texts = data.get("rec_texts", []) or []
        scores = data.get("rec_scores", []) or []
        boxes = data.get("rec_polys", data.get("rec_boxes", [])) or []

        for index, text in enumerate(texts):
            rows.append(
                {
                    "text": str(text),
                    "confidence": float(scores[index]) if index < len(scores) else None,
                    "box": boxes[index].tolist() if index < len(boxes) and hasattr(boxes[index], "tolist") else (boxes[index] if index < len(boxes) else None),
                }
            )
    return rows


def extract_document(path: str, content_type: str) -> dict[str, Any]:
    ocr = _get_ocr()
    result = ocr.predict(input=path)
    text_blocks = _flatten_ocr_result(result)

    average_confidence = None
    scores = [x["confidence"] for x in text_blocks if x["confidence"] is not None]
    if scores:
        average_confidence = round(sum(scores) / len(scores), 4)

    return {
        "success": True,
        "document_type": "invoice",
        "content_type": content_type,
        "ocr_engine": "paddleocr",
        "confidence": average_confidence,
        "text_blocks": text_blocks,
        "invoice": {
            "supplier": {},
            "invoice": {},
            "items": [],
            "tax": {},
            "totals": {},
        },
        "parser_status": "ocr_only",
    }
