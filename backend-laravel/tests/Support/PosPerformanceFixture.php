<?php

namespace Tests\Support;

use App\Models\Barcode;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Stock;
use App\Models\StockBatch;
use App\Models\Store;
use App\Models\SystemConfiguration;
use App\Models\User;

/** Disposable test database records only: never seeds the configured ERP store. */
class PosPerformanceFixture
{
    public static function create(int $count = 200): array
    {
        $store = Store::create(['name' => 'TEMP POS Performance', 'code' => 'TEMP-POS-PERF', 'is_active' => true]);
        $counter = SystemConfiguration::create(['store_id' => $store->id, 'key' => 'counter', 'value' => 'TEMP Performance Till', 'is_active' => true]);
        $user = User::create(['name' => 'TEMP Performance Operator', 'username' => 'temp-pos-perf', 'email' => 'pos-perf@example.test', 'password' => 'temporary-test-only', 'role' => 'admin', 'store_id' => $store->id, 'counter_id' => $counter->id, 'is_active' => true]);
        $items = [];
        request()->attributes->set('store_context_write', true);
        request()->attributes->set('store_context_id', $store->id);
        request()->attributes->set('store_context_ids', [$store->id]);
        for ($i = 1; $i <= $count; $i++) {
            $code = sprintf('TEMP-PERF-%04d', $i);
            $product = Product::create(['company_id' => $store->id, 'name' => "TEMP Performance Item {$i}", 'code' => $code, 'selling_mode' => 'PACK', 'selling_price' => 100, 'mrp' => 100, 'is_active' => true]);
            $variant = ProductVariant::create(['product_id' => $product->id, 'sku' => $code, 'barcode' => $code, 'selling_price' => 100, 'mrp' => 100]);
            $barcode = Barcode::create(['product_id' => $product->id, 'variant_id' => $variant->id, 'barcode' => $code, 'product_name' => $product->name, 'selling_price' => 100, 'mrp' => 100, 'is_active' => true]);
            Stock::create(['store_id' => $store->id, 'product_id' => $product->id, 'variant_id' => $variant->id, 'quantity' => 1000, 'available_quantity' => 1000]);
            StockBatch::create(['store_id' => $store->id, 'variant_id' => $variant->id, 'reference_type' => 'TEMP_PERFORMANCE', 'received_qty' => 1000, 'remaining_qty' => 1000, 'cost_price' => 50, 'received_at' => now()]);
            $items[] = ['productId' => $product->id, 'variantId' => $variant->id, 'barcodeId' => $barcode->id, 'qty' => 1, 'price' => 100];
        }
        foreach (['store_context_write', 'store_context_id', 'store_context_ids'] as $key) {
            request()->attributes->remove($key);
        }

        return compact('store', 'user', 'items');
    }
}
