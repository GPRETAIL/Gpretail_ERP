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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Disposable test database records only: never seeds the configured ERP store. */
class PosPerformanceFixture
{
    public static function catalog(int $count = 10000): array
    {
        $store = Store::create(['name' => 'TEMP POS Load Lab', 'code' => 'TEMP-POS-LOAD', 'is_active' => true]);
        $counter = SystemConfiguration::create(['store_id' => $store->id, 'key' => 'counter', 'value' => 'TEMP Load Till', 'is_active' => true]);
        $user = User::create(['name' => 'TEMP Load Operator', 'username' => 'temp-pos-load', 'email' => 'pos-load@example.test', 'password' => 'temporary-test-only', 'role' => 'admin', 'store_id' => $store->id, 'counter_id' => $counter->id, 'is_active' => true]);
        $productStart = (int) DB::table('products')->max('id');
        $variantStart = (int) DB::table('product_variants')->max('id');
        $barcodeStart = (int) DB::table('barcodes')->max('id');
        $tables = ['products', 'product_variants', 'barcodes', 'stocks', 'stock_batches'];
        $columns = [];
        foreach ($tables as $table) {
            $columns[$table] = array_fill_keys(Schema::getColumnListing($table), true);
        }
        $items = [];
        foreach (array_chunk(range(1, $count), 500) as $numbers) {
            $rows = array_fill_keys($tables, []);
            foreach ($numbers as $number) {
                $id = $productStart + $number;
                $variant = $variantStart + $number;
                $barcode = $barcodeStart + $number;
                $code = sprintf('TEMP-LOAD-%05d', $number);
                $rows['products'][] = ['id' => $id, 'name' => "TEMP Load Product $number", 'code' => $code, 'barcode' => $code, 'selling_mode' => 'PACK', 'selling_price' => 100, 'mrp' => 100, 'is_active' => true];
                $rows['product_variants'][] = ['id' => $variant, 'product_id' => $id, 'sku' => $code, 'barcode' => $code, 'selling_price' => 100, 'mrp' => 100];
                $rows['barcodes'][] = ['id' => $barcode, 'product_id' => $id, 'variant_id' => $variant, 'barcode' => $code, 'product_name' => "TEMP Load Product $number", 'selling_price' => 100, 'mrp' => 100, 'is_active' => true];
                $rows['stocks'][] = ['product_id' => $id, 'variant_id' => $variant, 'quantity' => 1000, 'allocated_quantity' => 0, 'available_quantity' => 1000];
                $rows['stock_batches'][] = ['variant_id' => $variant, 'reference_type' => 'TEMP_LOAD', 'received_qty' => 1000, 'remaining_qty' => 1000, 'cost_price' => 50, 'received_at' => now()];
                $items[] = ['productId' => $id, 'variantId' => $variant, 'barcodeId' => $barcode, 'qty' => 1, 'price' => 100];
            }
            foreach ($tables as $table) {
                DB::table($table)->insert(array_map(fn ($row) => array_intersect_key([...$row, 'store_id' => $store->id, 'company_id' => $store->id, 'created_at' => now(), 'updated_at' => now()], $columns[$table]), $rows[$table]));
            }
        }

        return compact('store', 'user', 'items');
    }

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
