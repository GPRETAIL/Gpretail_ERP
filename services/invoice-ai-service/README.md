# Vynerix Invoice AI Service

Standalone OCR service for the Laravel + React + MariaDB ERP.

## Stack

- Python 3.11
- FastAPI
- PaddleOCR
- Docker

## Run locally

```bash
docker compose up --build
```

Health check:

```text
GET http://localhost:8080/health
```

Invoice extraction:

```bash
curl -X POST http://localhost:8080/api/v1/invoices/extract \
  -F "file=@invoice.pdf"
```

The current response exposes normalized OCR text blocks and confidence. Invoice field/table parsing is intentionally separated from OCR so it can be improved without changing the API contract.
