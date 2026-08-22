<?php

namespace Tests\Feature;

use App\Services\InvoiceOcrService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class InvoiceOcrServiceTest extends TestCase
{
    public function test_it_extracts_invoice_fields_through_the_hosted_ocr_provider(): void
    {
        config()->set('ocr_space.key', 'test-key');
        config()->set('ocr_space.endpoint', 'https://api.ocr.space/parse/image');

        Http::fake([
            'https://api.ocr.space/*' => Http::response([
                'IsErroredOnProcessing' => false,
                'ParsedResults' => [[
                    'ParsedText' => implode("\n", [
                        'ABC TRADERS', 'Tax Invoice', 'Invoice No: INV-10245',
                        'Date: 22/08/2026', 'GSTIN: 33ABCDE1234F1Z5',
                        'Description Qty Rate Amount', 'Product A 10 500 5000',
                        'Subtotal 5000', 'CGST 450', 'SGST 450', 'Grand Total 5900',
                    ]),
                ]],
            ], 200),
        ]);

        $file = UploadedFile::fake()->create('invoice.jpg', 100, 'image/jpeg');
        $result = app(InvoiceOcrService::class)->extract($file);

        $this->assertTrue($result['success']);
        $this->assertSame('ocr.space-engine-3', $result['ocr_engine']);
        $this->assertSame('33ABCDE1234F1Z5', $result['invoice']['supplier']['gstin']);
        $this->assertSame('INV-10245', $result['invoice']['invoice']['number']);
        $this->assertSame('22/08/2026', $result['invoice']['invoice']['date']);
        $this->assertCount(1, $result['invoice']['items']);
        $this->assertSame(5900.0, $result['invoice']['totals']['grand_total']);

        Http::assertSent(fn ($request) => $request->hasHeader('apikey', 'test-key'));
    }
}
