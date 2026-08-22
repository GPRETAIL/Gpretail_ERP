<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class InvoiceAiController extends Controller
{
    public function extract(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'max:15360', 'mimes:pdf,jpg,jpeg,png,webp,tif,tiff'],
        ]);

        $baseUrl = rtrim((string) config('services.invoice_ai.url'), '/');
        $token = (string) config('services.invoice_ai.token');

        if ($baseUrl === '') {
            return response()->json([
                'success' => false,
                'message' => 'Invoice AI service is not configured.',
            ], 503);
        }

        try {
            $client = Http::timeout((int) config('services.invoice_ai.timeout', 120))
                ->connectTimeout((int) config('services.invoice_ai.connect_timeout', 10))
                ->acceptJson();

            if ($token !== '') {
                $client = $client->withHeaders(['X-API-Key' => $token]);
            }

            $response = $client
                ->attach('file', fopen($request->file('file')->getRealPath(), 'r'), $request->file('file')->getClientOriginalName())
                ->post($baseUrl . '/api/v1/invoices/extract');

            if ($response->failed()) {
                Log::warning('Invoice AI extraction failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Invoice OCR service could not process the document.',
                    'service_status' => $response->status(),
                ], 502);
            }

            return response()->json($response->json(), $response->status());
        } catch (\Throwable $e) {
            Log::error('Invoice AI service unavailable', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Invoice OCR service is unavailable.',
            ], 503);
        }
    }
}
