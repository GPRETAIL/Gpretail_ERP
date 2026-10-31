<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Stock;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WarehouseLrInventoryFlowTest extends TestCase
{
    use RefreshDatabase;

    private int $supplier;

    private int $product;

    protected function setUp(): void
    {
        parent::setUp();
        // Barcode numbering uses MariaDB's REGEXP; give the SQLite test database the same function.
        DB::connection()->getPdo()->sqliteCreateFunction('regexp', fn ($pattern, $value) => (int) preg_match('/'.str_replace('/', '\/', $pattern).'/u', (string) $value), 2);
        $store = Store::create(['name' => 'LR Store', 'code' => 'LR-STORE', 'is_active' => true]);
        Sanctum::actingAs(User::create(['name' => 'LR Admin', 'username' => 'lr-admin', 'email' => 'lr@example.test',
            'password' => 'secret', 'role' => 'admin', 'store_id' => $store->id, 'is_active' => true]));
        $this->withHeader('X-Company-Scope-Id', (string) $store->id);
        $this->supplier = $this->postJson('/api/suppliers', ['name' => 'Mill', 'code' => 'LR-MILL'])->assertCreated()->json('data.id');
        $this->product = Product::create(['company_id' => $store->id, 'name' => 'Cotton Shirt', 'code' => 'LR-SHIRT', 'selling_mode' => 'PIECE', 'is_active' => true])->id;
    }

    /** LR entry + its commercial invoice, as the warehouse screens create them. */
    private function lr(string $no): array
    {
        $lr = $this->postJson('/api/transport-entries', ['lr_no' => $no])->assertCreated()->json('data.id');
        $invoice = $this->postJson('/api/invoices', ['transportEntryId' => $lr, 'supplierId' => $this->supplier, 'invoiceNo' => "BILL-$no",
            'invoiceDate' => '2026-10-31', 'entryDate' => '2026-10-31', 'pieces' => 5, 'baseAmount' => 1000, 'netAmount' => 1050])->assertCreated()->json('data.id');

        return [$lr, $invoice];
    }

    /** The InventoryEntry.jsx payload: one product, size/design rows without a product_id. */
    private function entry(int $lr, int $invoice, array $rows): array
    {
        return ['transportEntryId' => $lr, 'invoiceId' => $invoice, 'supplierId' => $this->supplier, 'productId' => $this->product,
            'productName' => 'Cotton Shirt', 'hsnCode' => '6205', 'workingCharge' => '12', 'buyingPrice' => 200, 'total' => 1050,
            'items' => $rows];
    }

    private function row(string $size, int $qty): array
    {
        return ['sNo' => 1, 'size' => $size, 'designNo' => 'D-7', 'qty' => $qty, 'cost' => 200, 'pDis' => 0, 'marginPerc' => 50,
            'margin' => 100, 'mrp' => 499, 'price' => 300, 'amount' => 200 * $qty, 'sellingPrice' => 399, 'discountPerc' => 0, 'finalPrice' => 399];
    }

    public function test_each_lr_saves_and_lists_only_its_own_invoice_inventory_and_barcodes(): void
    {
        [$lrA, $invoiceA] = $this->lr('LR-A');
        [$lrB, $invoiceB] = $this->lr('LR-B');
        $entryA = $this->postJson('/api/inventory-entries', $this->entry($lrA, $invoiceA, [$this->row('M', 3), $this->row('L', 2)]))
            ->assertCreated()->assertJsonPath('data.transport_entry_id', $lrA)->json('data.id');
        $this->postJson('/api/inventory-entries', $this->entry($lrB, $invoiceB, [$this->row('XL', 4)]))->assertCreated();

        $this->assertSame([$invoiceA], array_column($this->getJson("/api/invoices?transport_entry_id=$lrA")->assertOk()->json('data'), 'id'));
        $this->assertSame([$entryA], array_column($this->getJson("/api/inventory-entries?transport_entry_id=$lrA")->assertOk()->json('data'), 'id'));

        // What the inventory form (edit mode) and barcode generation read back.
        $shown = $this->getJson("/api/inventory-entries/$entryA")->assertOk()
            ->assertJsonPath('data.invoice_id', $invoiceA)->assertJsonPath('data.product.name', 'Cotton Shirt')
            ->assertJsonPath('data.hsn_code', '6205')->assertJsonPath('data.working_charge', '12')
            ->assertJsonPath('data.items.0.size', 'M')->assertJsonPath('data.items.0.design_no', 'D-7')
            ->assertJsonPath('data.items.0.mrp', 499)->assertJsonPath('data.items.0.final_price', 399)->json('data');
        $this->assertEquals(5, Stock::sum('quantity') - 4);

        $items = array_map(fn ($item) => ['inventoryEntryId' => $entryA, 'inventoryItemId' => $item['id'], 'productId' => $this->product,
            'productName' => 'Cotton Shirt', 'size' => $item['size'], 'designNo' => 'D-7', 'qty' => $item['qty'], 'mrp' => 499,
            'sellingPrice' => 399, 'finalPrice' => 399], $shown['items']);
        $this->postJson('/api/barcodes/generate', ['transportEntryId' => $lrA, 'items' => $items])->assertSuccessful();
        $this->assertCount(5, $this->getJson("/api/barcodes?transport_entry_id=$lrA&limit=50")->assertOk()->json('data'));
        $this->assertCount(0, $this->getJson("/api/barcodes?transport_entry_id=$lrB&limit=50")->assertOk()->json('data'));

        // Printed stickers point at these rows, so the rows and the entry stay put.
        $this->putJson("/api/inventory-entries/$entryA", $this->entry($lrA, $invoiceA, [$this->row('M', 1)]))->assertUnprocessable();
        $this->deleteJson("/api/inventory-entries/$entryA")->assertUnprocessable();
        $this->assertEquals(9, Stock::sum('quantity'));
    }

    public function test_editing_before_barcodes_replaces_rows_and_their_stock_and_rejects_foreign_links(): void
    {
        [$lrA, $invoiceA] = $this->lr('LR-C');
        [, $invoiceB] = $this->lr('LR-D');
        $id = $this->postJson('/api/inventory-entries', $this->entry($lrA, $invoiceA, [$this->row('M', 3)]))->assertCreated()->json('data.id');
        $this->putJson("/api/inventory-entries/$id", [...$this->entry($lrA, $invoiceA, [$this->row('S', 2)]), 'workingCharge' => '15'])->assertOk()
            ->assertJsonPath('data.items.0.size', 'S')->assertJsonPath('data.working_charge', '15')->assertJsonPath('data.hsn_code', '6205');
        $this->assertEquals(2, Stock::sum('quantity'));

        $this->postJson('/api/inventory-entries', $this->entry($lrA, $invoiceB, [$this->row('M', 1)]))->assertUnprocessable()->assertJsonValidationErrors('invoice_id');
        $this->postJson('/api/inventory-entries', [...$this->entry($lrA, $invoiceA, [$this->row('M', 1)]), 'productId' => 999999])->assertUnprocessable();
        $this->deleteJson("/api/inventory-entries/$id")->assertOk();
        $this->assertEquals(0, Stock::sum('quantity'));
    }
}
