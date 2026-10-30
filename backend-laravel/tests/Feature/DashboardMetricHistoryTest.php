<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Product;
use App\Models\Stock;
use App\Models\Store;
use App\Models\User;
use App\Services\DashboardMetricHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardMetricHistoryTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 10, 29)->setTime(12, 0));
        $this->store = Store::create(['name' => 'Metric store', 'code' => 'METRIC']);
        Sanctum::actingAs(User::create(['name' => 'Metrics admin', 'username' => 'metrics-admin', 'email' => 'metrics@example.test',
            'password' => bcrypt('test-only'), 'role' => 'admin', 'store_id' => $this->store->id]));
        foreach ([true, true, false] as $index => $active) {
            Employee::create(['store_id' => $this->store->id, 'code' => 'EMP-'.$index, 'name' => 'Employee '.$index, 'is_active' => $active]);
        }
        $product = Product::create(['company_id' => $this->store->id, 'code' => 'METRIC-PRODUCT', 'name' => 'Metric product', 'cost_price' => 10]);
        Stock::create(['store_id' => $this->store->id, 'product_id' => $product->id, 'quantity' => 15, 'available_quantity' => 15]);
    }

    private function snapshot(int $storeId, string $date, int $employees, float $stockValue): void
    {
        DB::table('dashboard_metric_snapshots')->insert(['store_id' => $storeId, 'snapshot_date' => $date,
            'active_employees' => $employees, 'stock_value' => $stockValue, 'created_at' => $date, 'updated_at' => $date]);
    }

    public function test_employee_and_stock_comparisons_use_latest_previous_month_observations_for_the_selected_store(): void
    {
        $this->snapshot($this->store->id, '2026-09-01', 10, 999);
        $this->snapshot($this->store->id, '2026-09-30', 1, 100);
        $foreign = Store::create(['name' => 'Other tenant', 'code' => 'OTHER-METRIC']);
        $this->snapshot($foreign->id, '2026-09-30', 1000, 100000);
        $this->getJson('/api/dashboard')->assertOk()
            ->assertJsonPath('data.metrics.employees.present', 0)
            ->assertJsonPath('data.metrics.employees.total', 2)
            ->assertJsonPath('data.metrics.employees.trend.changePercent', 100)
            ->assertJsonPath('data.metrics.stockValue.amount', 150)
            ->assertJsonPath('data.metrics.stockValue.trend.changePercent', 50)
            ->assertJsonPath('data.metrics.stockValue.trend.label', 'vs last month (recorded)');
        $this->assertDatabaseHas('dashboard_metric_snapshots', ['store_id' => $this->store->id, 'snapshot_date' => '2026-10-29', 'active_employees' => 2, 'stock_value' => 150]);
        $this->assertDatabaseMissing('dashboard_metric_snapshots', ['store_id' => $foreign->id, 'snapshot_date' => '2026-10-29']);
    }

    public function test_missing_or_stale_history_never_becomes_a_fabricated_percentage(): void
    {
        $this->snapshot($this->store->id, '2026-08-31', 1, 100);
        $this->getJson('/api/dashboard')->assertOk()
            ->assertJsonPath('data.metrics.employees.trend.direction', 'unavailable')
            ->assertJsonPath('data.metrics.stockValue.trend.changePercent', null);
    }

    public function test_refresh_updates_today_only_and_does_not_backdate_snapshots_for_historical_sales_filters(): void
    {
        $this->snapshot($this->store->id, '2026-09-30', 1, 100);
        $this->getJson('/api/dashboard?from=2026-01-01&to=2026-01-31')->assertOk();
        Stock::query()->update(['quantity' => 20]);
        $this->getJson('/api/dashboard')->assertOk()->assertJsonPath('data.metrics.stockValue.trend.changePercent', 100);
        $this->assertDatabaseCount('dashboard_metric_snapshots', 2);
        $this->assertDatabaseHas('dashboard_metric_snapshots', ['snapshot_date' => '2026-09-30', 'stock_value' => 100]);
        $this->assertDatabaseHas('dashboard_metric_snapshots', ['snapshot_date' => '2026-10-29', 'stock_value' => 200]);
    }

    public function test_all_store_comparisons_require_every_store_and_ignore_values_outside_the_explicit_scope(): void
    {
        $second = Store::create(['name' => 'Second metric store', 'code' => 'METRIC-SECOND']);
        $this->snapshot($this->store->id, '2026-09-30', 1, 100);
        $service = app(DashboardMetricHistory::class);
        $this->assertSame('unavailable', $service->compareAndRecord([$this->store->id, $second->id], [$this->store->id => 2], [$this->store->id => 150])['stockValue']['direction']);
        $this->snapshot($second->id, '2026-09-30', 1, 50);
        $result = $service->compareAndRecord([$this->store->id, $second->id], [$this->store->id => 2, $second->id => 1, 99999 => 9000], [$this->store->id => 150, $second->id => 150, 99999 => 9000]);
        $this->assertSame(50.0, $result['employees']['changePercent']);
        $this->assertSame(100.0, $result['stockValue']['changePercent']);
    }

    public function test_zero_baselines_and_negative_changes_have_honest_labels(): void
    {
        $this->assertNull(DashboardMetricHistory::trend(100, 0)['changePercent']);
        $this->assertSame('new', DashboardMetricHistory::trend(100, 0)['direction']);
        $this->assertSame('flat', DashboardMetricHistory::trend(0, 0)['direction']);
        $this->assertSame(25.0, DashboardMetricHistory::trend(75, 100)['changePercent']);
        $this->assertSame('down', DashboardMetricHistory::trend(75, 100)['direction']);
    }
}
