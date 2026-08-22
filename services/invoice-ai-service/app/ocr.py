from pathlib import Path
from typing import Any
import tempfile

from .parser import parse_invoice

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
            box = boxes[index] if index < len(boxes) else None
            if hasattr(box, "tolist"):
                box = box.tolist()
            rows.append({
                "text": str(text),
                "confidence": float(scores[index]) if index < len(scores) else None,
                "box": box,
            })
    return rows


def _render_pdf_pages(path: str) -> list[str]:
    import fitz

    output_paths: list[str] = []
    document = fitz.open(path)
    try:
        for page_index, page in enumerate(document):
            pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            temp = tempfile.NamedTemporaryFile(delete=False, suffix=f"-page-{page_index + 1}.png")
            temp.close()
            pixmap.save(temp.name)
            output_paths.append(temp.name)
    finally:
        document.close()
    return output_paths


def extract_document(path: str, content_type: str) -> dict[str, Any]:
    ocr = _get_ocr()
    input_paths = _render_pdf_pages(path) if content_type == "application/pdf" else [path]

    try:
        text_blocks: list[dict[str, Any]] = []
        for input_path in input_paths:
            result = ocr.predict(input=input_path)
            text_blocks.extend(_flatten_ocr_result(result))
    finally:
        if content_type == "application/pdf":
            for input_path in input_paths:
                Path(input_path).unlink(missing_ok=True)

    scores = [x["confidence"] for x in text_blocks if x["confidence"] is not None]
    average_confidence = round(sum(scores) / len(scores), 4) if scores else None
    invoice = parse_invoice(text_blocks)

    return {
        "success": True,
        "document_type": "invoice",
        "content_type": content_type,
        "ocr_engine": "paddleocr",
        "confidence": average_confidence,
        "page_count": len(input_paths),
        "text_blocks": text_blocks,
        "invoice": invoice,
        "parser_status": "fields_v2",
    }
