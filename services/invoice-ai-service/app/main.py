from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pathlib import Path
import tempfile

from .ocr import extract_document

app = FastAPI(title="Vynerix Invoice AI Service", version="0.1.0")

ALLOWED_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/webp",
}


@app.get("/health")
def health():
    return {"status": "ok", "service": "invoice-ai-service"}


@app.get("/ready")
def ready():
    return {"status": "ready", "ocr": "paddleocr"}


@app.post("/api/v1/invoices/extract")
async def extract_invoice(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported invoice file type")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty invoice file")

    suffix = Path(file.filename or "invoice").suffix.lower() or ".bin"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(data)
        path = tmp.name

    try:
        result = extract_document(path, file.content_type)
        return JSONResponse(content=result)
    finally:
        Path(path).unlink(missing_ok=True)
