<?php

namespace Tests\Feature\Ops;

use App\Models\Customer;
use App\Models\PosSale;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Database\LazyLoadingViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** The performance log: slow queries, slow or query-heavy requests; and N+1 loads fail the tests. */
class PerformanceLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_slow_query_is_logged_with_its_sql_but_not_its_values(): void
    {
        config()->set('logging.performance.slow_query_ms', 1000);
        $log = Log::spy();
        $log->shouldReceive('channel')->andReturnSelf();

        event(new QueryExecuted('select * from customers where phone = ?', ['9876543210'], 1500.0, DB::connection()));
        event(new QueryExecuted('select 1', [], 20.0, DB::connection()));

        $log->shouldHaveReceived('channel')->with('performance');
        $log->shouldHaveReceived('warning')->once()->withArgs(fn ($message, $context) => $message === 'Slow query'
            && $context['ms'] === 1500 && str_contains($context['sql'], 'phone = ?') && ! str_contains(json_encode($context), '9876543210'));
    }

    public function test_a_request_with_too_many_queries_is_logged(): void
    {
        config()->set('logging.performance.request_query_limit', 1);
        $store = Store::create(['name' => 'Perf', 'code' => 'PRF-'.Str::random(5), 'is_active' => true]);
        Sanctum::actingAs(User::factory()->create(['username' => 'admin-'.Str::random(6), 'role' => 'admin', 'store_id' => $store->id]));
        $log = Log::spy();
        $log->shouldReceive('channel')->andReturnSelf();

        $this->getJson('/api/brands')->assertOk();

        $log->shouldHaveReceived('warning')->withArgs(fn ($message, $context) => $message === 'Many queries in one request'
            && $context['request'] === 'GET /api/brands' && $context['queries'] >= 1);
    }

    public function test_loading_a_relation_row_by_row_fails_in_tests(): void
    {
        $store = Store::create(['name' => 'N1', 'code' => 'N1-'.Str::random(5), 'is_active' => true]);
        $cashier = User::factory()->create(['username' => 'cashier-'.Str::random(6), 'role' => 'cashier', 'store_id' => $store->id]);
        foreach ([1, 2] as $n) {
            $customer = Customer::unguarded(fn () => Customer::withoutGlobalScopes()->create(['store_id' => $store->id, 'name' => "C{$n}", 'code' => "C{$n}", 'phone' => "900000000{$n}"]));
            PosSale::unguarded(fn () => PosSale::withoutGlobalScopes()->create(['store_id' => $store->id, 'user_id' => $cashier->id, 'customer_id' => $customer->id, 'invoice_no' => "N1-{$n}", 'grand_total' => 100, 'sale_date' => now()]));
        }

        $sales = PosSale::withoutGlobalScopes()->get();
        $this->assertSame('C1', PosSale::withoutGlobalScopes()->with('customer')->first()->customer->name);
        $this->expectException(LazyLoadingViolationException::class);
        $sales->first()->customer;
    }
}
