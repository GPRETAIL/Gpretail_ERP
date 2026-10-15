<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Stock;
use App\Models\Store;
use App\Models\User;
use App\Services\StoreQuery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StoreQueryIsolationTest extends TestCase
{
    use RefreshDatabase;

    private function fixtures(): array
    {
        Cache::flush();
        $one = Store::create(['name' => 'One', 'code' => 'QUERY-ONE']);
        $two = Store::create(['name' => 'Two', 'code' => 'QUERY-TWO']);
        foreach ([$one, $two] as $index => $store) {
            $product = Product::create(['name' => 'Product '.$index, 'code' => 'PROD-'.$index, 'company_id' => $store->id, 'selling_price' => 100, 'cost_price' => ($index + 1) * 10]);
            Stock::create(['store_id' => $store->id, 'product_id' => $product->id, 'quantity' => $index + 1, 'available_quantity' => $index + 1]);
        }

        return [$one, $two];
    }

    private function user(Store $store): User
    {
        return User::create(['name' => 'User '.$store->id, 'username' => 'query-user-'.$store->id, 'email' => 'query'.$store->id.'@example.test', 'password' => 'secret', 'role' => 'admin', 'store_id' => $store->id]);
    }

    public function test_dropdown_raw_join_and_stock_valuation_are_limited_to_assigned_store(): void
    {
        [$one, $two] = $this->fixtures();
        Sanctum::actingAs($this->user($one));
        $response = $this->getJson('/api/products?dropdown=true')->assertOk();
        $names = collect($response->json('data'))->pluck('name')->all();
        $this->assertContains('Product 0', $names);
        $this->assertNotContains('Product 1', $names);
        $this->getJson('/api/items/dashboard-summary')->assertOk()->assertJsonPath('data.totalStockValue', 10);
        $this->getJson('/api/lookups?keys=companies')->assertOk()->assertJsonPath('data.companies.0.id', $one->id);
    }

    public function test_shared_summary_cache_is_separate_for_each_store(): void
    {
        [$one, $two] = $this->fixtures();
        Product::create(['name' => 'Extra', 'code' => 'EXTRA', 'company_id' => $two->id]);
        Sanctum::actingAs($this->user($one));
        $this->getJson('/api/products/dashboard-summary')->assertOk()->assertJsonPath('data.totalProducts', 1);
        Sanctum::actingAs($this->user($two));
        $this->getJson('/api/products/dashboard-summary')->assertOk()->assertJsonPath('data.totalProducts', 2);
    }

    public function test_later_or_filter_cannot_escape_the_raw_query_scope(): void
    {
        [$one, $two] = $this->fixtures();
        request()->attributes->set('store_context_ids', [$one->id]);
        $this->assertSame(1, StoreQuery::table('products')->where('name', 'Product 0')->orWhere('name', 'Product 1')->count());
        request()->attributes->remove('store_context_ids');
    }

    public function test_anonymous_cannot_change_local_server_configuration(): void
    {
        $this->putJson('/api/local-server-config', ['local_server_url' => 'http://example.test'])->assertUnauthorized();
    }
}
