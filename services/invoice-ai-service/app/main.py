import hmac
import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from .ocr import extract_document
from .validation import validate_invoice

app = FastAPI(title="Vynerix Invoice AI Service", version="0.3.0")

ALLOWED_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/webp",
}
MAX_FILE_BYTES = 15 * 1024 * 1024


def require_api_key(x_api_key: str | None) -> None:
    expected = os.getenv("INVOICE_AI_API_KEY", "").strip()
    if expected and not hmac.compare_digest(x_api_key or "", expected):
        raise HTTPException(status_code=401, detail="Invalid OCR service API key")


@app.get("/health")
def health():
    return {"status": "ok", "service": "invoice-ai-service"}


@app.get("/ready")
def ready():
    return {"status": "ready", "ocr": "paddleocr", "parser": "invoice-fields-v2"}


@app.post("/api/v1/invoices/extract")
async def extract_invoice(
    file: UploadFile = File(...),
    x_api_key: str | None = Header(default=None),
):
    require_api_key(x_api_key)

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported invoice file type")

    data = await file.read(MAX_FILE_BYTES + 1)
    if not data:
        raise HTTPException(status_code=400, detail="Empty invoice file")
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="Invoice file exceeds 15 MB limit")

    suffix = Path(file.filename or "invoice").suffix.lower() or ".bin"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(data)
        path = tmp.name

    try:
        result = extract_document(path, file.content_type)
        result["validation"] = validate_invoice(result["invoice"])
        return JSONResponse(content=result)
    finally:
        Path(path).unlink(missing_ok=True)
