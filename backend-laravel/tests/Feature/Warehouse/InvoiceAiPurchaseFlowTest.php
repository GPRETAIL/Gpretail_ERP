<?php

namespace Tests\Feature\Warehouse;

use App\Models\Barcode;
use App\Models\Category;
use App\Models\InventoryEntry;
use App\Models\Product;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\SyncOutboxEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** AI Purchase Invoice Inwarding: saving a reviewed invoice. */
class InvoiceAiPurchaseFlowTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();
        $this->store = Store::create(['name' => 'Main Store', 'code' => 'STR-001']);
        Sanctum::actingAs(User::create(['name' => 'Owner', 'username' => 'owner', 'email' => 'owner@example.com', 'password' => 'secret123',
            'role' => 'admin', 'store_id' => $this->store->id, 'is_active' => true]));
    }

    private function save(array $overrides = [])
    {
        return $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)->postJson('/api/v1/invoice-ai/process-flow', array_replace([
            'supplier' => ['name' => 'Fresh Textiles', 'gstin' => '33AAAAA0000A1Z5', 'phone' => '9876543210', 'address' => 'Main Bazaar, Retail Street'],
            'invoice' => ['invoice_no' => 'FT-1', 'subtotal' => 100, 'tax_amount' => 5],
            'transport' => ['transport_name' => 'Fast Cargo'],
            'items' => [['description' => 'Cotton Shirt', 'is_new_product' => true, 'quantity' => 2, 'rate' => 100]],
            'generate_barcodes' => true,
            'code_type' => 'code',
        ], $overrides));
    }

    public function test_a_new_supplier_product_and_transport_are_numbered_by_their_record_number(): void
    {
        $category = tap((new Category)->forceFill(['name' => 'Shirts', 'code' => 'SHIRTS', 'store_id' => $this->store->id]))->save();
        $this->save()->assertCreated();

        $supplier = Supplier::where('name', 'Fresh Textiles')->firstOrFail();
        $this->assertSame('SUP'.$supplier->id, $supplier->code);
        $product = Product::where('name', 'Cotton Shirt')->firstOrFail();
        $this->assertSame(['PRD'.$product->id, 'PRD'.$product->id], [$product->code, $product->barcode]);
        $this->assertSame($category->id, $product->category_id); // The store's own category, never a fixed id.
        $this->assertMatchesRegularExpression('/^TRP\d+$/', \App\Models\Transport::where('name', 'Fast Cargo')->value('code'));
        $this->assertSame('code', Barcode::where('product_id', $product->id)->value('code_type'));
        $this->assertNotSame('', (string) InventoryEntry::value('entry_no'));
        // The stickers are found for the LR (Barcode Search opened from the success screen).
        $transportEntryId = InventoryEntry::value('transport_entry_id');
        $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)->getJson('/api/barcodes?transport_entry_id='.$transportEntryId)
            ->assertOk()->assertJsonPath('data.0.product_id', $product->id);
    }

    public function test_a_supplier_keeps_the_code_it_was_given(): void
    {
        $this->assertSame('SUP-7', Supplier::create(['name' => 'Given', 'code' => 'SUP-7', 'store_id' => $this->store->id])->code);
    }

    public function test_new_prices_use_the_margin_and_the_margin_is_remembered_for_the_store(): void
    {
        $this->getJson('/api/v1/invoice-ai/margins')->assertOk()->assertJsonPath('data.selling_percent', 25)->assertJsonPath('data.mrp_percent', 35);

        $this->save(['margins' => ['selling_percent' => 40, 'mrp_percent' => 60]])->assertCreated();

        $product = Product::where('name', 'Cotton Shirt')->firstOrFail();
        $this->assertEquals([140.0, 160.0], [(float) $product->selling_price, (float) $product->mrp]);
        $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)->getJson('/api/v1/invoice-ai/margins')
            ->assertJsonPath('data.selling_percent', 40)->assertJsonPath('data.mrp_percent', 60);
    }

    public function test_an_existing_product_takes_the_invoices_new_prices(): void
    {
        $product = Product::create(['company_id' => $this->store->id, 'name' => 'Linen Shirt', 'code' => 'LINEN', 'cost_price' => 200,
            'selling_price' => 300, 'mrp' => 350, 'is_active' => true]);

        $response = $this->save(['items' => [['description' => 'Linen Shirt', 'product_id' => $product->id, 'is_new_product' => false,
            'quantity' => 1, 'rate' => 240, 'selling_price' => 340, 'mrp' => 399]]])->assertCreated();

        $product->refresh();
        $this->assertEquals([340.0, 399.0], [(float) $product->selling_price, (float) $product->mrp]);
        $response->assertJsonPath('data.prices_updated.0.product_id', $product->id);
    }

    public function test_the_saved_purchase_is_queued_for_sync_but_reading_an_invoice_is_not(): void
    {
        config(['sync.node_role' => 'local']);
        $this->save()->assertCreated();

        $this->assertSame(['/v1/invoice-ai/process-flow'], SyncOutboxEvent::pluck('path')->map(fn ($path) => '/'.ltrim(preg_replace('#^/?api/#', '', $path), '/'))->all());
    }

    public function test_an_existing_product_with_sizes_needs_the_lines_size_and_its_stock_goes_to_that_size(): void
    {
        $product = Product::create(['company_id' => $this->store->id, 'name' => 'Sized Shirt', 'code' => 'SIZED', 'is_active' => true]);
        $variant = tap((new \App\Models\ProductVariant)->forceFill(['product_id' => $product->id, 'store_id' => $this->store->id, 'sku' => 'SIZED-M', 'barcode' => 'SIZED-M', 'design_no' => 'D-1']))->save();
        $line = ['description' => 'Sized Shirt', 'product_id' => $product->id, 'is_new_product' => false, 'quantity' => 3, 'rate' => 100];

        $this->save(['items' => [$line]])->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'choose its size'));

        $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)->getJson('/api/v1/invoice-ai/product-variants/'.$product->id)
            ->assertOk()->assertJsonPath('data.0.id', $variant->id)->assertJsonPath('data.0.label', 'Design D-1 · SIZED-M');

        $this->save(['items' => [[...$line, 'variant_id' => $variant->id]]])->assertCreated();
        $this->assertEquals(3.0, (float) \Illuminate\Support\Facades\DB::table('stocks')->where('variant_id', $variant->id)->value('quantity'));
        $this->assertSame(0, \Illuminate\Support\Facades\DB::table('stocks')->where('product_id', $product->id)->whereNull('variant_id')->count());
    }
}
