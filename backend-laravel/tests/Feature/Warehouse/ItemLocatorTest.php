<?php

namespace Tests\Feature\Warehouse;

use App\Models\Barcode;
use App\Models\Product;
use App\Models\Stock;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Warehouse > Item Locator: barcodes with their live stock and bin, in-stock only by default, this store only. */
class ItemLocatorTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_in_stock_barcodes_with_stock_bin_and_prices_for_this_store_only(): void
    {
        $store = Store::create(['name' => 'Silks', 'code' => 'SILKS', 'is_active' => true]);
        Sanctum::actingAs(User::create(['name' => 'Manager', 'username' => 'manager', 'email' => 'm@example.test', 'password' => 'secret123',
            'role' => 'admin', 'store_id' => $store->id, 'is_active' => true]));
        $this->withHeader('X-Store-Id', (string) $store->id);

        $saree = Product::create(['company_id' => $store->id, 'name' => 'Silk Saree', 'code' => 'SAREE', 'hsn_code' => '5007', 'selling_price' => 2500, 'is_active' => true]);
        Stock::create(['store_id' => $store->id, 'product_id' => $saree->id, 'quantity' => 4, 'available_quantity' => 4, 'location_bin' => 'Rack A-2']);
        Barcode::create(['product_id' => $saree->id, 'barcode' => 'SAREE-001', 'product_name' => 'Silk Saree', 'selling_price' => 2500, 'final_price' => 2250, 'size' => 'Free', 'is_active' => true]);

        $shirt = Product::create(['company_id' => $store->id, 'name' => 'Shirt', 'code' => 'SHIRT', 'selling_price' => 900, 'is_active' => true]);
        Stock::create(['store_id' => $store->id, 'product_id' => $shirt->id, 'quantity' => 0, 'available_quantity' => 0]);
        Barcode::create(['product_id' => $shirt->id, 'barcode' => 'SHIRT-001', 'product_name' => 'Shirt', 'selling_price' => 900, 'is_active' => true]);

        $other = Store::create(['name' => 'Other', 'code' => 'OTHER', 'is_active' => true]);
        $foreign = Product::withoutGlobalScopes()->create(['company_id' => $other->id, 'name' => 'Foreign', 'code' => 'FOREIGN', 'selling_price' => 1, 'is_active' => true]);
        Stock::withoutGlobalScopes()->create(['store_id' => $other->id, 'product_id' => $foreign->id, 'quantity' => 9, 'available_quantity' => 9]);
        Barcode::withoutGlobalScopes()->create(['product_id' => $foreign->id, 'barcode' => 'FOREIGN-001', 'is_active' => true]);

        $this->getJson('/api/barcodes/item-locator')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.barcode', 'SAREE-001')->assertJsonPath('data.0.product', 'Silk Saree')
            ->assertJsonPath('data.0.stock', 4)->assertJsonPath('data.0.section', 'Rack A-2')
            ->assertJsonPath('data.0.hsn', '5007')->assertJsonPath('data.0.size', 'Free')
            ->assertJsonPath('data.0.sale', 2500)->assertJsonPath('data.0.net', 2250);

        $all = collect($this->getJson('/api/barcodes/item-locator?in_stock=0')->assertOk()->json('data'))->pluck('barcode')->all();
        $this->assertEqualsCanonicalizing(['SAREE-001', 'SHIRT-001'], $all);
    }
}
