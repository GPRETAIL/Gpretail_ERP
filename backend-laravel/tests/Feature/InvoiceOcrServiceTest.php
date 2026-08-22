<?php

use App\Services\InvoiceOcrService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;

it('extracts invoice fields through the hosted OCR provider', function () {
    config()->set('ocr_space.key', 'test-key');
    config()->set('ocr_space.endpoint', 'https://api.ocr.space/parse/image');

    Http::fake([
        'https://api.ocr.space/*' => Http::response([
            'IsErroredOnProcessing' => false,
            'ParsedResults' => [[
                'ParsedText' => implode("\n", [
                    'ABC TRADERS',
                    'Tax Invoice',
                    'Invoice No: INV-10245',
                    'Date: 22/08/2026',
                    'GSTIN: 33ABCDE1234F1Z5',
                    'Description Qty Rate Amount',
                    'Product A 10 500 5000',
                    'Subtotal 5000',
                    'CGST 450',
                    'SGST 450',
                    'Grand Total 5900',
                ]),
            ]],
        ], 200),
    ]);

    $file = UploadedFile::fake()->create('invoice.jpg', 100, 'image/jpeg');
    $result = app(InvoiceOcrService::class)->extract($file);

    expect($result['success'])->toBeTrue()
        ->and($result['ocr_engine'])->toBe('ocr.space-engine-3')
        ->and($result['invoice']['supplier']['gstin'])->toBe('33ABCDE1234F1Z5')
        ->and($result['invoice']['invoice']['number'])->toBe('INV-10245')
        ->and($result['invoice']['invoice']['date'])->toBe('22/08/2026')
        ->and($result['invoice']['items'])->toHaveCount(1)
        ->and($result['invoice']['totals']['grand_total'])->toBe(5900.0);

    Http::assertSent(fn ($request) => $request->hasHeader('apikey', 'test-key'));
});
