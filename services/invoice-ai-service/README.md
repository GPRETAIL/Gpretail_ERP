# Vynerix Invoice AI Service

Standalone OCR service for the Laravel + React + MariaDB ERP.

## Production architecture

Hostinger Premium runs only the React frontend, Laravel API and MariaDB. This service runs separately on a Linux VPS/cloud server with Python + FastAPI + PaddleOCR.

```text
React → Laravel → HTTPS → invoice-ai-service → PaddleOCR
                           ↓
                         JSON
                           ↓
                         Laravel → MariaDB
```

The OCR service must never connect directly to the ERP database.

## Stack

- Python 3.11
- FastAPI
- PaddleOCR
- PyMuPDF for PDF page rendering
- OpenCV headless
- Uvicorn
- systemd + Nginx for production

Docker files remain optional developer tooling only; Docker is not required for production deployment.

## Local non-Docker run

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 127.0.0.1 --port 8080
```

Health:

```text
GET http://127.0.0.1:8080/health
```

Invoice extraction:

```bash
curl -X POST http://127.0.0.1:8080/api/v1/invoices/extract \
  -H "X-API-Key: YOUR_SECRET" \
  -F "file=@invoice.pdf"
```

## Production

1. Create `/opt/vynerix/invoice-ai-service`.
2. Create a Python virtual environment and install `requirements.txt`.
3. Put the service secret in `.env` as `INVOICE_AI_API_KEY`.
4. Install `deploy/systemd/invoice-ai.service` and enable it.
5. Put `deploy/nginx/invoice-ai.conf` in Nginx and configure TLS for the OCR hostname.
6. Set `INVOICE_AI_URL` and `INVOICE_AI_TOKEN` in Laravel's production `.env`.
7. Run Laravel `config:cache` after changing environment values.

## API

`POST /api/v1/invoices/extract` accepts PDF/JPEG/PNG/TIFF/WEBP up to 15 MB and returns OCR blocks, invoice fields, line-item candidates, confidence and validation results.

The API is intentionally stateless. Laravel remains responsible for supplier/product matching, purchase invoice creation, stock updates and MariaDB writes.
