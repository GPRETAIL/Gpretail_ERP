<?php

namespace Tests\Feature\Sales;

use App\Models\IncentiveRule;
use App\Models\Store;
use App\Models\User;
use App\Services\Sales\IncentiveCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Settings > Incentive Configuration rules and the Finance > Incentive Report figures, approval and payroll. */
class IncentiveTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    private array $items;

    private int $storeId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(3);
        $this->items = $this->fixture['items'];
        $this->storeId = $this->fixture['store']->id;
        Sanctum::actingAs($this->fixture['user']);
    }

    private function department(string $name): int
    {
        return DB::table('hr_departments')->insertGetId(['name' => $name, 'code' => Str::upper(Str::random(4)), 'store_id' => $this->storeId,
            'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
    }

    private function employee(string $name, float $pct = 0, ?int $department = null): int
    {
        return DB::table('employees')->insertGetId(['store_id' => $this->storeId, 'name' => $name, 'code' => Str::upper(Str::random(5)), 'salary' => 0,
            'department_id' => $department, 'is_active' => true, 'master_details' => json_encode(['incentive_pct' => $pct]), 'created_at' => now(), 'updated_at' => now()]);
    }

    /** @param list<array{0: int, 1: float}> $lines item index and qty, at ₹100 each */
    private function sell(int $employee, array $lines): int
    {
        $items = array_map(fn ($l) => [...$this->items[$l[0]], 'qty' => $l[1], 'salesManId' => $employee, 'salesManName' => 'x'], $lines);

        return $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled',
            'cashAmount' => array_sum(array_map(fn ($l) => $l[1] * 100, $lines)), 'items' => $items])->assertCreated()->json('data.id');
    }

    private function rule(array $values): IncentiveRule
    {
        return IncentiveRule::withoutGlobalScopes()->create([...['store_id' => $this->storeId, 'basis' => 'percent', 'value' => 0, 'scope_type' => 'all', 'is_active' => true], ...$values]);
    }

    private function report(?string $month = null): array
    {
        return collect(app(IncentiveCalculator::class)->month($this->storeId, $month ?? now()->format('Y-m'))['rows'])->keyBy('employee_name')->all();
    }

    private function product(int $index, array $values): void
    {
        DB::table('products')->where('id', $this->items[$index]['productId'])->update($values);
    }

    public function test_the_most_specific_item_rule_wins_and_schemes_stack_within_their_dates(): void
    {
        $catA = DB::table('categories')->insertGetId(['name' => 'Shirts', 'code' => 'SHT', 'created_at' => now(), 'updated_at' => now()]);
        $catB = DB::table('categories')->insertGetId(['name' => 'Sarees', 'code' => 'SAR', 'created_at' => now(), 'updated_at' => now()]);
        $brand = DB::table('brands')->insertGetId(['name' => 'Peter', 'code' => 'PTR', 'created_at' => now(), 'updated_at' => now()]);
        $this->product(0, ['category_id' => $catA, 'brand_id' => $brand]);
        $this->product(1, ['category_id' => $catA]);
        $this->product(2, ['category_id' => $catB]);
        $floor = $this->department('Floor');
        $ravi = $this->employee('Ravi', 3, $floor);
        $meena = $this->employee('Meena', 4);

        $this->rule(['type' => 'item', 'name' => 'Store 1%', 'value' => 1, 'department_ids' => [$floor]]); // floor staff only
        $this->rule(['type' => 'item', 'name' => 'Shirts 2%', 'value' => 2, 'scope_type' => 'category', 'scope_ids' => [(string) $catA]]);
        $this->rule(['type' => 'item', 'name' => 'Peter ₹5', 'basis' => 'per_piece', 'value' => 5, 'scope_type' => 'brand', 'scope_ids' => [(string) $brand]]);
        $this->rule(['type' => 'scheme', 'name' => 'Saree push', 'basis' => 'per_piece', 'value' => 7, 'scope_type' => 'product',
            'scope_ids' => [(string) $this->items[2]['productId']], 'valid_from' => now()->startOfMonth(), 'valid_to' => now()->endOfMonth()]);
        $this->rule(['type' => 'scheme', 'name' => 'Old scheme', 'basis' => 'per_piece', 'value' => 50, 'scope_type' => 'all',
            'valid_from' => now()->subMonths(3)->startOfMonth(), 'valid_to' => now()->subMonths(2)->endOfMonth()]);

        $this->sell($ravi, [[0, 2], [1, 1], [2, 1]]);
        $this->sell($meena, [[2, 1]]);

        $rows = $this->report();
        // Ravi: brand ₹5 × 2 + category 2% of ₹100 + store-wide 1% of ₹100; scheme ₹7.
        $this->assertEquals([13.0, 7.0, 20.0, 400.0, 1], [$rows['Ravi']['item_amount'], $rows['Ravi']['scheme_amount'], $rows['Ravi']['total'], $rows['Ravi']['net_sales'], $rows['Ravi']['bills']]);
        // Meena is not floor staff and sarees have no rule for her: her own 4%, plus the scheme.
        $this->assertEquals([4.0, 7.0, 11.0], [$rows['Meena']['item_amount'], $rows['Meena']['scheme_amount'], $rows['Meena']['total']]);

        $this->getJson('/api/incentives/explain?product_id='.$this->items[0]['productId']."&employee_id=$ravi")->assertOk()
            ->assertJsonPath('data.item_rule.name', 'Peter ₹5');
    }

    public function test_old_stock_bonus_and_monthly_target_slabs(): void
    {
        DB::table('stock_batches')->where('variant_id', $this->items[0]['variantId'])->update(['received_at' => now()->subDays(100)]);
        $sarees = $this->department('Sarees');
        $ravi = $this->employee('Ravi');
        $meena = $this->employee('Meena', 0, $sarees);
        $this->rule(['type' => 'ageing', 'name' => 'Old stock', 'basis' => 'per_piece', 'value' => 10, 'min_age_days' => 90]);
        $this->rule(['type' => 'target', 'name' => 'Monthly target', 'target_type' => 'amount', 'slabs' => [
            ['from' => 80, 'to' => 100, 'type' => 'percent', 'value' => 1], ['from' => 100, 'to' => null, 'type' => 'amount', 'value' => 500]]]);
        $month = now()->format('Y-m');
        $this->putJson('/api/incentives/targets', ['month' => $month, 'targets' => [
            ['employee_id' => $ravi, 'target_amount' => 250], ['department_id' => $sarees, 'target_amount' => 1000]]])->assertOk();

        $this->sell($ravi, [[0, 3]]); // old stock
        $this->sell($meena, [[1, 1]]); // new stock

        $rows = $this->report();
        $this->assertEquals([30.0, 500.0, 530.0, 120.0], [$rows['Ravi']['ageing_amount'], $rows['Ravi']['target_amount'], $rows['Ravi']['total'], $rows['Ravi']['achievement_pct']]);
        // The section made 10% of its ₹1,000 target: below the first slab.
        $this->assertEquals([0.0, 0.0], [$rows['Meena']['ageing_amount'], $rows['Meena']['target_amount']]);
    }

    public function test_returns_cancellations_approval_and_payroll(): void
    {
        $ravi = $this->employee('Ravi');
        $this->rule(['type' => 'item', 'name' => 'Store 10%', 'value' => 10]);
        $last = now()->subMonth()->format('Y-m');
        $lastDate = now()->subMonth()->startOfMonth()->addDays(14);

        $sale = $this->sell($ravi, [[0, 2]]);
        $cancelled = $this->sell($ravi, [[1, 5]]);
        DB::table('pos_sales')->where('id', $cancelled)->update(['status' => 'CANCELLED']);
        DB::table('pos_sales')->whereIn('id', [$sale, $cancelled])->update(['sale_date' => $lastDate]);
        $line = ['productId' => $this->items[0]['productId'], 'variantId' => $this->items[0]['variantId'], 'qty' => 1, 'price' => 100];
        $this->postJson('/api/pos-returns', ['sourcePosSaleId' => $sale, 'items' => [$line]])->assertSuccessful();
        DB::table('pos_returns')->update(['return_date' => $lastDate, 'created_at' => $lastDate]);

        $row = $this->report($last)['Ravi'];
        $this->assertEquals([20.0, -10.0, 10.0, 100.0], [$row['item_amount'], $row['returns_amount'], $row['total'], $row['net_sales']]);

        $this->postJson('/api/incentives/approve', ['month' => $last])->assertOk()->assertJsonPath('data.approved', true);
        $this->assertSame(10.0, app(IncentiveCalculator::class)->approvedTotal($ravi, $last));
        $this->postJson('/api/incentives/approve', ['month' => $last])->assertUnprocessable();
        $this->postJson('/api/incentives/approve', ['month' => now()->format('Y-m')])->assertUnprocessable(); // not ended yet

        // A return for last month entered after its approval: last month stays as approved, this month takes it.
        $this->travel(5)->minutes();
        $this->postJson('/api/pos-returns', ['sourcePosSaleId' => $sale, 'items' => [$line]])->assertSuccessful();
        DB::table('pos_returns')->where('id', DB::table('pos_returns')->max('id'))->update(['return_date' => $lastDate]);
        $this->assertSame(10.0, $this->report($last)['Ravi']['total']);
        $this->assertSame(-10.0, $this->report()['Ravi']['returns_amount']);
    }

    public function test_rules_api_validation_store_isolation_and_access(): void
    {
        $this->postJson('/api/incentives/rules', ['type' => 'scheme', 'name' => 'No dates', 'basis' => 'percent', 'value' => 2, 'scope_type' => 'all'])
            ->assertUnprocessable()->assertJsonValidationErrors(['valid_from', 'valid_to']);
        $this->postJson('/api/incentives/rules', ['type' => 'item', 'name' => 'Too much', 'basis' => 'percent', 'value' => 150, 'scope_type' => 'all'])->assertStatus(422);
        $this->postJson('/api/incentives/rules', ['type' => 'item', 'name' => 'No brands', 'basis' => 'percent', 'value' => 2, 'scope_type' => 'brand'])->assertStatus(422);
        $id = $this->postJson('/api/incentives/rules', ['type' => 'item', 'name' => 'Store 2%', 'basis' => 'percent', 'value' => 2, 'scope_type' => 'all'])
            ->assertCreated()->json('data.id');
        $this->putJson("/api/incentives/rules/$id", ['type' => 'item', 'name' => 'Store 3%', 'basis' => 'percent', 'value' => 3, 'scope_type' => 'all'])
            ->assertOk()->assertJsonPath('data.value', 3);
        $this->getJson('/api/incentives/rules')->assertOk()->assertJsonCount(1, 'data');

        // Another store's rule never applies here.
        $other = Store::create(['name' => 'TEMP Other', 'code' => 'TEMP-OTHER', 'is_active' => true]);
        IncentiveRule::withoutGlobalScopes()->create(['store_id' => $other->id, 'type' => 'scheme', 'name' => 'Theirs', 'basis' => 'per_piece', 'value' => 99,
            'scope_type' => 'all', 'valid_from' => now()->startOfMonth(), 'valid_to' => now()->endOfMonth(), 'is_active' => true]);
        $ravi = $this->employee('Ravi');
        $this->sell($ravi, [[0, 1]]);
        $this->assertEquals([3.0, 0.0], [$this->report()['Ravi']['item_amount'], $this->report()['Ravi']['scheme_amount']]);
        $this->getJson('/api/incentives/rules')->assertJsonCount(1, 'data');

        $this->deleteJson("/api/incentives/rules/$id")->assertOk();

        // What each salesperson earns is pay data: a cashier sees none of it.
        Sanctum::actingAs(User::create(['name' => 'TEMP Cashier', 'username' => 'temp-inc-cashier', 'email' => 'inc-cashier@example.test',
            'password' => 'temporary-test-only', 'role' => 'cashier', 'store_id' => $this->storeId, 'is_active' => true]));
        $this->getJson('/api/incentives/report?month='.now()->format('Y-m'))->assertForbidden();
        $this->postJson('/api/incentives/rules', ['type' => 'item', 'name' => 'x', 'basis' => 'percent', 'value' => 1, 'scope_type' => 'all'])->assertForbidden();
    }
}
