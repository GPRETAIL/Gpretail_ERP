<?php

namespace Tests\Feature\Warehouse;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** A direct purchase adds its quantities to stock; editing it moves the difference and deleting takes it back out. */
class DirectPurchaseStockTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    private int $supplierId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(1);
        Sanctum::actingAs($this->fixture['user']);
        $this->supplierId = $this->postJson('/api/suppliers', ['name' => 'Direct Mill', 'code' => 'DP-MILL'])->assertCreated()->json('data.id');
    }

    private function productStock(): float
    {
        return (float) DB::table('stocks')->where('product_id', $this->fixture['items'][0]['productId'])->sum('quantity');
    }

    /** The shape DirectPurchaseEntry.jsx saves. */
    private function payload(float $qty, string $invoiceNo = 'DP-BILL-1'): array
    {
        $amount = $qty * 60;

        return ['companyId' => $this->fixture['store']->id, 'supplierId' => $this->supplierId, 'purchaseType' => 'Direct', 'invoiceNo' => $invoiceNo,
            'invoiceDate' => now()->toDateString(), 'igst' => false, 'taxLines' => [], 'billValue' => $amount, 'otherCharges' => 0, 'billTax' => 0,
            'purDiscount' => 0, 'total' => $amount,
            'items' => [['sNo' => 1, 'productId' => $this->fixture['items'][0]['productId'], 'productName' => 'TEMP Performance Item 1',
                'qty' => $qty, 'cost' => 60, 'discount' => 0, 'marginPerc' => 0, 'price' => 100, 'amount' => $amount, 'jumpDetails' => []]]];
    }

    /** What BarcodeGeneration.jsx posts for a direct purchase's lines, then its "Save" button. */
    private function generateBarcodesAndSave(int $id): void
    {
        $line = $this->getJson("/api/direct-purchases/$id")->assertOk()->json('data.items.0');
        $this->postJson('/api/barcodes/generate', ['directPurchaseId' => $id, 'codeType' => 'barcode', 'items' => [[
            'sourceItemId' => $line['id'], 'directPurchaseItemId' => $line['id'], 'productId' => $line['product_id'], 'productName' => 'TEMP Performance Item 1',
            'qty' => $line['qty'], 'cost' => 60, 'marginPerc' => 0, 'sellingPrice' => 100, 'mrp' => 100, 'discountPerc' => 0, 'finalPrice' => 100,
        ]]])->assertSuccessful();
        $this->putJson("/api/direct-purchases/$id", ['invoiceWorkflowStatus' => 'invoice_progress'])->assertOk();
    }

    public function test_the_screen_flow_purchase_then_barcodes_then_save_adds_the_stock_once(): void
    {
        $start = $this->productStock();
        $id = $this->postJson('/api/direct-purchases', $this->payload(25))->assertCreated()->json('data.id');
        $this->assertSame($start, $this->productStock(), 'no stock until the goods are labelled');

        $this->generateBarcodesAndSave($id);
        $this->assertSame($start + 25, $this->productStock(), 'labelled goods are in stock');

        $this->putJson("/api/direct-purchases/$id", ['invoiceWorkflowStatus' => 'invoice_completed'])->assertOk();
        $this->assertSame($start + 25, $this->productStock(), 'saving again does not add it twice');
    }

    public function test_direct_purchase_adds_stock_editing_moves_the_difference_and_deleting_removes_it(): void
    {
        $start = $this->productStock();

        $id = $this->postJson('/api/direct-purchases', $this->payload(25))->assertCreated()->json('data.id');
        $this->generateBarcodesAndSave($id);
        $this->assertSame($start + 25, $this->productStock(), 'a labelled direct purchase adds its quantity to stock');

        $this->putJson("/api/direct-purchases/$id", $this->payload(10))->assertOk();
        $this->assertSame($start + 10, $this->productStock(), 'editing the quantity moves only the difference');

        $this->deleteJson("/api/direct-purchases/$id")->assertOk();
        $this->assertSame($start, $this->productStock(), 'deleting the purchase takes its stock back out');
    }
}
