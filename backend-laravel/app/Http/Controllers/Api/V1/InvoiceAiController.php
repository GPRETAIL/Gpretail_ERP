<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\InvoiceOcrService;
use Illuminate\Http\Request;
use Throwable;

class InvoiceAiController extends Controller
{
    public function extract(Request $request, InvoiceOcrService $ocr)
    {
        $request->validate([
            'file' => ['required', 'file', 'max:1024', 'mimes:pdf,jpg,jpeg,png,webp'],
        ]);

        try {
            return response()->json($ocr->extract($request->file('file')));
        } catch (Throwable $e) {
            report($e);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage() ?: 'Invoice OCR failed.',
            ], 422);
        }
    }
}
