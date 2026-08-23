<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class InvoiceOcrService
{
    public function extract(UploadedFile $file): array
    {
        $key = (string) config('ocr_space.key');
        if ($key === '') throw new RuntimeException('Invoice OCR is not configured. Set OCR_SPACE_API_KEY.');

        $response = Http::timeout((int) config('ocr_space.timeout', 120))
            ->connectTimeout((int) config('ocr_space.connect_timeout', 10))
            ->withHeaders(['apikey' => $key])
            ->attach('file', fopen($file->getRealPath(), 'rb'), $file->getClientOriginalName())
            ->post(config('ocr_space.endpoint', 'https://api.ocr.space/parse/image'), [
                'language' => 'eng', 'isTable' => 'true', 'OCREngine' => '3',
                'detectOrientation' => 'true', 'scale' => 'true', 'isOverlayRequired' => 'false',
                'filetype' => $this->fileType($file),
            ]);

        $response->throw();
        $payload = $response->json();
        if (!empty($payload['IsErroredOnProcessing'])) {
            $error = $payload['ErrorMessage'] ?? 'OCR provider could not process the document.';
            throw new RuntimeException(is_array($error) ? implode(' ', $error) : (string) $error);
        }

        $text = collect($payload['ParsedResults'] ?? [])->map(fn (array $page) => trim((string) ($page['ParsedText'] ?? '')))->filter()->implode("\n");
        if ($text === '') throw new RuntimeException('No readable text was extracted from the invoice.');

        return ['success' => true, 'ocr_engine' => 'ocr.space-engine-3', 'parser_status' => 'fields_v1', 'text' => $text, 'invoice' => $this->parseInvoice($text)];
    }

    private function fileType(UploadedFile $file): string
    {
        return match (strtolower($file->getClientOriginalExtension())) { 'pdf' => 'PDF', 'jpg', 'jpeg' => 'JPG', 'png', 'webp' => 'PNG', default => 'JPG' };
    }

    private function parseInvoice(string $text): array
    {
        $lines = collect(preg_split('/\R/u', $text) ?: [])->map(fn ($line) => trim(preg_replace('/\s+/u', ' ', (string) $line)))->filter()->values()->all();

        return [
            'supplier' => ['name' => $this->supplierName($lines), 'gstin' => $this->match($text, '/\b[0-9]{2}[A-Z0-9]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b/i')],
            'invoice' => [
                'number' => $this->invoiceNumber($lines),
                'date' => $this->match($text, '/\b(?:\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}|\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})\b/'),
            ],
            'items' => $this->items($lines),
            'tax' => ['cgst' => $this->amount($lines, ['cgst']), 'sgst' => $this->amount($lines, ['sgst']), 'igst' => $this->amount($lines, ['igst'])],
            'totals' => ['subtotal' => $this->amount($lines, ['subtotal', 'sub total', 'taxable value']), 'grand_total' => $this->amount($lines, ['grand total', 'invoice total', 'net payable', 'amount payable', 'net amount'])],
        ];
    }

    private function supplierName(array $lines): ?string
    {
        foreach (array_slice($lines, 0, 10) as $line) {
            if ($line !== '' && strlen($line) >= 3 && !preg_match('/invoice|tax invoice|gstin|gst no|bill no|date/i', $line)) return $line;
        }
        return null;
    }

    private function invoiceNumber(array $lines): ?string
    {
        $patterns = [
            '/\b(?:invoice|inv)\s*(?:no\.?|number|#)\s*[:\-]?\s*([A-Z0-9][A-Z0-9.\/_-]{2,})/i',
            '/\bbill\s*(?:no\.?|number|#)\s*[:\-]?\s*([A-Z0-9][A-Z0-9.\/_-]{2,})/i',
        ];

        foreach ($patterns as $pattern) {
            $value = $this->match(implode("\n", $lines), $pattern, 1);
            if ($value !== null) return $value;
        }

        return null;
    }

    private function match(string $text, string $pattern, int $group = 0): ?string
    {
        return preg_match($pattern, $text, $m) ? (trim((string) ($m[$group] ?? '')) ?: null) : null;
    }

    private function amount(array $lines, array $labels): ?float
    {
        foreach ($lines as $line) {
            foreach ($labels as $label) {
                if (str_contains(strtolower($line), $label) && preg_match_all('/(?:₹|rs\.?|inr)?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/i', $line, $m) && !empty($m[1])) {
                    return (float) str_replace(',', '', end($m[1]));
                }
            }
        }
        return null;
    }

    private function items(array $lines): array
    {
        $start = null;
        foreach ($lines as $i => $line) {
            if (preg_match('/description|item|product|particular|details/i', $line) && preg_match('/qty|quantity/i', $line) && preg_match('/rate|price|amount/i', $line)) {
                $start = $i + 1;
                break;
            }
        }
        if ($start === null) return [];

        $items = [];
        foreach (array_slice($lines, $start) as $line) {
            if (preg_match('/subtotal|sub total|cgst|sgst|igst|grand total|invoice total|amount payable|net payable/i', $line)) break;
            preg_match_all('/(?<![A-Za-z])\d+(?:,\d{3})*(?:\.\d+)?/', $line, $m);
            $n = array_map(fn ($v) => (float) str_replace(',', '', $v), $m[0] ?? []);
            if (count($n) < 2) continue;

            $description = trim(preg_replace('/\s+/u', ' ', preg_replace('/\d+(?:,\d{3})*(?:\.\d+)?/', '', $line)), " -|:");
            if ($description === '') continue;

            $items[] = [
                'description' => $description,
                'hsn' => null,
                'quantity' => $n[count($n)-3] ?? 1,
                'unit' => null,
                'rate' => $n[count($n)-2],
                'discount' => null,
                'tax_percent' => null,
                'amount' => end($n),
                'confidence' => null,
            ];
        }

        return $items;
    }
}
